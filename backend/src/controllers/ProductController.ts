import { base64, ZodError } from "zod";
import prisma from "../utils/prisma.js";
import { productSchema, type ProductInput } from "../validators/productValidator.js";
import { getProductsQuerySchema, type GetProductOptions } from "../validators/productValidator.js";
import type { GetProductsResult, ProductSKU } from "../types/product.js"
import { ValidationError, DuplicateProductError } from "../error/errorHandler.js";
import { SKUGenerator } from "../services/skuGenerator.js";
import { ProductDescriptionGenerator } from "../services/productDescriptionGenerator.js";
import { CalculateDiscount } from "../utils/discount.js";

// Admin sides
export const postProduct = async (input: unknown) => {
    // Parse and validate input
    let parsedInput: ProductInput;
    let generatedSku;
    let generatedDescription;
    let calculatedDiscount;

    try {
        parsedInput = productSchema.parse(input);

        generatedSku = await SKUGenerator({
            category: parsedInput.category,
            variants: parsedInput.variants
        });

        generatedDescription = await ProductDescriptionGenerator({
            name: parsedInput.name,
            category: parsedInput.category,
            variants: parsedInput.variants,
            basePrice: String(parsedInput.basePrice),
            discountedPrice: String(parsedInput.discountedPrice)
        });

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
            sku: generatedSku,
            category: parsedInput.category,
            variants: parsedInput.variants ?? null,
            basePrice: parsedInput.basePrice,
            discountedPrice: calculatedDiscount.discountedPrice ?? null,
            discountPercentage: parsedInput.discountPercentage ?? null,
            stock: parsedInput.stock ?? 0,
            image: parsedInput.image ?? null,
            description: generatedDescription ?? null,
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

    const { category, searchTerm, limit = 30, offset = 0, } = parsedInput;

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