import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { SellerStatus } from '../../generated/prisma/client.js';
import { Role } from '../types/authTypes.js';
import type { AuthPayload } from '../types/authTypes.js';
import prisma from '../utils/prismaUtils.js';
import { ensureAdminSellerProfile } from '../utils/sellerUtils.js';
import { sellerSchema, registerSellerSchema } from '../validators/sellerValidator.js';
import { socketService } from '../services/SocketService.js';

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
                        businessType: data.businessType ?? null,
                        productCategories: data.productCategories ?? null,
                        isHandmade: data.isHandmade ?? false,
                        hasPriorExperience: data.hasPriorExperience ?? false,
                        legalName: data.legalName ?? null,
                        businessAddress: data.businessAddress ?? null,
                        portfolioLink: data.portfolioLink ?? null,
                        idType: data.idType ?? null,
                        idNumber: data.idNumber ?? null,
                        status: SellerStatus.PENDING
                    }
                });

                const admins = await tx.customer.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
                if (admins.length > 0) {
                    await tx.notification.createMany({
                        data: admins.map(admin => ({
                            customerId: admin.uid,
                            title: 'New Seller Application',
                            message: `A new seller (${data.name}) has applied and is waiting for approval.`,
                            type: 'system'
                        }))
                    });
                    admins.forEach(admin => socketService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
                }

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

            // Determine email to use (User's auth email takes precedence, fallback to body email)
            const emailToUse = user.email || data.email;

            if (!emailToUse) {
                return res.status(400).json({ error: "Email is required to become a seller" });
            }

            const userId = user.id;

            // Check if already has seller profile
            const existingSeller = await prisma.seller.findUnique({ where: { customerId: userId } });

            if (existingSeller) {
                // Allow re-submission if previously rejected
                if (existingSeller.status === SellerStatus.REJECTED) {
                    // Generate slug (same logic as create)
                    let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    // Check slug uniqueness (excluding current seller)
                    const urlCheck = await prisma.seller.findFirst({
                        where: {
                            slug,
                            NOT: { uid: existingSeller.uid }
                        }
                    });
                    if (urlCheck) slug = `${slug}-${Date.now()}`;

                    const updatedSeller = await prisma.seller.update({
                        where: { uid: existingSeller.uid },
                        data: {
                            name: data.name,
                            slug,
                            email: emailToUse,
                            description: data.description ?? null,
                            logo: data.logo ?? null,
                            banner: data.banner ?? null,
                            phone: req.body.contactNumber ?? data.phone ?? null,
                            socialMediaLink: req.body.socialMediaLink ?? data.socialMediaLink ?? null,
                            businessType: data.businessType ?? null,
                            productCategories: data.productCategories ?? null,
                            isHandmade: data.isHandmade ?? false,
                            hasPriorExperience: data.hasPriorExperience ?? false,
                            legalName: data.legalName ?? null,
                            businessAddress: data.businessAddress ?? null,
                            portfolioLink: data.portfolioLink ?? null,
                            idType: data.idType ?? null,
                            idNumber: data.idNumber ?? null,
                            status: SellerStatus.PENDING,
                            rejectionReason: null, // Clear previous rejection reason
                            termsAccepted: data.termsAccepted ?? false,
                            termsAcceptedAt: data.termsAccepted ? new Date() : null
                        }
                    });

                    const admins = await prisma.customer.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
                    if (admins.length > 0) {
                        await prisma.notification.createMany({
                            data: admins.map(admin => ({
                                customerId: admin.uid,
                                title: 'New Seller Application',
                                message: `A new seller (${data.name}) has reapplied and is waiting for approval.`,
                                type: 'system'
                            }))
                        });
                        admins.forEach(admin => socketService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
                    }

                    return res.status(200).json(updatedSeller);
                }

                return res.status(409).json({ error: "User is already a seller" });
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
                    email: emailToUse,
                    description: data.description ?? null,
                    logo: data.logo ?? null,
                    banner: data.banner ?? null,
                    // Map contactNumber (frontend) to phone (schema)
                    phone: req.body.contactNumber ?? data.phone ?? null,
                    socialMediaLink: req.body.socialMediaLink ?? data.socialMediaLink ?? null,
                    businessType: data.businessType ?? null,
                    productCategories: data.productCategories ?? null,
                    isHandmade: data.isHandmade ?? false,
                    hasPriorExperience: data.hasPriorExperience ?? false,
                    legalName: data.legalName ?? null,
                    businessAddress: data.businessAddress ?? null,
                    portfolioLink: data.portfolioLink ?? null,
                    idType: data.idType ?? null,
                    idNumber: data.idNumber ?? null,
                    status: SellerStatus.PENDING,
                    termsAccepted: data.termsAccepted ?? false,
                    termsAcceptedAt: data.termsAccepted ? new Date() : null
                }
            });

            const admins = await prisma.customer.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        customerId: admin.uid,
                        title: 'New Seller Application',
                        message: `A new seller (${data.name}) has applied and is waiting for approval.`,
                        type: 'system'
                    }))
                });
                admins.forEach(admin => socketService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
            }

            res.status(201).json(seller);
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: error.issues });
            }
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

            // Admin approving seller: set to APPROVED (not ACTIVE yet) and send notification
            if (user.role === Role.ADMIN && updates.status === SellerStatus.ACTIVE && currentSeller.status !== SellerStatus.ACTIVE) {
                // Set status to APPROVED — role upgrade happens only after user completes onboarding
                await prisma.seller.update({
                    where: { uid: targetSellerId },
                    data: { status: SellerStatus.APPROVED, approvedAt: new Date() }
                });

                // Send in-app notification to the seller's customer
                await prisma.notification.create({
                    data: {
                        customerId: currentSeller.customerId,
                        title: '🎉 Your application has been approved!',
                        message: 'Congratulations! Your seller application has been approved. Complete your onboarding to start selling on Knot & Bloom.',
                        type: 'system',
                    }
                });
                socketService.emitToRoom(`user_${currentSeller.customerId}`, 'notification:new', {});

                const updatedSeller = await prisma.seller.findUnique({ where: { uid: targetSellerId } });
                return res.json(updatedSeller);
            }

            // Admin Rejecting Seller: ensure rejectionReason is saved
            if (user.role === Role.ADMIN && updates.status === SellerStatus.REJECTED) {
                const seller = await prisma.seller.update({
                    where: { uid: targetSellerId },
                    data: {
                        status: SellerStatus.REJECTED,
                        rejectionReason: updates.rejectionReason || "Application rejected by admin."
                    }
                });

                // Send in-app notification to the seller's customer
                await prisma.notification.create({
                    data: {
                        customerId: seller.customerId,
                        title: '⚠️ Application Update',
                        message: `Your seller application could not be approved at this time. Reason: ${seller.rejectionReason}`,
                        type: 'system',
                    }
                });
                socketService.emitToRoom(`user_${seller.customerId}`, 'notification:new', {});

                return res.json(seller);
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

    // Public: List Active Sellers
    async listActiveSellers(req: Request, res: Response) {
        try {
            const sellers = await prisma.seller.findMany({
                where: { 
                    deletedAt: null,
                    status: SellerStatus.ACTIVE
                },
                orderBy: { approvedAt: 'desc' },
                take: 50
            });
            res.json(sellers);
        } catch (error) {
            res.status(500).json({ error: 'Failed to list active sellers' });
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

            // Cast Decimal to Number for frontend consumption
            const safeOrders = orders.map(order => ({
                ...order,
                total: Number(order.total),
                subtotal: Number(order.subtotal),
                platformFee: Number(order.platformFee),
                sellerEarnings: Number(order.sellerEarnings),
            }));

            res.json(safeOrders);
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

            const search = req.query.search as string;
            const sortBy = req.query.sortBy as string;

            const whereClause: any = {
                sellerId,
                deletedAt: null
            };

            if (status) {
                whereClause.status = status;
            }

            if (search) {
                whereClause.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } }
                ];
            }

            let orderBy: any = { uploaded: 'desc' };
            if (sortBy === 'oldest') orderBy = { uploaded: 'asc' };
            else if (sortBy === 'price_high') orderBy = { basePrice: 'desc' };
            else if (sortBy === 'price_low') orderBy = { basePrice: 'asc' };

            const globalWhere = { sellerId, deletedAt: null };
            
            const [products, total, allProducts] = await Promise.all([
                prisma.product.findMany({
                    where: whereClause,
                    include: { variants: true },
                    orderBy,
                    skip, take: limit
                }),
                prisma.product.count({ where: whereClause }),
                prisma.product.findMany({
                    where: globalWhere,
                    include: { variants: true }
                })
            ]);

            let totalOptScore = 0;
            let lowStockCount = 0;
            let pendingCount = 0;

            allProducts.forEach(p => {
                // Optimization Score Calculation
                let score = 0;
                if (p.image) score += 20;
                if (p.name && p.name.length >= 20) score += 20;
                if (p.description && p.description.length >= 50) score += 20;
                const hasVariants = p.variants && p.variants.length > 0;
                if (hasVariants && p.variants.some(v => v.stock > 0)) score += 20;
                score += 20; // competitiveness
                totalOptScore += score;

                // Low Stock Calculation
                if (hasVariants && p.variants.some(v => v.stock <= 5)) {
                    lowStockCount++;
                }

                // Pending Count
                if (p.status === 'PENDING') pendingCount++;
            });

            const avgOptimizationScore = allProducts.length > 0 ? Math.round(totalOptScore / allProducts.length) : 0;

            res.json({
                products,
                stats: {
                    totalProducts: allProducts.length,
                    avgOptimizationScore,
                    lowStockCount,
                    pendingCount
                },
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

    // Complete Onboarding (formerly markWelcomeSeen)
    // Called when user finishes the welcome modal — officially activates the seller account.
    // Sets hasSeenWelcomeModal=true, upgrades status to ACTIVE, upgrades customer role to SELLER,
    // and returns a fresh JWT token so the frontend reflects the new role immediately.
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
                if (seller) sellerId = seller.uid;
            }

            // Admin Auto-Creation Logic
            if (!sellerId && user.role === Role.ADMIN && user.email) {
                sellerId = await ensureAdminSellerProfile(user.id, user.email!);
            }

            if (!sellerId) return res.status(401).json({ error: "Unauthorized - Seller profile not found" });

            // Atomically: mark modal seen + set ACTIVE + upgrade customer role to SELLER
            await prisma.$transaction(async (tx) => {
                await tx.seller.update({
                    where: { uid: sellerId! },
                    data: {
                        hasSeenWelcomeModal: true,
                        status: SellerStatus.ACTIVE,
                    }
                });
                await tx.customer.update({
                    where: { uid: user.id },
                    data: { role: Role.SELLER }
                });
            });

            // Fetch updated profile to build a fresh token
            const updatedCustomer = await prisma.customer.findUnique({
                where: { uid: user.id },
                include: { sellerProfile: true }
            });

            if (!updatedCustomer) return res.status(404).json({ error: 'Customer not found' });

            const payload: AuthPayload = {
                id: updatedCustomer.uid,
                ...(updatedCustomer.email ? { email: updatedCustomer.email } : {}),
                role: updatedCustomer.role as any,
                ...(updatedCustomer.sellerProfile?.uid && { sellerId: updatedCustomer.sellerProfile.uid }),
                ...(updatedCustomer.sellerProfile?.status && { sellerStatus: updatedCustomer.sellerProfile.status as any }),
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

            res.json({
                success: true,
                token,
                customer: {
                    uid: updatedCustomer.uid,
                    name: updatedCustomer.name,
                    email: updatedCustomer.email,
                    phone: updatedCustomer.phone,
                    address: updatedCustomer.address,
                    role: updatedCustomer.role,
                    avatar: updatedCustomer.avatar,
                    passwordResetRequired: updatedCustomer.passwordResetRequired,
                    sellerId: updatedCustomer.sellerProfile?.uid,
                    sellerStatus: updatedCustomer.sellerProfile?.status,
                    sellerHasSeenWelcomeModal: updatedCustomer.sellerProfile?.hasSeenWelcomeModal,
                    sellerStoreName: updatedCustomer.sellerProfile?.name,
                    sellerSlug: updatedCustomer.sellerProfile?.slug,
                    sellerRating: updatedCustomer.sellerProfile?.rating,
                    sellerTotalSales: updatedCustomer.sellerProfile?.totalSales,
                    sellerTotalOrders: updatedCustomer.sellerProfile?.totalOrders,
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to complete onboarding" });
        }
    },

    // Cancel Application (Pending only)
    async cancelApplication(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            const seller = await prisma.seller.findUnique({
                where: { customerId: user.id }
            });

            if (!seller) {
                return res.status(404).json({ error: "No application found" });
            }

            if (seller.status !== SellerStatus.PENDING && seller.status !== SellerStatus.REJECTED) {
                return res.status(400).json({ error: "Cannot cancel an active or suspended account" });
            }

            await prisma.seller.delete({
                where: { uid: seller.uid }
            });

            res.json({ success: true, message: "Application cancelled" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to cancel application" });
        }
    },

    // Dashboard Stats
    async getDashboardStats(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            let sellerId = user.sellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { customerId: user.id } });
                sellerId = seller?.uid;
            }

            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

            // 1. Today's Metrics
            const todayOrders = await prisma.order.findMany({
                where: {
                    sellerId,
                    uploaded: { gte: startOfDay }
                },
                select: { total: true }
            });
            const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
            const todayOrderCount = todayOrders.length;

            // 2. Pending Actions
            const pendingOrdersCount = await prisma.order.count({
                where: {
                    sellerId,
                    status: 'PENDING'
                }
            });

            // Low stock (Variants with stock < 5)
            // Note: Efficiently query variants directly via Product relation
            const lowStockCount = await prisma.productVariant.count({
                where: {
                    product: { sellerId, deletedAt: null },
                    stock: { lt: 5 }
                }
            });

            // 3. Quick Stats (Month vs Last Month)
            const thisMonthMetrics = await prisma.order.aggregate({
                where: {
                    sellerId,
                    uploaded: { gte: startOfMonth }
                },
                _sum: { total: true, sellerEarnings: true },
                _count: { uid: true }
            });

            const lastMonthMetrics = await prisma.order.aggregate({
                where: {
                    sellerId,
                    uploaded: { gte: startOfLastMonth, lte: endOfLastMonth }
                },
                _sum: { total: true },
                _count: { uid: true }
            });

            const totalOrdersDistribution = await prisma.order.groupBy({
                by: ['status'],
                where: { sellerId },
                _count: { uid: true }
            });

            // Map distribution to handy object
            const orderCounts = {
                PENDING: 0,
                PROCESSING: 0, // In Production + Ready to Ship
                COMPLETED: 0,
                CANCELLED: 0
            };

            totalOrdersDistribution.forEach(group => {
                if (group.status === 'PENDING') orderCounts.PENDING += group._count.uid;
                else if (['IN_PRODUCTION', 'READY_TO_SHIP'].includes(group.status)) orderCounts.PROCESSING += group._count.uid;
                else if (group.status === 'COMPLETED') orderCounts.COMPLETED += group._count.uid;
                else if (['CANCELLED', 'REJECTED'].includes(group.status)) orderCounts.CANCELLED += group._count.uid;
            });

            // 4. Sales Graph (Last 7 Days)
            // Simple daily aggregation
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const recentOrders = await prisma.order.findMany({
                where: {
                    sellerId,
                    uploaded: { gte: sevenDaysAgo }
                },
                select: { uploaded: true, total: true }
            });

            const salesGraph = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(sevenDaysAgo);
                date.setDate(date.getDate() + i);
                const dateString = date.toISOString().split('T')[0];

                const dayOrders = recentOrders.filter(o =>
                    o.uploaded.toISOString().split('T')[0] === dateString
                );

                salesGraph.push({
                    date: dateString,
                    sales: dayOrders.reduce((sum, o) => sum + Number(o.total), 0)
                });
            }

            // 5. Top Products (by revenue)
            // Fetch all COMPLETED order items for the seller and calculate revenue per product in memory
            const completedOrders = await prisma.order.findMany({
                where: { sellerId, status: 'COMPLETED' },
                select: {
                    items: {
                        select: { productId: true, price: true, quantity: true }
                    }
                }
            });

            const productRevenue: Record<number, number> = {};
            completedOrders.forEach(order => {
                order.items.forEach(item => {
                    const currentRev = productRevenue[item.productId] || 0;
                    productRevenue[item.productId] = currentRev + (Number(item.price) * item.quantity);
                });
            });

            const sortedProductIds = Object.keys(productRevenue)
                .map(Number)
                .sort((a, b) => (productRevenue[b] || 0) - (productRevenue[a] || 0))
                .slice(0, 3);

            let topProductsData: Array<{ id: number, name: string, image: string | null, revenue: number }> = [];
            if (sortedProductIds.length > 0) {
                const products = await prisma.product.findMany({
                    where: { uid: { in: sortedProductIds } },
                    select: { uid: true, name: true, image: true }
                });
                
                topProductsData = sortedProductIds.map(pid => {
                    const prod = products.find(p => p.uid === pid);
                    return {
                        id: pid,
                        name: prod?.name || 'Unknown Product',
                        image: prod?.image || null,
                        revenue: productRevenue[pid] || 0
                    };
                });
            }

            // 6. Recent Reviews (Mocked for now)
            const recentReviews = [
                { id: 1, customerName: "Maria D.", rating: 5, comment: "Beautifully crafted bouquet, my sister loved it!", date: new Date().toISOString() },
                { id: 2, customerName: "Sarah M.", rating: 4, comment: "Great quality, but shipping was a bit delayed.", date: new Date(Date.now() - 86400000).toISOString() },
            ];

            res.json({
                performanceSnapshot: {
                    todayRevenue,
                    todayOrders: todayOrderCount,
                    todayVisitors: 0, // Placeholder until analytics
                    pendingActions: pendingOrdersCount + lowStockCount
                },
                quickStats: {
                    thisMonthSales: Number(thisMonthMetrics._sum.total || 0),
                    thisMonthOrders: Number(thisMonthMetrics._count.uid || 0),
                    thisMonthEarnings: Number(thisMonthMetrics._sum.sellerEarnings || 0),
                    lastMonthSales: Number(lastMonthMetrics._sum.total || 0),
                    totalOrders: orderCounts,
                    conversionRate: 0 // Placeholder
                },
                performanceGraph: salesGraph,
                topProducts: topProductsData,
                recentReviews
            });

        } catch (error) {
            console.error('Dashboard Stats Error:', error);
            res.status(500).json({ error: "Failed to fetch dashboard stats" });
        }
    },

    // Sidebar Stats (lightweight)
    async getSidebarStats(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            let sellerId = user.sellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { customerId: user.id } });
                sellerId = seller?.uid;
            }

            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            const unreadNotifications = await prisma.notification.count({
                where: {
                    customerId: user.id,
                    isRead: false
                }
            });

            const lowStockCount = await prisma.productVariant.count({
                where: {
                    product: { sellerId, deletedAt: null },
                    stock: { lt: 5 }
                }
            });

            res.json({
                unreadNotifications,
                lowStockCount
            });

        } catch (error) {
            console.error('Sidebar Stats Error:', error);
            res.status(500).json({ error: "Failed to fetch sidebar stats" });
        }
    }
};
