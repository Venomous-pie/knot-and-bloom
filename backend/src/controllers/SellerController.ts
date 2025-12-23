import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Role, SellerStatus } from '../types/authTypes.js';
import prisma from '../utils/prismaUtils.js';
import { ensureAdminSellerProfile } from '../utils/sellerUtils.js';

// Validator for Upgrade (Just Store Info)
const sellerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
});

// Validator for Direct Registration (Customer + Seller)
const registerSellerSchema = sellerSchema.extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});

export const sellerController = {
    // Flow B: Direct Register as Seller (Public)
    async registerSeller(req: Request, res: Response) {
        try {
            const data = registerSellerSchema.parse(req.body);

            // Check if email exists
            const existingCustomer = await prisma.customer.findUnique({ where: { email: data.email } });
            if (existingCustomer) {
                return res.status(409).json({ error: "Email already registered. Please login and upgrade to seller." });
            }

            // Auto-generate slug
            let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const existingSlug = await prisma.seller.findUnique({ where: { slug } });
            if (existingSlug) slug = `${slug}-${Date.now()}`;

            const hashedPassword = await bcrypt.hash(data.password, 10);

            // Transaction: Create Customer + Seller
            const result = await prisma.$transaction(async (tx) => {
                const customer = await tx.customer.create({
                    data: {
                        name: data.name,
                        email: data.email,
                        password: hashedPassword,
                        phone: data.phone ?? null,
                        role: Role.SELLER
                    }
                });

                const seller = await tx.seller.create({
                    data: {
                        customerId: customer.uid,
                        name: data.name,
                        email: data.email,
                        slug,
                        description: data.description ?? null,
                        logo: data.logo ?? null,
                        banner: data.banner ?? null,
                        status: SellerStatus.PENDING
                    }
                });

                return { customer, seller };
            });

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof z.ZodError) res.status(400).json({ error: error.issues });
            else {
                console.error(error);
                res.status(500).json({ error: 'Failed to register seller' });
            }
        }
    },

    // Flow A: Upgrade existing User to Seller (Protected)
    async onboardSeller(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user;

            const data = sellerSchema.parse(req.body);
            const userId = user.id;

            // Check if already has seller profile
            const existingSeller = await prisma.seller.findUnique({ where: { customerId: userId } });
            if (existingSeller) return res.status(409).json({ error: "User is already a seller" });

            // Generate slug
            let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const urlCheck = await prisma.seller.findUnique({ where: { slug } });
            if (urlCheck) slug = `${slug}-${Date.now()}`;

            // Create Seller & Update Role
            const seller = await prisma.$transaction(async (tx) => {
                const newSeller = await tx.seller.create({
                    data: {
                        customerId: userId,
                        name: data.name,
                        slug,
                        email: user.email,
                        description: data.description ?? null,
                        logo: data.logo ?? null,
                        banner: data.banner ?? null,
                        status: SellerStatus.PENDING
                    }
                });

                // Ensure role is SELLER
                if (user.role !== Role.SELLER && user.role !== Role.ADMIN) {
                    await tx.customer.update({
                        where: { uid: userId },
                        data: { role: Role.SELLER }
                    });
                }

                return newSeller;
            });

            res.status(201).json(seller);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to onboard seller" });
        }
    },

    // Get Seller by Slug (Public Profile)
    async getSellerBySlug(req: Request, res: Response) {
        try {
            const { slug } = req.params;
            if (!slug) return res.status(400).json({ error: 'Slug is required' });

            const seller = await prisma.seller.findUnique({
                where: {
                    slug,
                },
                include: {
                    products: {
                        take: 20,
                        orderBy: { uploaded: 'desc' },
                        include: { variants: true }
                    }
                }
            });

            if (!seller || seller.deletedAt !== null) {
                return res.status(404).json({ error: 'Seller not found' });
            }

            if (seller.status !== SellerStatus.ACTIVE) {
                return res.status(404).json({ error: 'Seller unavailable' });
            }

            res.json(seller);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch seller' });
        }
    },

    // Update Seller (Admin or Self)
    async updateSeller(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            // TODO: Add strict role check here (Admin vs Owner)

            const seller = await prisma.seller.update({
                where: { uid: parseInt(id || '0') },
                data: updates
            });

            res.json(seller);
        } catch (error) {
            res.status(500).json({ error: 'Update failed' });
        }
    },

    // Admin: List Sellers
    async listSellers(req: Request, res: Response) {
        try {
            const { status } = req.query;
            const where: any = { deletedAt: null };
            if (status) where.status = String(status);

            const sellers = await prisma.seller.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            res.json(sellers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list sellers' });
        }
    },

    // Seller Dashboard: Get Orders
    async getSellerOrders(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const sellerId = parseInt(id || '0');

            if (isNaN(sellerId) || sellerId === 0) return res.status(400).json({ error: "Invalid seller ID" });

            // Fetch Orders for this seller (New Schema: Order has sellerId)
            const orders = await prisma.order.findMany({
                where: { sellerId },
                include: {
                    items: {
                        include: {
                            product: { select: { name: true, image: true } }
                        }
                    },
                    customer: {
                        select: { name: true, email: true }
                    }
                },
                orderBy: { uploaded: 'desc' }
            });

            res.json(orders);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    },

    // Get Own Products (Seller Dashboard)
    async getOwnProducts(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            const status = req.query.status as string;

            let sellerId = req.user.sellerId;

            // Fallback lookup
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({
                    where: { customerId: req.user.id }
                });
                if (seller) sellerId = seller.uid;
            }

            // [NEW] Admin Auto-Creation Logic
            if (!sellerId && req.user.role === Role.ADMIN) {
                sellerId = await ensureAdminSellerProfile(req.user.id, req.user.email);
            }

            if (!sellerId) return res.status(403).json({ error: "Seller profile not found" });

            const whereClause: any = {
                sellerId,
                deletedAt: null
            };

            if (status) {
                whereClause.status = status;
            }

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: whereClause,
                    include: {
                        variants: true,
                    },
                    orderBy: { uploaded: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.product.count({ where: whereClause })
            ]);

            res.json({
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch products" });
        }
    },

    // Mark Welcome Modal as Seen (Protected)
    async markWelcomeSeen(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            let sellerId = req.user.sellerId;

            // Fallback: If sellerId is not in token (stale token), find it via customerId
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({
                    where: { customerId: req.user.id }
                });
                if (seller) {
                    sellerId = seller.uid;
                }
            }

            // [NEW] Admin Auto-Creation Logic
            if (!sellerId && req.user.role === Role.ADMIN) {
                sellerId = await ensureAdminSellerProfile(req.user.id, req.user.email);
            }

            if (!sellerId) return res.status(401).json({ error: "Unauthorized - Seller profile not found" });

            await prisma.seller.update({
                where: { uid: sellerId },
                data: { hasSeenWelcomeModal: true }
            });

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to update status" });
        }
    }
};

// Helper removed - imported from utils/sellerUtils.js
