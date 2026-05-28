import { z } from "zod";
export declare const addressSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    fullName: z.ZodString;
    phone: z.ZodString;
    streetAddress: z.ZodString;
    aptSuite: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    region: z.ZodOptional<z.ZodString>;
    province: z.ZodOptional<z.ZodString>;
    barangay: z.ZodOptional<z.ZodString>;
    stateProvince: z.ZodOptional<z.ZodString>;
    postalCode: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type AddressInput = z.infer<typeof addressSchema>;
//# sourceMappingURL=addressValidator.d.ts.map