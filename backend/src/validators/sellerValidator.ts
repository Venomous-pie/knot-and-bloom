import { z } from "zod";

// Base shape (no refinements — safe to extend)
const sellerBaseSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
    location: z.string().optional(),
    phone: z.string().optional(),
    socialMediaLink: z.string().optional(),
    sampleItems: z.array(z.string()).min(1, "At least one sample item is required"),
    salesChannels: z.array(z.string()).optional(),
    monthlyOrders: z.string().optional(),
    email: z.string().email().optional(),
    termsAccepted: z.boolean().optional(),
    businessType: z.string().optional(),
    productCategories: z.union([z.array(z.string()), z.string()]).optional(),
    isHandmade: z.boolean().optional(),
    hasPriorExperience: z.boolean().optional(),
    legalName: z.string().min(2, "Legal name is required"),
    businessAddress: z.string().min(5, "Full address is required"),
    portfolioLink: z.string().min(2, "Personal social media link is required"),
    idType: z.string().min(2, "ID Type is required"),
    idNumber: z.string().min(4, "ID Number is too short").max(35, "ID Number is too long"),
    idPhotos: z.array(z.string()).min(1, "At least one ID Photo is required"),
});

// Validator for Upgrade (Just Store Info)
export const sellerSchema = sellerBaseSchema;

// Validator for Direct Registration (Customer + Seller)
export const registerSellerSchema = sellerBaseSchema.extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
});

export type SellerInput = z.infer<typeof sellerSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
