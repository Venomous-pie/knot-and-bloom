import { z } from "zod";

// Validator for Upgrade (Just Store Info)
export const sellerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    socialMediaLink: z.string().min(1, "Social media link is required to verify identity"),
    email: z.string().email().optional(),
    termsAccepted: z.boolean().optional(),
    businessType: z.string().optional(),
    productCategories: z.string().optional(),
    isHandmade: z.boolean().optional(),
    hasPriorExperience: z.boolean().optional(),
    legalName: z.string().min(2, "Legal name is required").optional(), // Making optional in schema to not break existing calls, but will be enforced in frontend
    businessAddress: z.string().min(5, "Full address is required").optional(),
    portfolioLink: z.string().optional(),
    idType: z.string().optional(),
    idNumber: z.string().optional(),
});

// Validator for Direct Registration (Customer + Seller)
export const registerSellerSchema = sellerSchema.extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});

export type SellerInput = z.infer<typeof sellerSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
