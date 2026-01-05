import { z } from "zod";

// Validator for Upgrade (Just Store Info)
export const sellerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
    location: z.string().optional(),
});

// Validator for Direct Registration (Customer + Seller)
export const registerSellerSchema = sellerSchema.extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});

export type SellerInput = z.infer<typeof sellerSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
