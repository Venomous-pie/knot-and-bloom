import { z } from "zod";
export const addressSchema = z.object({
    label: z.string().max(30).optional(),
    fullName: z.string().min(2).max(100),
    phone: z.string().regex(/^(\+63|0)[0-9]{9,10}$/, { message: "Phone must be valid PH format (09XX-XXX-XXXX or +639XX-XXX-XXXX)" }),
    streetAddress: z.string().min(5).max(200),
    aptSuite: z.string().max(50).optional(),
    city: z.string().min(2).max(50),
    region: z.string().optional(),
    province: z.string().optional(),
    barangay: z.string().optional(),
    stateProvince: z.string().max(50).optional(),
    postalCode: z.string().regex(/^\d{3,4}$/, { message: "Postal code must be 3-4 digits" }),
    country: z.string().default("Philippines"),
    isDefault: z.boolean().optional(),
});
//# sourceMappingURL=addressValidator.js.map