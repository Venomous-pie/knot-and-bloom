import { z } from 'zod';

export const productSchema = z.object({
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    variants: z.string().optional(),
    basePrice: z.coerce.number().positive(),
    discountedPrice: z.coerce.number().positive().optional(),
    discountPercentage: z.coerce.number().min(0).max(100).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    image: z.string().optional(),
    description: z.string().optional(),
});

export const getProductsQuerySchema = z.object({
    category: z.string().optional(),
    searchTerm: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type GetProductOptions = z.infer<typeof getProductsQuerySchema>;