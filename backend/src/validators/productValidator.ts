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
        stock: z.coerce.number().int().min(0),
        price: z.any().optional(), // Allow string or number, parse later
        image: z.string().nullish()
    })).optional(),
    basePrice: z.number().positive("Base price must be positive"),
    discountPercentage: z.number().min(0).max(100).optional(),
    stock: z.number().int().min(0).optional(),
    image: z.string().nullish(),
    description: z.string().nullish(),
});

export const getProductsQuerySchema = z.object({
    category: z.string().optional(),
    searchTerm: z.string().optional(),
    newArrival: z.coerce.boolean().optional().default(false),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type GetProductOptions = z.infer<typeof getProductsQuerySchema>;