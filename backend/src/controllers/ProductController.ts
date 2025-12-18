import { ZodError } from "zod";
import { DuplicateProductError, ValidationError } from "../error/errorHandler.js";
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

    const product = await prisma.product.create({
        data: {
            name: parsedInput.name,
            sku: parsedInput.sku,
            category: parsedInput.category,
            variants: parsedInput.variants ?? null,
            basePrice: parsedInput.basePrice,
            discountedPrice: calculatedDiscount.discountedPrice ?? null,
            discountPercentage: parsedInput.discountPercentage ?? null,
            stock: parsedInput.stock ?? 0,
            image: parsedInput.image ?? null,
            description: parsedInput.description ?? null,
        },
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
        orderBy: { uploaded: 'desc' }
    });

    return products;
};