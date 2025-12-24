import { z } from "zod";

export const customerSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string(),
    phone: z.string().optional(),
    address: z.string().optional(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
});

export const orderSchema = z.object({
    customerId: z.number(),
    products: z.string(),
    discount: z.number().optional(),
    total: z.number(),
});


export const customerLoginSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
});

export const customerUpdateSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    password: z.string().min(6).optional(),
});

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;

export const googleLoginSchema = z.object({
    token: z.string().min(1, "Google token is required"),
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
