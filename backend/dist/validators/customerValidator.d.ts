import { z } from "zod";
export declare const customerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    otp: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const orderSchema: z.ZodObject<{
    customerId: z.ZodNumber;
    products: z.ZodString;
    discount: z.ZodOptional<z.ZodNumber>;
    total: z.ZodNumber;
}, z.core.$strip>;
export declare const customerLoginSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
}, z.core.$strip>;
export declare const customerUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export declare const googleLoginSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
//# sourceMappingURL=customerValidator.d.ts.map