import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from "zod";
import { DuplicateCustomerError, ValidationError } from "../error/errorHandler.js";
import { type AuthPayload } from "../types/auth.js";
import prisma from "../utils/prisma.js";
import { customerLoginSchema, customerSchema, customerUpdateSchema, type CustomerInput, type CustomerLoginInput, type CustomerUpdateInput } from "../validators/customerValidator.js";

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

const customerRegisterController = async (input: unknown) => {
    let parsedInput: CustomerInput;

    try {
        parsedInput = customerSchema.parse(input);

        const existingCustomer = await prisma.customer.findUnique({
            where: { email: parsedInput.email },
        });

        if (existingCustomer) {
            throw new DuplicateCustomerError(parsedInput.email);
        }

        const hashedPassword = await bcrypt.hash(parsedInput.password, 10);

        const customer = await prisma.customer.create({
            data: {
                name: parsedInput.name,
                email: parsedInput.email,
                password: hashedPassword,
                phone: parsedInput.phone || null,
                address: parsedInput.address || null,
            },
        });

        // Omit password from response
        const { password, ...customerData } = customer;
        return customerData;
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(error.issues);
        }
        throw error;
    }
}

const customerLoginController = async (input: unknown) => {
    let parsedInput: CustomerLoginInput;

    try {
        parsedInput = customerLoginSchema.parse(input);

        const customer = await prisma.customer.findUnique({
            where: { email: parsedInput.email },
            include: { sellerProfile: true }
        });

        if (!customer) {
            // Use generic message for security
            throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(parsedInput.password, customer.password);

        if (!isPasswordValid) {
            throw new Error("Invalid email or password");
        }

        const payload: AuthPayload = {
            id: customer.uid,
            email: customer.email,
            role: customer.role as any,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status as any }),
            ...(customer.passwordResetRequired && { passwordResetRequired: customer.passwordResetRequired })
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' }); // 2h expiry for security

        return {
            token,
            customer: {
                uid: customer.uid,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                role: customer.role,
                passwordResetRequired: customer.passwordResetRequired,
                sellerId: customer.sellerProfile?.uid,
                sellerStatus: customer.sellerProfile?.status
            }
        };

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(error.issues);
        }
        // Rethrow known errors or generic ones
        throw error;
    }
}

const getCustomerProfile = async (userId: number) => {
    const customer = await prisma.customer.findUnique({
        where: { uid: userId },
    });

    if (!customer) {
        throw new Error("Customer not found");
    }

    const { password, ...customerData } = customer;
    return customerData;
};

const updateCustomerProfile = async (userId: number, input: unknown) => {
    let parsedInput: CustomerUpdateInput;

    try {
        parsedInput = customerUpdateSchema.parse(input);

        // Remove undefined keys to avoid exactOptionalPropertyTypes issues
        const updateData: any = Object.fromEntries(
            Object.entries(parsedInput).filter(([_, v]) => v !== undefined)
        );

        // If password is provided, hash it and clear passwordResetRequired flag
        if (parsedInput.password) {
            updateData.password = await bcrypt.hash(parsedInput.password, 10);
            updateData.passwordResetRequired = false;
        }

        const customer = await prisma.customer.update({
            where: { uid: userId },
            data: updateData
        });

        const { password, ...customerData } = customer;
        return customerData;

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(error.issues);
        }
        throw error;
    }
}

export default {
    customerRegisterController,
    customerLoginController,
    getCustomerProfile,
    updateCustomerProfile
}
