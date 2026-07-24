import prisma from "../utils/prismaUtils.js";
import { ProductStatus, SellerStatus } from "../../generated/prisma/client.js";
import { ZodError } from "zod";
import { supabaseService } from "../services/SupabaseService.js";
import ErrorHandler from "../error/errorHandler.js";
import { Role } from "../types/authTypes.js";
import Pricing from "../utils/pricingUtils.js";
import { ensureAdminSellerProfile } from "../utils/sellerUtils.js";
import { cache } from "../utils/cacheUtils.js";

import type { AuthPayload } from "../types/authTypes.js";
import type { GetProductsResult } from "../types/productTypes.js";
import {
    getProductsQuerySchema,
    productSchema,
    type GetProductOptions,
    type ProductInput
} from "../validators/productValidator.js";

export const postProduct = async (input: unknown, user?: AuthPayload) => {
    // Parse and validate input
    let parsedInput: ProductInput;
    let calculatedDiscount;

    try {
        parsedInput = productSchema.parse(input);

        // Additional validation: Price must be positive
        if (Number(parsedInput.basePrice) <= 0) {
            throw new ErrorHandler.ValidationError([{ message: "Base price must be greater than 0", path: ['basePrice'] }]);
        }

        calculatedDiscount = Pricing.CalculateDiscount({
            basePrice: Number(parsedInput.basePrice),
            discountedPercentage: parsedInput.discountPercentage
        });

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // Determine Seller ID
    let sellerId = parsedInput.sellerId; // Default from input (Admin can set)

    if (user) {
        // Fallback: If sellerId is missing from token (stale token), try to find it in DB
        if (!sellerId && !user.sellerId) {
            const dbSeller = await prisma.seller.findUnique({ where: { customerId: user.id } });
            if (dbSeller) {
                sellerId = dbSeller.uid;
            }
        }

        if (user.role === Role.SELLER || (user.role !== Role.ADMIN && sellerId)) {
            // If user is SELLER, or a CUSTOMER with a linked seller profile (stale token)
            // We enforce the sellerId
            if (!sellerId && user.role === Role.SELLER) {
                // Should have been found above if it existed
                if (!user.sellerId) throw new Error("Seller profile not found. Please complete seller onboarding.");
                sellerId = user.sellerId;
            }

            // Re-verify if we found a valid sellerId from DB/Token
            if (sellerId) {
                // It's already set to `sellerId`.
            }
        } else if (user.role === Role.ADMIN) {
            // Admin keeps input sellerId or null (for Knot & Bloom direct) => FIX: Enforce Admin Seller Profile if none provided
            if (!sellerId) {
                if (!user.email) throw new Error("Admin email required for seller profile creation");
                sellerId = await ensureAdminSellerProfile(user.id, user.email);
            }
        }
    }

    // Check Seller Limit (if sellerId provided)
    if (sellerId) {
        const seller = await prisma.seller.findUnique({
            where: { uid: sellerId }
        });

        if (!seller || seller.status === SellerStatus.BANNED || seller.status === SellerStatus.SUSPENDED) {
            if (!seller) throw new ErrorHandler.ValidationError([{ message: "Invalid seller ID", path: ['sellerId'] }]);
            // Ideally we block suspended sellers from posting
            throw new Error("Seller account is suspended or banned.");
        }

        const activeProductCount = await prisma.product.count({
            where: {
                sellerId: sellerId,
                deletedAt: null // Only count active products
            }
        });

        if (activeProductCount >= 50) {
            throw new Error("Active product limit reached (50). Delete existing products to add new ones.");
        }
    }

    // Determine initial status
    let status: ProductStatus = ProductStatus.PENDING;
    if (user && user.role === Role.ADMIN) {
        status = ProductStatus.ACTIVE;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let currentSku = parsedInput.sku!;

    while (attempts < maxAttempts) {
        try {
            // Create product with variants in a transaction
            const product = await prisma.$transaction(async (tx) => {
                // Create the product
                const newProduct = await tx.product.create({
                    data: {
                        name: parsedInput.name,
                        sku: currentSku,
                        categories: parsedInput.categories || [],
                        basePrice: parsedInput.basePrice,
                        discountedPrice: calculatedDiscount.discountedPrice ?? null,
                        discountPercentage: parsedInput.discountPercentage ?? null,
                        image: parsedInput.image ?? null,
                        images: parsedInput.images || [],
                        description: parsedInput.description ?? null,
                        tags: parsedInput.tags || [],
                        materials: parsedInput.materials ?? null,
                        metaTitle: parsedInput.metaTitle ?? null,
                        metaDescription: parsedInput.metaDescription ?? null,
                        videoUrl: parsedInput.videoUrl ?? null,
                        shippingFeeOverride: parsedInput.shippingFeeOverride ?? null,
                        isLocalPickupAllowed: parsedInput.isLocalPickupAllowed ?? false,
                        localPickupInstructions: parsedInput.localPickupInstructions ?? null,
                        processingTime: parsedInput.processingTime ?? null,
                        fulfillmentType: parsedInput.fulfillmentType ?? 'READY_TO_SHIP',
                        isCustomOrderAllowed: parsedInput.isCustomOrderAllowed ?? false,
                        customOrderInstructions: parsedInput.customOrderInstructions ?? null,
                        careInstructions: parsedInput.careInstructions ?? null,
                        minOrderQty: parsedInput.minOrderQty ? Number(parsedInput.minOrderQty) : null,
                        maxOrderQty: parsedInput.maxOrderQty ? Number(parsedInput.maxOrderQty) : null,
                        isBundle: parsedInput.isBundle ?? false,
                        bundleQuantity: parsedInput.bundleQuantity ? Number(parsedInput.bundleQuantity) : null,
                        isCodAllowed: parsedInput.isCodAllowed ?? true,
                        sellerId: sellerId ?? null,
                        status: status,
                    },
                });

                // Create productOptions
                const createdOptionsMap: Record<string, Record<string, number>> = {};
                if (parsedInput.productOptions && parsedInput.productOptions.length > 0) {
                    for (let i = 0; i < parsedInput.productOptions.length; i++) {
                        const opt = parsedInput.productOptions[i];
                        const createdOption = await tx.productOption.create({
                            data: {
                                productId: newProduct.uid,
                                name: opt!.name,
                                position: opt!.position || i,
                            }
                        });
                        createdOptionsMap[opt!.name] = {};
                        for (const val of opt!.values) {
                            const createdVal = await tx.productOptionValue.create({
                                data: {
                                    optionId: createdOption.uid,
                                    value: val.value,
                                    imageUrl: val.imageUrl || null
                                }
                            });
                            createdOptionsMap[opt!.name]![val.value] = createdVal.uid;
                        }
                    }
                }

                // Create variants
                const variantsData = parsedInput.variants || [];

                if (Array.isArray(variantsData) && variantsData.length > 0) {
                    for (const variant of variantsData) {
                        const optionValueIds = [];
                        if (variant.options) {
                            for (const [optName, optVal] of Object.entries(variant.options) as [string, string][]) {
                                if (createdOptionsMap[optName] && createdOptionsMap[optName][optVal]) {
                                    optionValueIds.push(createdOptionsMap[optName][optVal]);
                                }
                            }
                        }

                        await tx.productVariant.create({
                            data: {
                                productId: newProduct.uid,
                                name: variant.name,
                                sku: variant.sku || `${newProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                                stock: variant.stock || 0,
                                price: variant.price || null,
                                discountPercentage: variant.discountPercentage || null,
                                discountedPrice: Pricing.calculateVariantStoredDiscountedPrice(
                                    Number(variant.price),
                                    Number(variant.discountPercentage),
                                    Number(parsedInput.discountPercentage)
                                ),
                                images: variant.images || [],
                                isEnabled: variant.isEnabled !== false,
                                optionValues: optionValueIds.length > 0 ? {
                                    connect: optionValueIds.map(id => ({ uid: id }))
                                } : undefined
                            } as any
                        });
                    }
                } else {
                    await tx.productVariant.create({
                        data: {
                            productId: newProduct.uid,
                            name: parsedInput.name,
                            sku: `${newProduct.sku}-${parsedInput.name.toUpperCase().replace(/\s+/g, '-')}`,
                            stock: parsedInput.stock || 0,
                            price: null,
                            discountPercentage: null,
                            discountedPrice: null,
                            isEnabled: true
                        }
                    });
                }

                return newProduct;
            });

            // Invalidate product caches
            cache.deletePattern('product:');
            return product;

        } catch (error: any) {
            // Handle Unique Constraint Violation (P2002) for SKU
            if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new ErrorHandler.DuplicateProductError(`SKU collision retries exhausted. Please try a different SKU.`);
                }

                // Append random suffix for retry
                const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
                currentSku = `${parsedInput.sku}-${randomSuffix}`;
                continue;
            }
            throw error; // Rethrow other errors
        }
    }

    throw new Error("Failed to create product after retries");
};

export const getProducts = async (options: unknown): Promise<GetProductsResult> => {
    let parsedInput: GetProductOptions;

    try {
        parsedInput = getProductsQuerySchema.parse(options);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    const { category, searchTerm, newArrival = false, limit = 30, offset = 0, sort, minPrice, maxPrice, categories, tags } = parsedInput;

    const cacheKey = `product:list:${JSON.stringify(parsedInput)}`;
    const cachedResult = cache.get<GetProductsResult>(cacheKey);
    if (cachedResult) return cachedResult;

    const whereClause: any = {};

    // Filter Logic:
    // Only show products where:
    // 1. deletedAt is null
    // 2. status is ACTIVE (only approved products visible publicly)
    // 3. AND (sellerId is null OR seller is active)

    whereClause.deletedAt = null;
    // ONLY show ACTIVE products - PENDING/SUSPENDED/null are hidden from public
    whereClause.status = ProductStatus.ACTIVE;

    const sellerCondition = {
        OR: [
            { sellerId: null },
            {
                seller: {
                    status: SellerStatus.ACTIVE,
                    deletedAt: null
                }
            }
        ]
    };

    if (category) {
        whereClause.categories = { has: category };
    }

    if (categories) {
        const cats = categories.split(',').map(c => c.trim()).filter(Boolean);
        if (cats.length > 0) {
            whereClause.categories = { hasSome: cats };
        }
    }

    if (tags) {
        const ts = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (ts.length > 0) {
            whereClause.tags = { hasSome: ts };
        }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
        whereClause.basePrice = {};
        if (minPrice !== undefined) whereClause.basePrice.gte = minPrice;
        if (maxPrice !== undefined) whereClause.basePrice.lte = maxPrice;
    }

    if (searchTerm) {
        const searchOR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
        ];

        whereClause.AND = [
            { OR: searchOR },
            sellerCondition
        ];
    } else {
        // Apply seller condition at top level if no AND needed for search
        whereClause.OR = sellerCondition.OR;
    }

    if (newArrival) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        whereClause.uploaded = {
            gte: sevenDaysAgo,
        };
    }

    let orderBy: any = { uploaded: 'desc' };
    if (sort === 'bestselling') {
        orderBy = { soldCount: 'desc' };
    } else if (sort === 'price_asc') {
        orderBy = { basePrice: 'asc' };
    } else if (sort === 'price_desc') {
        orderBy = { basePrice: 'desc' };
    } else if (sort === 'newest') {
        orderBy = { uploaded: 'desc' };
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where: whereClause,
            take: limit,
            skip: offset,
            orderBy: orderBy,
            include: {
                variants: true,
                seller: { select: { name: true, slug: true, logo: true } }
            }
        }),
        prisma.product.count({ where: whereClause }),
    ]);

    const result = {
        products,
        total,
        pagination: {
            limit,
            offset,
            hasMore: offset + limit < total,
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
        },
    };

    cache.set(cacheKey, result, 60); // Cache for 60 seconds
    return result;
};

export const getCategoryCounts = async () => {
    const cacheKey = `product:categories`;
    const cached = cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;
    const baseFilter: any = {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        AND: [
            {
                OR: [
                    { sellerId: null },
                    {
                        seller: {
                            status: SellerStatus.ACTIVE,
                            deletedAt: null
                        }
                    }
                ]
            }
        ]
    };

    const products = await prisma.product.findMany({
        where: baseFilter,
        select: { categories: true }
    });

    const counts: Record<string, number> = {};
    products.forEach(p => {
        if (p.categories) {
            p.categories.forEach(c => {
                counts[c] = (counts[c] || 0) + 1;
            });
        }
    });

    cache.set(cacheKey, counts, 120); // Cache for 2 minutes
    return counts;
};

// Admin-only: Get all products including PENDING (for approval workflow)
export const getAdminProducts = async (options: { status?: string; limit?: number; offset?: number }) => {
    const { status, limit = 50, offset = 0 } = options;

    const whereClause: any = {
        deletedAt: null
    };

    // Filter by status if provided
    if (status) {
        whereClause.status = status;
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where: whereClause,
            take: limit,
            skip: offset,
            orderBy: { uploaded: 'desc' },
            include: {
                variants: true,
                seller: { select: { uid: true, name: true, slug: true, email: true, logo: true } }
            }
        }),
        prisma.product.count({ where: whereClause }),
    ]);

    return {
        products,
        total,
        pagination: {
            limit,
            offset,
            hasMore: offset + limit < total,
        },
    };
};

// Admin-only: Update product status (approve/reject)
export const updateProductStatus = async (productId: string, status: string, rejectionReason?: string) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ErrorHandler.ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DRAFT'];
    if (!validStatuses.includes(status)) {
        throw new ErrorHandler.ValidationError([{ message: "Invalid status", path: ['status'] }]);
    }

    const product = await prisma.product.findUnique({ where: { uid: parsedId } });
    if (!product || product.deletedAt) {
        throw new ErrorHandler.NotFoundError('Product', productId);
    }

    const updateData: any = { status: status as ProductStatus };
    if (status === 'SUSPENDED' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
    } else if (status === 'ACTIVE') {
        updateData.rejectionReason = null; // Clear rejection reason if activated
    }

    const updated = await prisma.product.update({
        where: { uid: parsedId },
        data: updateData,
        include: {
            variants: true,
            seller: { select: { uid: true, name: true, email: true } }
        }
    });

    cache.deletePattern('product:');
    return updated;
};

export const searchProducts = async (searchTerm: string, limit = 20) => {
    const cacheKey = `product:search:${searchTerm}:${limit}`;
    const cached = cache.get<any[]>(cacheKey);
    if (cached) return cached;

    // Only show ACTIVE products - PENDING/SUSPENDED/null are hidden from public
    const baseFilter: any = {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        AND: [
            {
                OR: [
                    { sellerId: null },
                    {
                        seller: {
                            status: SellerStatus.ACTIVE,
                            deletedAt: null
                        }
                    }
                ]
            }
        ]
    };

    if (!searchTerm || searchTerm.trim().length === 0) {
        const products = await prisma.product.findMany({
            where: baseFilter,
            take: limit,
            orderBy: { uploaded: 'desc' },
            include: {
                variants: true,
                seller: { select: { name: true, slug: true, logo: true } }
            }
        });
        cache.set(cacheKey, products, 60);
        return products;
    }

    const products = await prisma.product.findMany({
        where: {
            AND: [
                baseFilter,
                {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                    ]
                }
            ]
        },
        take: limit,
        orderBy: { uploaded: 'desc' },
        include: {
            variants: true,
            seller: { select: { name: true, slug: true, logo: true } }
        }
    });

    cache.set(cacheKey, products, 60);
    return products;
};

export const getProductById = async (productId: string) => {
    const parsedId = parseInt(productId);

    if (isNaN(parsedId)) {
        throw new ErrorHandler.ValidationError([{
            message: "Invalid product ID",
            path: ['productId']
        }]);
    }

    const cacheKey = `product:detail:${parsedId}`;
    const cached = cache.get<any>(cacheKey);
    if (cached) return cached;

    const product = await prisma.product.findUnique({
        where: { uid: parsedId },
        include: {
            variants: true,
            seller: { select: { 
                uid: true, 
                name: true, 
                slug: true, 
                status: true,
                rating: true,
                freeShippingEnabled: true,
                freeShippingThreshold: true,
                meetUpPoint: true,
                selfDeliveryEnabled: true
            } }
        }
    });

    if (!product || product.deletedAt) { // Check deletedAt
        throw new ErrorHandler.NotFoundError('Product', productId);
    }

    cache.set(cacheKey, product, 30);
    return product;
};

export const updateProduct = async (productId: string, input: unknown, user?: AuthPayload) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ErrorHandler.ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    let parsedInput: ProductInput;
    let calculatedDiscount;
    try {
        parsedInput = productSchema.parse(input);

        if (Number(parsedInput.basePrice) <= 0) {
            throw new ErrorHandler.ValidationError([{ message: "Base price must be greater than 0", path: ['basePrice'] }]);
        }

        calculatedDiscount = Pricing.CalculateDiscount({
            basePrice: Number(parsedInput.basePrice),
            discountedPercentage: parsedInput.discountPercentage
        });
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // Transaction
    const result = await prisma.$transaction(async (tx) => {
        const existingProduct = await tx.product.findUnique({
            where: { uid: parsedId },
            include: { variants: true }
        });

        if (!existingProduct || existingProduct.deletedAt) {
            throw new ErrorHandler.NotFoundError('Product', productId);
        }

        // Ownership Check
        if (user) {
            if (user.role === Role.SELLER) {
                if (existingProduct.sellerId !== user.sellerId) {
                    throw new ErrorHandler.ForbiddenError("You can only edit your own products");
                }

            }
        }

        // Optimistic Locking & Update
        if (parsedInput.version !== undefined) {
            const updateCount = await tx.product.updateMany({
                where: { uid: parsedId, version: parsedInput.version },
                data: {
                    name: parsedInput.name,
                    sku: parsedInput.sku || existingProduct.sku,
                    categories: parsedInput.categories || [],
                    basePrice: parsedInput.basePrice,
                    discountedPrice: calculatedDiscount.discountedPrice ?? null,
                    discountPercentage: parsedInput.discountPercentage ?? null,
                    image: parsedInput.image ?? null,
                    images: parsedInput.images || [],
                    description: parsedInput.description ?? null,
                    tags: parsedInput.tags || [],
                    materials: parsedInput.materials ?? null,
                    metaTitle: parsedInput.metaTitle ?? null,
                    metaDescription: parsedInput.metaDescription ?? null,
                    videoUrl: parsedInput.videoUrl ?? null,
                    shippingFeeOverride: parsedInput.shippingFeeOverride ?? null,
                    isLocalPickupAllowed: parsedInput.isLocalPickupAllowed ?? false,
                    localPickupInstructions: parsedInput.localPickupInstructions ?? null,
                    processingTime: parsedInput.processingTime ?? null,
                    fulfillmentType: parsedInput.fulfillmentType ?? 'READY_TO_SHIP',
                    isCustomOrderAllowed: parsedInput.isCustomOrderAllowed ?? false,
                    customOrderInstructions: parsedInput.customOrderInstructions ?? null,
                    careInstructions: parsedInput.careInstructions ?? null,
                    minOrderQty: parsedInput.minOrderQty ? Number(parsedInput.minOrderQty) : null,
                    maxOrderQty: parsedInput.maxOrderQty ? Number(parsedInput.maxOrderQty) : null,
                    isBundle: parsedInput.isBundle ?? false,
                    bundleQuantity: parsedInput.bundleQuantity ? Number(parsedInput.bundleQuantity) : null,
                    isCodAllowed: parsedInput.isCodAllowed ?? true,
                    version: { increment: 1 }
                }
            });

            if (updateCount.count === 0) {
                // Check if it exists or if it was just a version mismatch
                const current = await tx.product.findUnique({ where: { uid: parsedId } });
                if (!current || current.deletedAt) {
                    throw new ErrorHandler.NotFoundError('Product', productId);
                }
                throw new ErrorHandler.ConflictError("The product has been modified by another user. Reload and try again.");
            }
        } else {
            // No version provided, just update and force increment
            await tx.product.update({
                where: { uid: parsedId },
                data: {
                    name: parsedInput.name,
                    sku: parsedInput.sku || existingProduct.sku,
                    categories: parsedInput.categories || [],
                    basePrice: parsedInput.basePrice,
                    discountedPrice: calculatedDiscount.discountedPrice ?? null,
                    discountPercentage: parsedInput.discountPercentage ?? null,
                    image: parsedInput.image ?? null,
                    images: parsedInput.images || [],
                    description: parsedInput.description ?? null,
                    tags: parsedInput.tags || [],
                    materials: parsedInput.materials ?? null,
                    metaTitle: parsedInput.metaTitle ?? null,
                    metaDescription: parsedInput.metaDescription ?? null,
                    videoUrl: parsedInput.videoUrl ?? null,
                    shippingFeeOverride: parsedInput.shippingFeeOverride ?? null,
                    isLocalPickupAllowed: parsedInput.isLocalPickupAllowed ?? false,
                    localPickupInstructions: parsedInput.localPickupInstructions ?? null,
                    processingTime: parsedInput.processingTime ?? null,
                    fulfillmentType: parsedInput.fulfillmentType ?? 'READY_TO_SHIP',
                    isCustomOrderAllowed: parsedInput.isCustomOrderAllowed ?? false,
                    customOrderInstructions: parsedInput.customOrderInstructions ?? null,
                    careInstructions: parsedInput.careInstructions ?? null,
                    minOrderQty: parsedInput.minOrderQty ? Number(parsedInput.minOrderQty) : null,
                    maxOrderQty: parsedInput.maxOrderQty ? Number(parsedInput.maxOrderQty) : null,
                    isBundle: parsedInput.isBundle ?? false,
                    bundleQuantity: parsedInput.bundleQuantity ? Number(parsedInput.bundleQuantity) : null,
                    isCodAllowed: parsedInput.isCodAllowed ?? true,
                    version: { increment: 1 }
                }
            });
        }

        const updatedProduct = await tx.product.findUniqueOrThrow({
            where: { uid: parsedId }
        });

        // Recreate Options
        await tx.productOption.deleteMany({
            where: { productId: parsedId }
        });
        
        const createdOptionsMap: Record<string, Record<string, number>> = {};
        if (parsedInput.productOptions && parsedInput.productOptions.length > 0) {
            for (let i = 0; i < parsedInput.productOptions.length; i++) {
                const opt = parsedInput.productOptions[i];
                const createdOption = await tx.productOption.create({
                    data: {
                        productId: parsedId,
                        name: opt!.name,
                        position: opt!.position || i,
                    }
                });
                createdOptionsMap[opt!.name] = {};
                for (const val of opt!.values) {
                    const createdVal = await tx.productOptionValue.create({
                        data: {
                            optionId: createdOption.uid,
                            value: val.value,
                            imageUrl: val.imageUrl || null
                        }
                    });
                    createdOptionsMap[opt!.name]![val.value] = createdVal.uid;
                }
            }
        }

        // Update Variants (same logic as before)
        const inputVariants = parsedInput.variants || [];
        const inputVariantIds = inputVariants
            .filter(v => v.uid)
            .map(v => v.uid);

        await tx.productVariant.deleteMany({
            where: {
                productId: parsedId,
                uid: { notIn: inputVariantIds as number[] }
            }
        });

        for (const variant of inputVariants) {
            const optionValueIds = [];
            if (variant.options) {
                for (const [optName, optVal] of Object.entries(variant.options) as [string, string][]) {
                    if (createdOptionsMap[optName] && createdOptionsMap[optName][optVal]) {
                        optionValueIds.push(createdOptionsMap[optName][optVal]);
                    }
                }
            }

            if (variant.uid) {
                await tx.productVariant.update({
                    where: { uid: variant.uid },
                    data: {
                        name: variant.name,
                        stock: variant.stock,
                        price: variant.price ? Number(variant.price) : null,
                        discountPercentage: variant.discountPercentage ? Number(variant.discountPercentage) : null,
                        discountedPrice: Pricing.calculateVariantStoredDiscountedPrice(
                            Number(variant.price),
                            Number(variant.discountPercentage),
                            Number(parsedInput.discountPercentage)
                        ),
                        images: variant.images || [],
                        isEnabled: variant.isEnabled !== false,
                        sku: variant.sku || `${updatedProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                        optionValues: {
                            set: optionValueIds.map(id => ({ uid: id }))
                        }
                    } as any
                });
            } else {
                await tx.productVariant.create({
                    data: {
                        productId: parsedId,
                        name: variant.name,
                        stock: variant.stock,
                        price: variant.price ? Number(variant.price) : null,
                        discountPercentage: variant.discountPercentage ? Number(variant.discountPercentage) : null,
                        discountedPrice: Pricing.calculateVariantStoredDiscountedPrice(
                            Number(variant.price),
                            Number(variant.discountPercentage),
                            Number(parsedInput.discountPercentage)
                        ),
                        images: variant.images || [],
                        isEnabled: variant.isEnabled !== false,
                        sku: variant.sku || `${updatedProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                        optionValues: optionValueIds.length > 0 ? {
                            connect: optionValueIds.map(id => ({ uid: id }))
                        } : undefined
                    } as any
                });
            }
        }

        return updatedProduct;
    });

    // Emit Realtime Update
    supabaseService.emit('product:updated', { productId: parsedId, version: result.version });
    cache.deletePattern('product:');

    return result;
};

export const deleteProduct = async (productId: string, user?: AuthPayload) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ErrorHandler.ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
            where: { uid: parsedId }
        });

        if (!product || product.deletedAt) {
            throw new ErrorHandler.NotFoundError('Product', productId);
        }

        // Ownership Check
        if (user) {
            if (user.role === Role.SELLER) {
                if (product.sellerId !== user.sellerId) {
                    throw new ErrorHandler.ForbiddenError("You can only delete your own products");
                }
            }
        }

        // Soft Delete
        return await tx.product.update({
            where: { uid: parsedId },
            data: {
                deletedAt: new Date(),
                deletedBy: user ? user.id : null
            }
        });
    });

    cache.deletePattern('product:');
    return result;
}; 
import { SearchDataSchema, calculateRelevanceScore } from '../utils/recommendationEngine.js';

export const getRecommendedProducts = async (userId?: number, searchDataStr?: string) => {
    // 1. Validate search data
    let searchData: any[] = [];
    if (searchDataStr) {
        try {
            const parsed = JSON.parse(searchDataStr);
            const validation = SearchDataSchema.safeParse(parsed);
            if (validation.success) {
                searchData = validation.data;
            } else {
                console.warn('Invalid searchData format for recommendations');
            }
        } catch (e) {
            console.warn('Malformed searchData JSON for recommendations');
        }
    }

    // 2. Fetch past purchase categories and purchased item IDs
    let purchaseCategories: string[] = [];
    let purchasedProductIds: number[] = [];

    if (userId) {
        const orders = await prisma.order.findMany({
            where: { customerId: userId },
            select: { products: true }
        });
        
        for (const order of orders) {
            try {
                // products is a JSON string of order items (or similar structure depending on schema)
                // Let's get the purchased product IDs from OrderItem if it exists in schema
                const orderItems = await prisma.orderItem.findMany({
                    where: { orderId: { in: orders.map((o: any) => o.uid) } },
                    include: { product: true }
                });
                
                for (const item of orderItems) {
                    if (item.productId) purchasedProductIds.push(item.productId);
                    if (item.product?.categories) {
                        purchaseCategories.push(...item.product.categories);
                    }
                }
                break; // orderItems fetch got all of them at once
            } catch (e) {
                // Fallback if structure is different
                console.error("Error fetching order items for recommendations", e);
            }
        }
    }
    
    // Deduplicate
    purchaseCategories = [...new Set(purchaseCategories)];
    purchasedProductIds = [...new Set(purchasedProductIds)];

    // 3. Cache Check
    // Create a stable cache key
    let cacheKey = 'product:recommendations:coldstart';
    if (userId || searchData.length > 0) {
        const searchHash = Buffer.from(JSON.stringify(searchData)).toString('base64');
        cacheKey = `product:recommendations:user:${userId || 'anon'}:searchHash:${searchHash}`;
    }

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // 4. Fetch Products
    // We only fetch ACTIVE products that are in stock
    const products = await prisma.product.findMany({
        where: {
            status: ProductStatus.ACTIVE,
            deletedAt: null,
            ...(purchasedProductIds.length > 0 ? { uid: { notIn: purchasedProductIds } } : {})
        },
        select: {
            uid: true,
            name: true,
            categories: true,
            tags: true,
            description: true,
            basePrice: true,
            discountedPrice: true,
            discountPercentage: true,
            image: true,
            images: true,
            soldCount: true,
            uploaded: true,
            isBundle: true,
            bundleQuantity: true,
            variants: true
        }
    });

    // Filter out-of-stock
    let inStockProducts = products.filter((p: any) => {
        // If it has variants, check variant stock, else check if it's base stock (if schema applies)
        const hasStock = !p.variants || p.variants.length === 0 || p.variants.some((v: any) => v.stock > 0 && v.isEnabled);
        return hasStock;
    });

    // 5. Score Products
    let scoredProducts = inStockProducts.map(product => {
        const score = calculateRelevanceScore(
            {
                uid: product.uid,
                categories: product.categories,
                tags: product.tags,
                name: product.name,
                description: product.description
            },
            purchaseCategories,
            searchData
        );
        return { product, score };
    });

    // Filter only those with a score > 0
    let recommended = scoredProducts.filter(p => p.score > 0).sort((a, b) => b.score - a.score).map(p => p.product);

    // 6. Cold-Start / Empty Fallback
    if (recommended.length === 0) {
        // Fallback to top bestsellers / new arrivals
        recommended = inStockProducts
            .sort((a, b) => {
                // Mix soldCount and recency
                const aAge = Date.now() - new Date(a.uploaded).getTime();
                const bAge = Date.now() - new Date(b.uploaded).getTime();
                const aScore = a.soldCount * 10 - aAge / (1000 * 60 * 60 * 24);
                const bScore = b.soldCount * 10 - bAge / (1000 * 60 * 60 * 24);
                return bScore - aScore;
            });
    }

    // Limit to top 15
    const finalRecommendations = recommended.slice(0, 15);

    // Save to cache (15 mins = 900 seconds)
    await cache.set(cacheKey, finalRecommendations, 900);

    return finalRecommendations;
};
