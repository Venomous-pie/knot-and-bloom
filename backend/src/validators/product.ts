import { z } from 'zod';

const variantSchema = z.object({
    uid: z.number().optional(),
    name: z.string().min(1, "Variant name is required"),
    sku: z.string().optional(),
    stock: z.number().int().nonnegative().default(0),
    price: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    image: z.string().optional()
});

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(3, "Name must be at least 3 characters").max(200),
        description: z.string().max(5000).optional(),
        basePrice: z.number().positive("Base price must be greater than 0"),
        categories: z.array(z.string()).min(1, "At least one category is required"),
        discountPercentage: z.number().min(0).max(100).optional(),
        image: z.string().optional(),
        sellerId: z.number().optional(),
        variants: z.array(variantSchema).optional(),
        stock: z.number().int().nonnegative().optional()
    })
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z.string().min(3).max(200).optional(),
        description: z.string().max(5000).optional(),
        basePrice: z.number().positive().optional(),
        categories: z.array(z.string()).min(1).optional(),
        discountPercentage: z.number().min(0).max(100).optional(),
        image: z.string().optional(),
        status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
        variants: z.array(variantSchema).optional(),
        stock: z.number().int().nonnegative().optional()
    })
});
