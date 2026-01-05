import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { Role, SellerStatus } from '../types/authTypes.js';
import type { AuthPayload } from '../types/authTypes.js';
import prisma from '../utils/prismaUtils.js';
import { ensureAdminSellerProfile } from '../utils/sellerUtils.js';
import { sellerSchema, registerSellerSchema } from '../validators/sellerValidator.js';

export const sellerController = {
    // Flow B: Direct Register as Seller (Public)
    // Creates a Customer (role: USER) and a Seller (status: PENDING)
    // Role upgrades to SELLER only when admin approves
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

            // Transaction: Create Customer (as USER) + Seller (as PENDING)
            const result = await prisma.$transaction(async (tx) => {
                const customer = await tx.customer.create({
                    data: {
                        name: data.name,
                        email: data.email,
                        password: hashedPassword,
                        phone: data.phone ?? null,
                        role: Role.USER // Stay as USER until approved
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
            if (error instanceof ZodError) res.status(400).json({ error: error.issues });
            else {
                console.error(error);
                res.status(500).json({ error: 'Failed to register seller' });
            }
        }
    },

    // Flow A: Upgrade existing User to Seller (Protected)
    // Creates Seller profile (status: PENDING), keeps role as USER
    // Role upgrades to SELLER only when admin approves
    async onboardSeller(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            const data = sellerSchema.parse(req.body);
            const userId = user.id;

            // Check if already has seller profile
            const existingSeller = await prisma.seller.findUnique({ where: { customerId: userId } });
            if (existingSeller) return res.status(409).json({ error: "User is already a seller" });

            // Need email for seller profile
            if (!user.email) {
                return res.status(400).json({ error: "Email is required to become a seller" });
            }

            // Generate slug
            let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const urlCheck = await prisma.seller.findUnique({ where: { slug } });
            if (urlCheck) slug = `${slug}-${Date.now()}`;

            // Create Seller profile only (role stays USER until approved)
            const seller = await prisma.seller.create({
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
                where: { slug },
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
    // When admin changes status to ACTIVE, also upgrade customer role to SELLER
    async updateSeller(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            const targetSellerId = parseInt(id || '0');
            if (isNaN(targetSellerId) || targetSellerId === 0) {
                return res.status(400).json({ error: "Invalid seller ID" });
            }

            // Authorization check with stale token fallback
            let isAuthorized = false;

            if (user.role === Role.ADMIN) {
                isAuthorized = true;
            } else if (user.sellerId === targetSellerId) {
                isAuthorized = true;
            } else {
                // Fallback: check via customerId if token is stale
                const seller = await prisma.seller.findUnique({ where: { uid: targetSellerId } });
                if (seller && seller.customerId === user.id) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(403).json({ error: "Unauthorized to update this seller" });
            }

            // Get current seller to check status change
            const currentSeller = await prisma.seller.findUnique({ where: { uid: targetSellerId } });
            if (!currentSeller) {
                return res.status(404).json({ error: "Seller not found" });
            }

            // Admin approving seller: upgrade customer role to SELLER
            if (user.role === Role.ADMIN && updates.status === SellerStatus.ACTIVE && currentSeller.status !== SellerStatus.ACTIVE) {
                await prisma.$transaction(async (tx) => {
                    await tx.seller.update({
                        where: { uid: targetSellerId },
                        data: { ...updates, approvedAt: new Date() }
                    });
                    await tx.customer.update({
                        where: { uid: currentSeller.customerId },
                        data: { role: Role.SELLER }
                    });
                });

                const updatedSeller = await prisma.seller.findUnique({ where: { uid: targetSellerId } });
                return res.json(updatedSeller);
            }

            // Regular update (no status change to ACTIVE)
            const seller = await prisma.seller.update({
                where: { uid: targetSellerId },
                data: updates
            });

            res.json(seller);
        } catch (error) {
            console.error(error);
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

    // Seller Dashboard: Get Orders (with authorization)
    async getSellerOrders(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            const { id } = req.params;
            const sellerId = parseInt(id || '0');

            if (isNaN(sellerId) || sellerId === 0) {
                return res.status(400).json({ error: "Invalid seller ID" });
            }

            // Authorization: Admin can view any, Seller can only view own
            let isAuthorized = false;
            if (user.role === Role.ADMIN) {
                isAuthorized = true;
            } else if (user.sellerId === sellerId) {
                isAuthorized = true;
            } else {
                // Fallback for stale token
                const seller = await prisma.seller.findUnique({ where: { uid: sellerId } });
                if (seller && seller.customerId === user.id) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(403).json({ error: "Unauthorized to view these orders" });
            }

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
            const user = req.user as AuthPayload;

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;
            const status = req.query.status as string;

            let sellerId = user.sellerId;

            // Fallback lookup
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({
                    where: { customerId: user.id }
                });
                if (seller) sellerId = seller.uid;
            }

            // Admin Auto-Creation Logic
            if (!sellerId && user.role === Role.ADMIN && user.email) {
                sellerId = await ensureAdminSellerProfile(user.id, user.email!);
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
            const user = req.user as AuthPayload;

            let sellerId = user.sellerId;

            // Fallback: If sellerId is not in token (stale token), find it via customerId
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({
                    where: { customerId: user.id }
                });
                if (seller) {
                    sellerId = seller.uid;
                }
            }

            // Admin Auto-Creation Logic
            if (!sellerId && user.role === Role.ADMIN && user.email) {
                sellerId = await ensureAdminSellerProfile(user.id, user.email!);
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
