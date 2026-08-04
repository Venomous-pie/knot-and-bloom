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
import { supabaseService } from '../services/SupabaseService.js';
import { computeShippingFee } from '../utils/shippingUtils.js';
import type { ShippingConfig } from '../utils/shippingUtils.js';
import { getShippingConfig } from '../utils/platformConfigUtils.js';
import { kycService } from '../services/kycService.js';
import { calculateSpotlightAndRegularMakers } from '../utils/sellerRanking.js';

export const sellerController = {
    // Flow B: Direct Register as Seller (Public)
    // Creates a Customer (role: USER) and a Seller (status: PENDING)
    // Role upgrades to SELLER only when admin approves
    async registerSeller(req: Request, res: Response) {
        try {
            const data = registerSellerSchema.parse(req.body);

            // Check if email exists
            const existingCustomer = await prisma.user.findUnique({ where: { email: data.email } });
            if (existingCustomer) {
                return res.status(409).json({ error: "Email already registered. Please login and upgrade to seller." });
            }

            // Auto-generate slug
            let slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const existingSlug = await prisma.seller.findUnique({ where: { slug } });
            if (existingSlug) slug = `${slug}-${Date.now()}`;

            const hashedPassword = await bcrypt.hash(data.password, 10);

            let initialStatus: SellerStatus = SellerStatus.PENDING;
            let initialRole = Role.USER;
            if (data.idType && data.idNumber && data.idPhotos && data.idPhotos.length > 0) {
                const isVerified = await kycService.verifyIdentity(data.idType, data.idNumber, data.idPhotos);
                if (isVerified) {
                    initialStatus = SellerStatus.ACTIVE;
                    initialRole = Role.SELLER;
                }
            }

            // Transaction: Create Customer + Seller
            const result = await prisma.$transaction(async (tx) => {
                const customer = await tx.user.create({
                    data: {
                        name: data.name,
                        email: data.email,
                        password: hashedPassword,
                        phone: data.phone ?? null,
                        role: initialRole
                    }
                });

                const seller = await tx.seller.create({
                    data: {
                        userId: customer.uid,
                        name: data.name,
                        email: data.email,
                        slug,
                        description: data.description ?? null,
                        logo: data.logo ?? null,
                        banner: data.banner ?? null,
                        
                        productCategories: Array.isArray(data.productCategories) ? data.productCategories : (data.productCategories ? [data.productCategories] : []),
                        isHandmade: data.isHandmade ?? false,
                        hasPriorExperience: data.hasPriorExperience ?? false,
                        sampleItems: data.sampleItems ?? [],
                        salesChannels: data.salesChannels ?? [],
                        monthlyOrders: data.monthlyOrders ?? null,
                        legalName: data.legalName ?? null,
                        businessAddress: data.businessAddress ?? null,
                        portfolioLink: data.portfolioLink ?? null,
                        idType: data.idType ?? null,
                        idNumber: data.idNumber ?? null,
                        idPhotos: data.idPhotos ?? [],
                        status: initialStatus
                    }
                });

                const admins = await tx.user.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
                if (admins.length > 0) {
                    await tx.notification.createMany({
                        data: admins.map((admin: any) => ({
                            userId: admin.uid,
                            title: 'New Seller Application',
                            message: `A new seller (${data.name}) has applied and is waiting for approval.`,
                            type: 'system'
                        }))
                    });
                    admins.forEach((admin: any) => supabaseService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
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

            let initialStatus: SellerStatus = SellerStatus.PENDING;
            if (data.idType && data.idNumber && data.idPhotos && data.idPhotos.length > 0) {
                const isVerified = await kycService.verifyIdentity(data.idType, data.idNumber, data.idPhotos);
                if (isVerified) {
                    initialStatus = SellerStatus.ACTIVE;
                }
            }

            // Check if already has seller profile
            const existingSeller = await prisma.seller.findUnique({ where: { userId: userId } });

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
                            
                            
                            productCategories: Array.isArray(data.productCategories) ? data.productCategories : (data.productCategories ? [data.productCategories] : []),
                            isHandmade: data.isHandmade ?? false,
                            hasPriorExperience: data.hasPriorExperience ?? false,
                            sampleItems: data.sampleItems ?? [],
                            salesChannels: data.salesChannels ?? [],
                            monthlyOrders: data.monthlyOrders ?? null,
                            legalName: data.legalName ?? null,
                            businessAddress: data.businessAddress ?? null,
                            portfolioLink: data.portfolioLink ?? null,
                            idType: data.idType ?? null,
                            idNumber: data.idNumber ?? null,
                            idPhotos: data.idPhotos ?? [],
                            status: initialStatus,
                            rejectionReason: null, // Clear previous rejection reason
                            termsAccepted: data.termsAccepted ?? false,
                            termsAcceptedAt: data.termsAccepted ? new Date() : null
                        }
                    });

                    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
                    if (admins.length > 0) {
                        await prisma.notification.createMany({
                            data: admins.map((admin: any) => ({
                                userId: admin.uid,
                                title: 'New Seller Application',
                                message: `A new seller (${data.name}) has reapplied and is waiting for approval.`,
                                type: 'admin'
                            }))
                        });
                        admins.forEach((admin: any) => supabaseService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
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
                    userId: userId,
                    name: data.name,
                    slug,
                    email: emailToUse,
                    description: data.description ?? null,
                    logo: data.logo ?? null,
                    banner: data.banner ?? null,
                    // Map contactNumber (frontend) to phone (schema)
                    phone: req.body.contactNumber ?? data.phone ?? null,
                    
                    
                    productCategories: Array.isArray(data.productCategories) ? data.productCategories : (data.productCategories ? [data.productCategories] : []),
                    isHandmade: data.isHandmade ?? false,
                    hasPriorExperience: data.hasPriorExperience ?? false,
                    sampleItems: data.sampleItems ?? [],
                    salesChannels: data.salesChannels ?? [],
                    monthlyOrders: data.monthlyOrders ?? null,
                    legalName: data.legalName ?? null,
                    businessAddress: data.businessAddress ?? null,
                    portfolioLink: data.portfolioLink ?? null,
                    idType: data.idType ?? null,
                    idNumber: data.idNumber ?? null,
                    idPhotos: data.idPhotos ?? [],
                    status: initialStatus,
                    termsAccepted: data.termsAccepted ?? false,
                    termsAcceptedAt: data.termsAccepted ? new Date() : null
                }
            });

            const admins = await prisma.user.findMany({ where: { role: Role.ADMIN }, select: { uid: true } });
            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map((admin: any) => ({
                        userId: admin.uid,
                        title: 'New Seller Application',
                        message: `A new seller (${data.name}) has applied and is waiting for approval.`,
                        type: 'admin'
                    }))
                });
                admins.forEach((admin: any) => supabaseService.emitToRoom(`user_${admin.uid}`, 'notification:new', {}));
            }

            if (initialStatus === SellerStatus.ACTIVE) {
                await prisma.user.update({
                    where: { uid: userId },
                    data: { role: Role.SELLER }
                });
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
                        where: { status: 'ACTIVE', deletedAt: null },
                        take: 20,
                        orderBy: { uploaded: 'desc' },
                        include: { variants: true }
                    }
                }
            });

            if (!seller) {
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
                if (seller && seller.userId === user.id) {
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

            // Admin reactivating a suspended seller: set directly back to ACTIVE
            if (user.role === Role.ADMIN && updates.status === SellerStatus.ACTIVE && currentSeller.status === SellerStatus.SUSPENDED) {
                const seller = await prisma.seller.update({
                    where: { uid: targetSellerId },
                    data: { status: SellerStatus.ACTIVE }
                });

                await prisma.notification.create({
                    data: {
                        userId: currentSeller.userId,
                        title: '✅ Account Reactivated',
                        message: 'Your seller account has been reactivated. Your listings are now visible on Knot & Bloom again.',
                        type: 'system',
                    }
                });
                supabaseService.emitToRoom(`user_${currentSeller.userId}`, 'notification:new', {});

                return res.json(seller);
            }

            // Admin approving a new seller application: set to APPROVED (not ACTIVE yet)
            // Role upgrade happens only after user completes onboarding
            if (user.role === Role.ADMIN && updates.status === SellerStatus.ACTIVE && currentSeller.status !== SellerStatus.ACTIVE) {
                // Set status to APPROVED — role upgrade happens only after user completes onboarding
                await prisma.seller.update({
                    where: { uid: targetSellerId },
                    data: { status: SellerStatus.APPROVED, approvedAt: new Date() }
                });

                // Send in-app notification to the seller's customer
                await prisma.notification.create({
                    data: {
                        userId: currentSeller.userId,
                        title: '🎉 Your application has been approved!',
                        message: 'Congratulations! Your seller application has been approved. Complete your onboarding to start selling on Knot & Bloom.',
                        type: 'system',
                    }
                });
                supabaseService.emitToRoom(`user_${currentSeller.userId}`, 'notification:new', {});

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
                        userId: seller.userId,
                        title: '⚠️ Application Update',
                        message: `Your seller application could not be approved at this time. Reason: ${seller.rejectionReason}`,
                        type: 'system',
                    }
                });
                supabaseService.emitToRoom(`user_${seller.userId}`, 'notification:new', {});

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
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
            const offset = parseInt(req.query.offset as string) || 0;
            const where: any = {};
            if (status) where.status = String(status);

            const [sellers, total] = await Promise.all([
                prisma.seller.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.seller.count({ where }),
            ]);
            res.json({
                sellers,
                total,
                pagination: {
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to list sellers' });
        }
    },

    // Public: List Active Sellers
    async listActiveSellers(req: Request, res: Response) {
        try {
            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
            const offset = parseInt(req.query.offset as string) || 0;
            const where = {
                status: SellerStatus.ACTIVE,
            };

            const [allSellers, total] = await Promise.all([
                prisma.seller.findMany({
                    where,
                    orderBy: { approvedAt: 'desc' },
                    include: { user: { select: { trustScore: true } } },
                    take: limit,
                    skip: offset,
                }),
                prisma.seller.count({ where }),
            ]);

            const { spotlightMakers, regularMakers } = calculateSpotlightAndRegularMakers(allSellers, 'knot-and-bloom-official');

            res.json({
                spotlightMakers,
                regularMakers,
                total,
                pagination: {
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error(error);
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
                if (seller && seller.userId === user.id) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(403).json({ error: "Unauthorized to view these orders" });
            }

            const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
            const offset = parseInt(req.query.offset as string) || 0;

            const whereClause = { sellerId };

            const [orders, total] = await Promise.all([
                prisma.order.findMany({
                    where: whereClause,
                    include: {
                        items: {
                            include: {
                                product: { select: { name: true, image: true, processingTime: true } }
                            }
                        },
                        user: {
                            select: { name: true, email: true }
                        }
                    },
                    orderBy: { uploaded: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prisma.order.count({ where: whereClause }),
            ]);

            // Cast Decimal to Number for frontend consumption
            const safeOrders = orders.map(order => ({
                ...order,
                customer: order.user,
                total: Number(order.total),
                subtotal: Number(order.subtotal),
                platformFee: Number(order.platformFee),
                sellerEarnings: Number(order.sellerEarnings),
            }));

            res.json({
                orders: safeOrders,
                total,
                pagination: {
                    limit,
                    offset,
                    hasMore: offset + limit < total,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(total / limit),
                },
            });
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
                    where: { userId: user.id }
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

            const includeStats = req.query.includeStats === 'true';

            const promises: any[] = [
                prisma.product.findMany({
                    where: whereClause,
                    include: { variants: true },
                    orderBy,
                    skip, take: limit
                }),
                prisma.product.count({ where: whereClause })
            ];

            if (includeStats) {
                const globalWhere = { sellerId, deletedAt: null };
                promises.push(
                    prisma.product.findMany({
                        where: globalWhere,
                        include: { variants: true }
                    })
                );
            }

            const [products, total, allProducts] = await Promise.all(promises);

            let stats = undefined;

            if (includeStats && allProducts) {
                let totalOptScore = 0;
                let lowStockCount = 0;
                let pendingCount = 0;

            allProducts.forEach((p: any) => {
                let score = 0;
                const hasVariants = p.variants && p.variants.length > 0;
                
                // Media (25 pts): main image +10, variant images +5, video +10
                const hasMainImage = !!p.image;
                const hasVariantImages = hasVariants && p.variants.some((v: any) => v.images && v.images.length > 0);
                const hasVideo = !!((p as any).videoUrl && (p as any).videoUrl.trim().length > 0);
                
                if (hasMainImage) score += 10;
                if (hasVariantImages) score += 5;
                if (hasVideo) score += 10;

                // Title & SEO (25 pts): name >= 30 chars +10, has tags +8, 3+ tags +7
                const nameLength = p.name ? p.name.length : 0;
                const hasLongName = nameLength >= 30;
                const hasTags = (p as any).tags && (p as any).tags.length > 0;
                const hasMultipleTags = (p as any).tags && (p as any).tags.length >= 3;
                
                if (hasLongName) score += 10;
                if (hasTags) score += 8;
                if (hasMultipleTags) score += 7;

                // Description & Details (20 pts): >= 100 chars +10, has materials +5, care instructions +5
                const descLength = p.description ? p.description.length : 0;
                const hasGoodDesc = descLength >= 100;
                const hasMaterials = (p as any).materials && (p as any).materials.trim().length > 0;
                const hasCareInstructions = !!((p as any).careInstructions && (p as any).careInstructions.trim().length > 0);
                
                if (hasGoodDesc) score += 10;
                if (hasMaterials) score += 5;
                if (hasCareInstructions) score += 5;

                // Fulfillment & Inventory (20 pts): processing time +5, has stock +10, no low-stock variants +5
                const hasProcessingTime = !!((p as any).processingTime && (p as any).processingTime.trim().length > 0);
                const hasStock = hasVariants && p.variants.some((v: any) => Number(v.stock || 0) > 0);
                const hasLowStock = hasVariants && p.variants.some((v: any) => {
                    const s = Number(v.stock || 0);
                    return s > 0 && s <= 5;
                });
                
                if (hasProcessingTime) score += 5;
                if (hasStock) score += 10;
                if (hasStock && !hasLowStock) score += 5;

                // Pricing (10 pts): price set +5, active discount +5
                const hasDiscount = p.discountPercentage && Number(p.discountPercentage) > 0;
                const hasPrice = p.basePrice && Number(p.basePrice) > 0;
                
                if (hasPrice) score += 5;
                if (hasDiscount) score += 5;

                totalOptScore += score;

                // Low Stock Calculation
                if (hasVariants && p.variants.some((v: any) => v.stock <= 5)) {
                    lowStockCount++;
                }

                // Pending Count
                if (p.status === 'PENDING') pendingCount++;
            });

            const avgOptimizationScore = allProducts.length > 0 ? Math.round(totalOptScore / allProducts.length) : 0;

            stats = {
                totalProducts: allProducts.length,
                avgOptimizationScore,
                lowStockCount,
                pendingCount
            };
            }

            res.json({
                products,
                ...(stats ? { stats } : {}),
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
                    where: { userId: user.id }
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
                await tx.user.update({
                    where: { uid: user.id },
                    data: { role: Role.SELLER }
                });
            });

            // Fetch updated profile to build a fresh token
            const updatedCustomer = await prisma.user.findUnique({
                where: { uid: user.id },
                include: { sellerProfile: true }
            });

            if (!updatedCustomer) return res.status(404).json({ error: 'Customer not found' });

            const payload: AuthPayload = {
                id: updatedCustomer.uid,
                email: updatedCustomer.email || "",
                role: updatedCustomer.role as any,
                ...(updatedCustomer.sellerProfile?.uid && { sellerId: updatedCustomer.sellerProfile.uid }),
                ...(updatedCustomer.sellerProfile?.status && { sellerStatus: updatedCustomer.sellerProfile.status as any }),
            };

            const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

            res.json({
                success: true,
                token,
                user: {
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
                where: { userId: user.id }
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
                const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
                sellerId = seller?.uid;
            }

            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            // 1. Prepare Date Boundaries
            // HARDCODED: Asia/Manila (UTC+8) is the single source of truth for Knot & Bloom date logic.
            // This ensures midnight resets and SLA calculations are consistent for Filipino sellers regardless of server UTC time.
            const now = new Date();
            
            const getStartOfDayPHT = (dateObj: Date, offsetDays = 0) => {
                const phtTime = new Date(dateObj.getTime() + (8 * 3600000));
                phtTime.setUTCDate(phtTime.getUTCDate() + offsetDays);
                const startOfPhtDay = new Date(Date.UTC(phtTime.getUTCFullYear(), phtTime.getUTCMonth(), phtTime.getUTCDate()));
                return new Date(startOfPhtDay.getTime() - (8 * 3600000));
            };

            const startOfDay = getStartOfDayPHT(now);
            
            const phtNow = new Date(now.getTime() + (8 * 3600000));
            const startOfMonthPHT = new Date(Date.UTC(phtNow.getUTCFullYear(), phtNow.getUTCMonth(), 1));
            const startOfMonth = new Date(startOfMonthPHT.getTime() - (8 * 3600000));
            
            const startOfLastMonthPHT = new Date(Date.UTC(phtNow.getUTCFullYear(), phtNow.getUTCMonth() - 1, 1));
            const startOfLastMonth = new Date(startOfLastMonthPHT.getTime() - (8 * 3600000));
            
            const endOfLastMonthPHT = new Date(Date.UTC(phtNow.getUTCFullYear(), phtNow.getUTCMonth(), 0, 23, 59, 59, 999));
            const endOfLastMonth = new Date(endOfLastMonthPHT.getTime() - (8 * 3600000));
            
            const sevenDaysAgo = getStartOfDayPHT(now, -6);
            
            const SLA_24H = new Date(now.getTime() - (24 * 3600000));
            const SLA_48H = new Date(now.getTime() - (48 * 3600000));

            // 2. Execute Independent Queries Concurrently
            const [
                todayOrders,
                pendingOrders,
                lowStockCount,
                thisMonthMetrics,
                lastMonthMetrics,
                totalOrdersDistribution,
                recentOrders,
                completedOrders,
                unreadMessagesCount,
                totalProductsCount,
                paymentMethodsCount,
                sellerShipping
            ] = await Promise.all([
                prisma.order.findMany({ where: { sellerId, uploaded: { gte: startOfDay } }, select: { total: true } }),
                prisma.order.findMany({ where: { sellerId, status: 'PENDING' }, select: { uid: true, uploaded: true } }),
                prisma.productVariant.count({ where: { product: { sellerId, deletedAt: null }, stock: { lt: 5 } } }),
                prisma.order.aggregate({ where: { sellerId, uploaded: { gte: startOfMonth } }, _sum: { total: true, sellerEarnings: true }, _count: { uid: true } }),
                prisma.order.aggregate({ where: { sellerId, uploaded: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { total: true }, _count: { uid: true } }),
                prisma.order.groupBy({ by: ['status'], where: { sellerId }, _count: { uid: true } }),
                prisma.order.findMany({ where: { sellerId, uploaded: { gte: sevenDaysAgo } }, select: { uploaded: true, total: true } }),
                prisma.order.findMany({ where: { sellerId, status: 'COMPLETED' }, select: { items: { select: { productId: true, price: true, quantity: true } } } }),
                prisma.notification.count({ where: { userId: user.id, isRead: false } }),
                prisma.product.count({ where: { sellerId, deletedAt: null } }),
                prisma.paymentMethod.count({ where: { userId: user.id } }),
                prisma.seller.findUnique({ where: { uid: sellerId }, select: { vehicleType: true, meetUpPoint: true, selfDeliveryEnabled: true } })
            ]);

            // 3. Process Data
            const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
            const todayOrderCount = todayOrders.length;

            let pendingNeutral = 0;
            let pendingAmber = 0;
            let pendingRed = 0;

            pendingOrders.forEach(o => {
                if (o.uploaded < SLA_48H) pendingRed++;
                else if (o.uploaded < SLA_24H) pendingAmber++;
                else pendingNeutral++;
            });
            
            let pendingSeverity = 'NEUTRAL';
            if (pendingRed > 0) pendingSeverity = 'RED';
            else if (pendingAmber > 0) pendingSeverity = 'AMBER';

            const orderCounts = {
                PENDING: pendingOrders.length,
                PROCESSING: 0,
                COMPLETED: 0,
                CANCELLED: 0
            };

            let lifetimeTotalOrders = pendingOrders.length;

            totalOrdersDistribution.forEach(group => {
                if (group.status === 'PENDING') { /* already counted */ }
                else if (['IN_PRODUCTION', 'READY_TO_SHIP'].includes(group.status)) { orderCounts.PROCESSING += group._count.uid; lifetimeTotalOrders += group._count.uid; }
                else if (group.status === 'COMPLETED') { orderCounts.COMPLETED += group._count.uid; lifetimeTotalOrders += group._count.uid; }
                else if (['CANCELLED', 'REJECTED'].includes(group.status)) { orderCounts.CANCELLED += group._count.uid; lifetimeTotalOrders += group._count.uid; }
            });

            // 4. Sales Graph (Last 7 Days)
            const salesGraph = [];
            for (let i = 0; i < 7; i++) {
                const date = getStartOfDayPHT(now, -6 + i);
                const dateString = new Date(date.getTime() + (8 * 3600000)).toISOString().split('T')[0];

                const dayOrders = recentOrders.filter(o => {
                    const oPHT = new Date(o.uploaded.getTime() + (8 * 3600000));
                    return oPHT.toISOString().split('T')[0] === dateString;
                });

                salesGraph.push({
                    date: dateString,
                    sales: dayOrders.reduce((sum, o) => sum + Number(o.total), 0)
                });
            }

            // 5. Top Products (by revenue)
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
                    pendingOrders: pendingOrders.length,
                    lowStockItems: lowStockCount,
                    unreadMessages: unreadMessagesCount,
                    pendingOrdersSeverity: pendingSeverity,
                    lifetimeTotalOrders
                },
                quickStats: {
                    thisMonthSales: Number(thisMonthMetrics._sum.total || 0),
                    thisMonthOrders: Number(thisMonthMetrics._count.uid || 0),
                    thisMonthEarnings: Number(thisMonthMetrics._sum.sellerEarnings || 0),
                    lastMonthSales: Number(lastMonthMetrics._sum.total || 0),
                    totalOrders: orderCounts,
                    conversionRate: 0 // Placeholder
                },
                onboarding: {
                    hasProducts: totalProductsCount > 0,
                    hasPayouts: paymentMethodsCount > 0,
                    hasShipping: Boolean(sellerShipping && (sellerShipping.vehicleType !== 'NONE' || sellerShipping.meetUpPoint || sellerShipping.selfDeliveryEnabled))
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
                const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
                sellerId = seller?.uid;
            }

            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            const unreadNotifications = await prisma.notification.count({
                where: {
                    userId: user.id,
                    isRead: false,
                    type: { not: 'admin' }
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
    },

    // Admin Sidebar Stats
    async getAdminSidebarStats(req: Request, res: Response) {
        try {
            if (!req.user || req.user.role !== 'ADMIN') return res.status(401).json({ error: "Unauthorized" });

            const pendingSellers = await prisma.seller.count({
                where: { status: 'PENDING' }
            });

            const pendingProducts = await prisma.product.count({
                where: { status: 'PENDING', deletedAt: null }
            });

            res.json({
                pendingSellers,
                pendingProducts
            });
        } catch (error) {
            console.error('Admin Sidebar Stats Error:', error);
            res.status(500).json({ error: "Failed to fetch admin sidebar stats" });
        }
    },

    // Update Shipping Settings
    async updateShippingSettings(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            let sellerId = user.sellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
                if (seller) sellerId = seller.uid;
            }

            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            const { selfDeliveryEnabled, vehicleType, meetUpPoint, sellerCitymunCode, sellerProvCode, sellerRegCode, freeShippingEnabled, freeShippingThreshold } = req.body;

            if (freeShippingEnabled && (freeShippingThreshold === undefined || freeShippingThreshold === null || Number(freeShippingThreshold) <= 0)) {
                return res.status(400).json({ error: "A valid minimum order threshold greater than 0 is required to enable free shipping." });
            }

            const updatedSeller = await prisma.seller.update({
                where: { uid: sellerId },
                data: {
                    selfDeliveryEnabled,
                    vehicleType,
                    meetUpPoint,
                    sellerCitymunCode,
                    sellerProvCode,
                    sellerRegCode,
                    freeShippingEnabled: freeShippingEnabled || false,
                    freeShippingThreshold: freeShippingEnabled ? Number(freeShippingThreshold) : 0
                }
            });

            res.json({ success: true, seller: updatedSeller });
        } catch (error) {
            console.error('Update Shipping Settings Error:', error);
            res.status(500).json({ error: "Failed to update shipping settings" });
        }
    },

    // Get Shipping Preview — returns estimated delivery rates for each zone tier
    async getShippingPreview(req: Request, res: Response) {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const user = req.user as AuthPayload;

            let sellerId = user.sellerId;
            if (!sellerId) {
                const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
                if (seller) sellerId = seller.uid;
            }
            if (!sellerId) return res.status(404).json({ error: "Seller profile not found" });

            const seller = await prisma.seller.findUnique({
                where: { uid: sellerId },
                select: { selfDeliveryEnabled: true, vehicleType: true }
            });
            if (!seller) return res.status(404).json({ error: "Seller not found" });

            const config: ShippingConfig = await getShippingConfig();

            // Distance proxy per tier: Tier 1 = 5km, Tier 2 = 20km, Tier 3+ = 9999 (beyond self-delivery radius)
            const TIER_DISTANCES: Record<number, number> = { 1: 5, 2: 20, 3: 9999, 4: 9999, 5: 9999 };
            const TIER_LABELS: Record<number, string> = {
                1: 'Same municipality',
                2: 'Neighboring municipality',
                3: 'Same province',
                4: 'Same region',
                5: 'Inter-island',
            };

            const rates = [1, 2, 3, 4, 5].map((tier) => {
                const distanceKm: number | null = TIER_DISTANCES[tier] ?? null;
                const result = computeShippingFee(
                    'DELIVERY',
                    { selfDeliveryEnabled: seller.selfDeliveryEnabled, vehicleType: seller.vehicleType },
                    tier,
                    distanceKm,
                    config
                );
                return {
                    tier,
                    label: TIER_LABELS[tier],
                    fee: result.fee,
                    resolvedType: result.resolvedType,
                    breakdown: result.breakdown,
                };
            });

            res.json({ success: true, rates });
        } catch (error) {
            console.error('Shipping Preview Error:', error);
            res.status(500).json({ error: "Failed to fetch shipping preview" });
        }
    }
};
 
