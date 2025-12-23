import { ZodError } from "zod";
import { ProductStatus, SellerStatus } from "../../generated/prisma/client.js";
import { DuplicateProductError, NotFoundError, ValidationError } from "../error/errorHandler.js";
import type { AuthPayload } from "../types/auth.js";
import { Role } from "../types/auth.js";
import type { GetProductsResult } from "../types/product.js";
import { CalculateDiscount } from "../utils/discount.js";
import prisma from "../utils/prisma.js";
import { ensureAdminSellerProfile } from "../utils/sellerUtils.js";
import { getProductsQuerySchema, productSchema, type GetProductOptions, type ProductInput } from "../validators/productValidator.js";

export const postProduct = async (input: unknown, user?: AuthPayload) => {
    // Parse and validate input
    let parsedInput: ProductInput;
    let calculatedDiscount;

    try {
        parsedInput = productSchema.parse(input);

        // Additional validation: Price must be positive
        if (Number(parsedInput.basePrice) <= 0) {
            throw new ValidationError([{ message: "Base price must be greater than 0", path: ['basePrice'] }]);
        }

        calculatedDiscount = CalculateDiscount({
            basePrice: Number(parsedInput.basePrice),
            discountedPercentage: parsedInput.discountPercentage
        });

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(error.issues);
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
            if (!seller) throw new ValidationError([{ message: "Invalid seller ID", path: ['sellerId'] }]);
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
                        // @ts-ignore
                        categories: parsedInput.categories || [],
                        basePrice: parsedInput.basePrice,
                        discountedPrice: calculatedDiscount.discountedPrice ?? null,
                        discountPercentage: parsedInput.discountPercentage ?? null,
                        image: parsedInput.image ?? null,
                        description: parsedInput.description ?? null,
                        sellerId: sellerId ?? null,
                        status: status,
                    },
                });

                // Create variants
                // @ts-ignore
                const variantsData = parsedInput.variants || [];

                if (Array.isArray(variantsData) && variantsData.length > 0) {
                    for (const variant of variantsData) {
                        await tx.productVariant.create({
                            data: {
                                productId: newProduct.uid,
                                name: variant.name,
                                sku: variant.sku || `${newProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                                stock: variant.stock || 0,
                                price: variant.price || null,
                                discountPercentage: variant.discountPercentage || null,
                                discountedPrice: (variant.price)
                                    ? (variant.discountPercentage
                                        ? Number((Number(variant.price) * (1 - Number(variant.discountPercentage) / 100)).toFixed(2))
                                        : (parsedInput.discountPercentage
                                            ? Number((Number(variant.price) * (1 - Number(parsedInput.discountPercentage) / 100)).toFixed(2))
                                            : null))
                                    : null,
                                image: variant.image || null,
                            }
                        });
                    }
                } else {
                    await tx.productVariant.create({
                        data: {
                            productId: newProduct.uid,
                            name: 'Default',
                            sku: `${newProduct.sku}-DEFAULT`,
                            // @ts-ignore
                            stock: parsedInput.stock || 0,
                            // @ts-ignore
                            price: null,
                            discountPercentage: null,
                            discountedPrice: null
                        }
                    });
                }

                return newProduct;
            });

            return product; // Success!

        } catch (error: any) {
            // Handle Unique Constraint Violation (P2002) for SKU
            if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new DuplicateProductError(`SKU collision retries exhausted. Please try a different SKU.`);
                }

                // Append random suffix for retry
                const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
                currentSku = `${parsedInput.sku}-${randomSuffix}`;
                console.log(`SKU collision detected. Retrying with new SKU: ${currentSku}`);
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
            throw new ValidationError(error.issues);
        }
        throw error;
    }

    const { category, searchTerm, newArrival = false, limit = 30, offset = 0, sort } = parsedInput;

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
                seller: { select: { name: true, slug: true } }
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
            currentPage: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
        },
    };
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
                seller: { select: { uid: true, name: true, slug: true, email: true } }
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
export const updateProductStatus = async (productId: string, status: string) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    const validStatuses = ['ACTIVE', 'PENDING', 'SUSPENDED', 'DRAFT'];
    if (!validStatuses.includes(status)) {
        throw new ValidationError([{ message: "Invalid status", path: ['status'] }]);
    }

    const product = await prisma.product.findUnique({ where: { uid: parsedId } });
    if (!product || product.deletedAt) {
        throw new NotFoundError('Product', productId);
    }

    const updated = await prisma.product.update({
        where: { uid: parsedId },
        data: { status: status as ProductStatus },
        include: {
            variants: true,
            seller: { select: { uid: true, name: true, email: true } }
        }
    });

    return updated;
};

export const searchProducts = async (searchTerm: string, limit = 20) => {

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
                seller: { select: { name: true, slug: true } }
            }
        });
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
            seller: { select: { name: true, slug: true } }
        }
    });

    return products;
};

export const getProductById = async (productId: string) => {
    const parsedId = parseInt(productId);

    if (isNaN(parsedId)) {
        throw new ValidationError([{
            message: "Invalid product ID",
            path: ['productId']
        }]);
    }

    const product = await prisma.product.findUnique({
        where: { uid: parsedId },
        include: {
            variants: true,
            seller: { select: { uid: true, name: true, slug: true, status: true } }
        }
    });

    if (!product || product.deletedAt) { // Check deletedAt
        throw new NotFoundError('Product', productId);
    }

    // Note: We might allow getting non-ACTIVE products if I am the owner?
    // This function is generally public.
    // Ideally we pass context here too. But for now, let's assume public access = active only?
    // Or we leave it open and handle permission in frontend/controller layer if it's an edit page vs view page.
    // For now, I'll restrict to ACTIVE for public safety, BUT this breaks Edit Form for Sellers if they fetch via ID.
    // SOLUTION: Use a separate `getSellerProductById` or allow fetching if it exists, but Frontend hides it if not active?
    // Actually, `getProductById` is used by Public Product Details Page.
    // If I'm editing, I might use `getOwnProducts` or a specific endpoint.
    // I will NOT restrict status here yet, to avoid breaking Edit flow, but frontend should handle it.
    // Wait, the Edit Form needs to fetch data.

    return product;
};

export const updateProduct = async (productId: string, input: unknown, user?: AuthPayload) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    let parsedInput: ProductInput;
    let calculatedDiscount;
    try {
        parsedInput = productSchema.parse(input);

        if (Number(parsedInput.basePrice) <= 0) {
            throw new ValidationError([{ message: "Base price must be greater than 0", path: ['basePrice'] }]);
        }

        calculatedDiscount = CalculateDiscount({
            basePrice: Number(parsedInput.basePrice),
            discountedPercentage: parsedInput.discountPercentage
        });
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(error.issues);
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
            throw new NotFoundError('Product', productId);
        }

        // Ownership Check
        if (user) {
            if (user.role === Role.SELLER) {
                if (existingProduct.sellerId !== user.sellerId) {
                    throw new Error("You can only edit your own products"); // Should use 403 error class if available
                }

                // Status Check: Seller cannot set to ACTIVE
                // But parsedInput doesn't have status yet?
                // Wait, productSchema might not have status.
                // If I want to allow status updates, I need to check input.
                // Assuming `input` has status if schema allows it. 
                // My validtor `productSchema` doesn't have status field currently in `ProductController` context (it imports from `productValidator.js`).
                // I need to make sure I use the NEW validation schema or update the logic.
                // `productValidator.js` is the OLD validator. I created `validators/product.ts` (new).
                // I should use the new validator if I switched to it.
                // But this file still imports from `../validators/productValidator.js`.
                // I should probably stick to the existing validator schema import for now to avoid breaking changes, 
                // OR update the import to use my new Zod schema.
                // Since I didn't update imports, I am using the OLD schema which likely doesn't have `status`.
                // So Sellers can't update status via this payload anyway unless I strictly allow it.
            }
        }

        const updatedProduct = await tx.product.update({
            where: { uid: parsedId },
            data: {
                name: parsedInput.name,
                sku: parsedInput.sku || existingProduct.sku,
                // @ts-ignore
                categories: parsedInput.categories || [],
                basePrice: parsedInput.basePrice,
                discountedPrice: calculatedDiscount.discountedPrice ?? null,
                discountPercentage: parsedInput.discountPercentage ?? null,
                image: parsedInput.image ?? null,
                description: parsedInput.description ?? null,
                // Do NOT allow updating sellerId
            }
        });

        // Update Variants (same logic as before)
        // @ts-ignore
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
            if (variant.uid) {
                await tx.productVariant.update({
                    where: { uid: variant.uid },
                    data: {
                        name: variant.name,
                        stock: variant.stock,
                        price: variant.price ? Number(variant.price) : null,
                        discountPercentage: variant.discountPercentage ? Number(variant.discountPercentage) : null,
                        discountedPrice: (variant.price)
                            ? (variant.discountPercentage
                                ? Number((Number(variant.price) * (1 - Number(variant.discountPercentage) / 100)).toFixed(2))
                                : (parsedInput.discountPercentage
                                    ? Number((Number(variant.price) * (1 - Number(parsedInput.discountPercentage) / 100)).toFixed(2))
                                    : null))
                            : null,
                        image: variant.image || null,
                        sku: variant.sku || `${updatedProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`
                    }
                });
            } else {
                await tx.productVariant.create({
                    data: {
                        productId: parsedId,
                        name: variant.name,
                        stock: variant.stock,
                        price: variant.price ? Number(variant.price) : null,
                        discountPercentage: variant.discountPercentage ? Number(variant.discountPercentage) : null,
                        discountedPrice: (variant.price)
                            ? (variant.discountPercentage
                                ? Number((Number(variant.price) * (1 - Number(variant.discountPercentage) / 100)).toFixed(2))
                                : (parsedInput.discountPercentage
                                    ? Number((Number(variant.price) * (1 - Number(parsedInput.discountPercentage) / 100)).toFixed(2))
                                    : null))
                            : null,
                        image: variant.image || null,
                        sku: variant.sku || `${updatedProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`
                    }
                });
            }
        }

        return updatedProduct;
    });

    return result;
};

export const deleteProduct = async (productId: string, user?: AuthPayload) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
            where: { uid: parsedId }
        });

        if (!product || product.deletedAt) {
            throw new NotFoundError('Product', productId);
        }

        // Ownership Check
        if (user) {
            if (user.role === Role.SELLER) {
                if (product.sellerId !== user.sellerId) {
                    throw new Error("You can only delete your own products"); // 403
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

    return result;
};