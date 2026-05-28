import { z } from "zod";
// Base shape (no refinements — safe to extend)
const sellerBaseSchema = z.object({
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
    legalName: z.string().min(2, "Legal name is required"),
    businessAddress: z.string().min(5, "Full address is required"),
    portfolioLink: z.string().optional(),
    idType: z.string().optional(),
    idNumber: z.string().optional(),
});
// Conditional refinement: idNumber required when idType is provided
const idNumberRefinement = (data) => !data.idType || (data.idNumber && data.idNumber.trim().length > 0);
const idNumberRefinementConfig = {
    message: "ID Number is required when an ID Type is selected",
    path: ["idNumber"],
};
// Validator for Upgrade (Just Store Info)
export const sellerSchema = sellerBaseSchema.refine(idNumberRefinement, idNumberRefinementConfig);
// Validator for Direct Registration (Customer + Seller)
export const registerSellerSchema = sellerBaseSchema.extend({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
}).refine(idNumberRefinement, idNumberRefinementConfig);
//# sourceMappingURL=sellerValidator.js.map