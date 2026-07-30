import { z } from "zod";

// Reusable password policy: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number");

export const userSchema = z.object({
    name: z.string().optional(),
    email: z.email(),
    password: passwordSchema,
    phone: z.string().optional(),
    otp: z.string().optional(), // OTP for phone registration
    address: z.string().optional(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
});

export const orderSchema = z.object({
    userId: z.number(),
    products: z.string(),
    discount: z.number().optional(),
    total: z.number(),
});


export const userLoginSchema = z.object({
    email: z.email(),
    phone: z.string().optional(),
    password: z.string(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
});

export const userUpdateSchema = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    password: passwordSchema.optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserInput = z.infer<typeof userSchema>;

export const googleLoginSchema = z.object({
    token: z.string().min(1, "Google token is required"),
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
