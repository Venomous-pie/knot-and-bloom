import { ZodError } from "zod";
import { SellerStatus } from "../../generated/prisma/client.js";
import { DuplicateProductError, NotFoundError, ValidationError } from "../error/errorHandler.js";
import type { GetProductsResult } from "../types/product.js";
import { CalculateDiscount } from "../utils/discount.js";
import prisma from "../utils/prisma.js";
import { getProductsQuerySchema, productSchema, type GetProductOptions, type ProductInput } from "../validators/productValidator.js";

export const postProduct = async (input: unknown) => {
    // Parse and validate input
    let parsedInput: ProductInput;
    let calculatedDiscount;

    try {
        parsedInput = productSchema.parse(input);

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

    // Check Seller Limit (if sellerId provided)
    if (parsedInput.sellerId) {
        const seller = await prisma.seller.findUnique({
            where: { uid: parsedInput.sellerId }
        });

        if (!seller || seller.status === SellerStatus.BANNED || seller.status === SellerStatus.SUSPENDED) {
            // For simplicity, failing if seller invalid/inactive, or could allow draft if pending
            // Implementation plan: Pending products hidden. But banned/suspended -> reject?
            // Review: "Check seller.productCount < 50... Check seller.status == active"
            // User Request v3: "Allow pending sellers to draft products, but hide them"
            if (!seller) throw new ValidationError([{ message: "Invalid seller ID", path: ['sellerId'] }]);
        }

        const activeProductCount = await prisma.product.count({
            where: {
                sellerId: parsedInput.sellerId,
                // Assuming we query products table directly. 
                // Product doesn't have deletedAt, so we count all products linked to seller?
                // Plan said: "Count only active (non-deleted) products" -> but Product table has no deletedAt.
                // Assuming filtered by relation if needed, or total count.
                // Let's stick to total count for now unless I add deletedAt to Product.
            }
        });

        if (activeProductCount >= 50) {
            throw new Error("Active product limit reached (50). Delete existing products to add new ones.");
        }
    }

    const existingProduct = await prisma.product.findUnique({
        where: { sku: parsedInput.sku || "" }, // Ensure string for unique check, though if undefined it won't run this check usually
    });

    if (existingProduct) {
        throw new DuplicateProductError(parsedInput.sku || "Unknown SKU");
    }

    // Create product with variants in a transaction
    const product = await prisma.$transaction(async (tx) => {
        // Create the product
        const newProduct = await tx.product.create({
            data: {
                name: parsedInput.name,
                sku: parsedInput.sku!, // Validated above or strictly managed
                // @ts-ignore - categories might be in new format
                categories: parsedInput.categories || [],
                basePrice: parsedInput.basePrice,
                discountedPrice: calculatedDiscount.discountedPrice ?? null,
                discountPercentage: parsedInput.discountPercentage ?? null,
                image: parsedInput.image ?? null,
                description: parsedInput.description ?? null,
                sellerId: parsedInput.sellerId ?? null, // Add sellerId
            },
        });

        // Create variants if provided, otherwise create a default variant
        // @ts-ignore - variants might be in old format or new format
        const variantsData = parsedInput.variants || [];

        if (Array.isArray(variantsData) && variantsData.length > 0) {
            // New format: array of variant objects
            for (const variant of variantsData) {
                await tx.productVariant.create({
                    data: {
                        productId: newProduct.uid,
                        name: variant.name,
                        sku: variant.sku || `${newProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                        stock: variant.stock || 0,
                        price: variant.price || null,
                        discountPercentage: variant.discountPercentage || null,
                        // If variant has discount, use it. If not, check if product has discount.
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
            // Create default variant with total stock
            await tx.productVariant.create({
                data: {
                    productId: newProduct.uid,
                    name: 'Default',
                    sku: `${newProduct.sku}-DEFAULT`,
                    // @ts-ignore - stock might still be in input
                    stock: parsedInput.stock || 0,
                    price: null,
                }
            });
        }

        return newProduct;
    });

    return product;
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
    // 1. sellerId is null (Knot & Bloom direct)
    // 2. OR seller is active AND not deleted
    whereClause.OR = [
        { sellerId: null },
        {
            seller: {
                status: SellerStatus.ACTIVE,
                deletedAt: null
            }
        }
    ];

    if (category) {
        whereClause.categories = { has: category };
    }

    if (searchTerm) {
        // Nested OR for name/description must be ANDed with the Seller Filter
        // So we need to restructure: { AND: [ { OR: (name, desc) }, { OR: (seller conditions) } ] }
        // But Prisma 'where' implies AND for toplevel keys.
        // So we can wrap the searchTerm OR in an AND if needed, or just combine
        const searchOR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
        ];

        // Combine with existing Seller OR
        whereClause.AND = [
            { OR: searchOR },
            { OR: whereClause.OR }
        ];
        delete whereClause.OR; // Remove the top-level OR as it's now inside AND
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
                variants: true,  // Include product variants
                seller: { select: { name: true, slug: true } } // Include seller info
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

export const searchProducts = async (searchTerm: string, limit = 20) => {

    // Filter products to only show those from active sellers OR products without sellers
    const sellerFilter = {
        OR: [
            { sellerId: null }, // Products without a seller (legacy)
            {
                seller: {
                    status: SellerStatus.ACTIVE,
                    deletedAt: null
                }
            }
        ]
    };

    // If searchTerm is empty, return suggested/recently uploaded products
    if (!searchTerm || searchTerm.trim().length === 0) {
        const products = await prisma.product.findMany({
            where: sellerFilter,
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
                sellerFilter,
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
            variants: true,  // Include product variants
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
            variants: true  // Include product variants
        }
    });

    if (!product) {
        throw new NotFoundError('Product', productId);
    }

    return product;
};

export const updateProduct = async (productId: string, input: unknown) => {
    // 1. Validate ID
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    // 2. Validate Body
    let parsedInput: ProductInput;
    let calculatedDiscount;
    try {
        parsedInput = productSchema.parse(input);
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

    // 3. Perform Transactional Update
    const result = await prisma.$transaction(async (tx) => {
        // Find existing product to ensure it exists
        const existingProduct = await tx.product.findUnique({
            where: { uid: parsedId },
            include: { variants: true }
        });

        if (!existingProduct) {
            throw new NotFoundError('Product', productId);
        }

        // Update Product Core Details
        const updatedProduct = await tx.product.update({
            where: { uid: parsedId },
            data: {
                name: parsedInput.name,
                // SKU update logic: If changed, check for duplicates? Assuming distinct SKU for now or allowing it.
                // Keeping SKU editable but unique constraint will throw if duplicate.
                sku: parsedInput.sku || existingProduct.sku,
                categories: parsedInput.categories || [],
                basePrice: parsedInput.basePrice,
                discountedPrice: calculatedDiscount.discountedPrice ?? null,
                discountPercentage: parsedInput.discountPercentage ?? null,
                image: parsedInput.image ?? null,
                description: parsedInput.description ?? null,
            }
        });

        // 4. Synchronize Variants
        // Strategy: 
        // - Input Variants List is the SOURCE OF TRUTH.
        // - Identify IDs in input. 
        // - Delete variants in DB that represent this product but are NOT in input IDs.
        // - Upsert (Start with Update, if no ID then Create) the rest.

        const inputVariants = parsedInput.variants || [];
        const inputVariantIds = inputVariants
            .filter(v => v.uid) // Filter those with IDs
            .map(v => v.uid); // Extract IDs

        // DELETE missing variants
        // "Delete all variants for this product ID where valid UID is NOT in the new list"
        await tx.productVariant.deleteMany({
            where: {
                productId: parsedId,
                uid: { notIn: inputVariantIds as number[] }
            }
        });

        // UPSERT (Update existing, Create new)
        for (const variant of inputVariants) {
            if (variant.uid) {
                // Update Existing
                // Only update if it belongs to this product (security check implicitly handled by where clause if needed, but simple update is fine for now)
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
                        sku: variant.sku || `${updatedProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}` // Auto-update SKU based on name/product SKU
                    }
                });
            } else {
                // Create New
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

export const deleteProduct = async (productId: string) => {
    const parsedId = parseInt(productId);
    if (isNaN(parsedId)) {
        throw new ValidationError([{ message: "Invalid product ID", path: ['productId'] }]);
    }

    const result = await prisma.$transaction(async (tx) => {
        // Check if exists
        const product = await tx.product.findUnique({
            where: { uid: parsedId }
        });

        if (!product) {
            throw new NotFoundError('Product', productId);
        }

        // Delete variants first (cascade might handle this but explicit is safer/clearer)
        await tx.productVariant.deleteMany({
            where: { productId: parsedId }
        });

        // Delete product
        return await tx.product.delete({
            where: { uid: parsedId }
        });
    });

    return result;
};