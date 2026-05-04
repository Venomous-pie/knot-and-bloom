import { z } from 'zod';

// Schema for updating products - allows optional IDs
export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().nullish(),
    categories: z.array(z.string()).min(1, "At least one category is required"),
    // Variants can now have an optional uid for updates
    variants: z.array(z.object({
        uid: z.number().optional(), // ID is optional for new variants, required for existing (but validation handled in logic)
        name: z.string(),
        sku: z.string().optional(),
        stock: z.coerce.number().int().min(0),
        price: z.any().optional(), // Allow string or number, parse later
        discountPercentage: z.coerce.number().min(0).max(100).optional(),
        images: z.array(z.string()).optional(),
        materials: z.string().optional()
    })).optional(),
    basePrice: z.number().positive("Base price must be positive"),
    discountPercentage: z.number().min(0).max(100).optional(),
    stock: z.number().int().min(0).optional(),
    image: z.string().nullish(),
    description: z.string().nullish(),
    tags: z.array(
        z.string()
            .min(2, "Each tag must be at least 2 characters")
            .max(30, "Each tag must be 30 characters or fewer")
            .regex(/^[a-z0-9\s\-]+$/, "Tags must contain only lowercase letters, numbers, spaces, or hyphens")
            .refine(val => !/^\d+$/.test(val), "Tags cannot be only numbers")
    ).max(10, "Maximum of 10 tags allowed").optional(),
    materials: z.string().nullish(),
    metaTitle: z.string().max(70, "Meta title must be 70 characters or fewer").nullish(),
    metaDescription: z.string().max(160, "Meta description must be 160 characters or fewer").nullish(),
    sellerId: z.number().int().optional(),
    version: z.number().int().optional(),
});

export const getProductsQuerySchema = z.object({
    category: z.string().optional(),
    searchTerm: z.string().optional(),
    newArrival: z.coerce.boolean().optional().default(false),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'bestselling']).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type GetProductOptions = z.infer<typeof getProductsQuerySchema>;