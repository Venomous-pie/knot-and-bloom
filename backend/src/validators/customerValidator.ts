import { z } from "zod";

export const customerSchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string(),
    phone: z.string().optional(),
    address: z.string().optional(),
});

export const orderSchema = z.object({
    customerId: z.number(),
    products: z.string(),
    discount: z.number().optional(),
    total: z.number(),
});


export const customerLoginSchema = z.object({
    email: z.email(),
    password: z.string(),
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
