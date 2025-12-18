import { z } from 'zod';

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().optional(),
    categories: z.array(z.string()).min(1, "At least one category is required"), // Changed to array
    variants: z.any().optional(), // Accept any format for now
    basePrice: z.number().positive("Base price must be positive"),
    discountPercentage: z.number().min(0).max(100).optional(),
    stock: z.number().int().min(0).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
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