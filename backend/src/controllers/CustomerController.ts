import prisma from "../utils/prismaUtils.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from "zod";

import { type AuthPayload } from "../types/authTypes.js";

import ErrorHandler from "../error/errorHandler.js";

import {
    customerLoginSchema,
    customerSchema,
    customerUpdateSchema,

    type CustomerInput,
    type CustomerLoginInput,
    type CustomerUpdateInput
} from "../validators/customerValidator.js";

import { generateRandomName } from "../utils/nameGenerator.js";

const customerRegisterController = async (input: unknown) => {
    let parsedInput: CustomerInput;

    try {
        parsedInput = customerSchema.parse(input);

        // Check for existing user by email OR phone
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
        });

        if (existingCustomer) {
            if (parsedInput.email && existingCustomer.email === parsedInput.email) {
                throw new ErrorHandler.DuplicateCustomerError(parsedInput.email);
            }
            if (parsedInput.phone && existingCustomer.phone === parsedInput.phone) {
                // Create a custom error or reuse DuplicateCustomerError with phone message
                throw new ErrorHandler.DuplicateCustomerError(parsedInput.phone);
            }
        }

        const hashedPassword = await bcrypt.hash(parsedInput.password, 10);
        const finalName = parsedInput.name || generateRandomName();

        const customer = await prisma.customer.create({
            data: {
                name: finalName,
                email: parsedInput.email || null,
                password: hashedPassword,
                phone: parsedInput.phone || null,
                address: parsedInput.address || null,
            },
        });

        // Generate token for auto-login
        const payload: AuthPayload = {
            id: customer.uid,
            ...(customer.email ? { email: customer.email } : {}),
            role: customer.role as any,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

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
                sellerId: undefined, // New users are not sellers yet
                sellerStatus: undefined
            }
        };
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
}

const customerLoginController = async (input: unknown) => {
    let parsedInput: CustomerLoginInput;

    try {
        parsedInput = customerLoginSchema.parse(input);

        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
            include: { sellerProfile: true }
        });

        if (!customer) {
            // Use generic message for security
            throw new ErrorHandler.AuthenticationError("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(parsedInput.password, customer.password);

        if (!isPasswordValid) {
            throw new ErrorHandler.AuthenticationError("Invalid credentials");
        }

        const payload: AuthPayload = {
            id: customer.uid,
            ...(customer.email ? { email: customer.email } : {}),
            role: customer.role as any,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status as any }),
            ...(customer.passwordResetRequired && { passwordResetRequired: customer.passwordResetRequired })
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }); // 7d expiry for better UX

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
                sellerStatus: customer.sellerProfile?.status,
                sellerHasSeenWelcomeModal: customer.sellerProfile?.hasSeenWelcomeModal
            }
        };

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        // Rethrow known errors or generic ones
        throw error;
    }
}

const getCustomerProfile = async (userId: number) => {
    const customer = await prisma.customer.findUnique({
        where: { uid: userId },
        include: { sellerProfile: true }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError('Customer', String(userId));
    }

    const { password, ...customerData } = customer;

    return {
        ...customerData,
        sellerId: customer.sellerProfile?.uid,
        sellerStatus: customer.sellerProfile?.status,
        sellerHasSeenWelcomeModal: customer.sellerProfile?.hasSeenWelcomeModal
    };
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
            throw new ErrorHandler.ValidationError(error.issues);
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
