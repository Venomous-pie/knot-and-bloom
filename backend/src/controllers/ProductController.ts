import { ZodError } from "zod";
import { DuplicateProductError, NotFoundError, ValidationError } from "../error/errorHandler.js";
import type { GetProductsResult } from "../types/product.js";
import { CalculateDiscount } from "../utils/discount.js";
import prisma from "../utils/prisma.js";
import { getProductsQuerySchema, productSchema, type GetProductOptions, type ProductInput } from "../validators/productValidator.js";

// Admin sides
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

    const existingProduct = await prisma.product.findUnique({
        where: { sku: parsedInput.sku },
    });

    if (existingProduct) {
        throw new DuplicateProductError(parsedInput.sku);
    }

    // Create product with variants in a transaction
    const product = await prisma.$transaction(async (tx) => {
        // Create the product
        const newProduct = await tx.product.create({
            data: {
                name: parsedInput.name,
                sku: parsedInput.sku,
                // @ts-ignore - categories might be in new format
                categories: parsedInput.categories || [],
                basePrice: parsedInput.basePrice,
                discountedPrice: calculatedDiscount.discountedPrice ?? null,
                discountPercentage: parsedInput.discountPercentage ?? null,
                image: parsedInput.image ?? null,
                description: parsedInput.description ?? null,
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
                        sku: `${newProduct.sku}-${variant.name.toUpperCase().replace(/\s+/g, '-')}`,
                        stock: variant.stock || 0,
                        price: variant.price || null,
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

//Customer sides
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

    const { category, searchTerm, newArrival = false, limit = 30, offset = 0, } = parsedInput;

    const whereClause: any = {};

    if (category) {
        whereClause.category = category;
    }

    if (searchTerm) {
        whereClause.OR = [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
        ];
    }

    if (newArrival) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        whereClause.uploaded = {
            gte: sevenDaysAgo,
        };
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where: whereClause,
            take: limit,
            skip: offset,
            orderBy: { uploaded: 'desc' },
            include: {
                variants: true  // Include product variants
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
    if (!searchTerm || searchTerm.trim().length === 0) {
        throw new ValidationError([{
            message: "Search term is required",
            path: ['searchTerm']
        }]);
    }

    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { category: { contains: searchTerm, mode: 'insensitive' } }
            ]
        },
        take: limit,
        orderBy: { uploaded: 'desc' },
        include: {
            variants: true  // Include product variants
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