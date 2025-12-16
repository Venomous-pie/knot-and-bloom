import { z } from 'zod';

export const productSchema = z.object({
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    variants: z.string().optional(),
    basePrice: z.union([
        z.string(),
        z.number()
    ]),
    discountedPrice: z.union([
        z.string(),
        z.number()
    ]).optional(),
    stock: z.number().optional(),
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