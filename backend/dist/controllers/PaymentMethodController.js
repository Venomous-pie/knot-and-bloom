import prisma from "../utils/prismaUtils.js";
import { z, ZodError } from "zod";
import ErrorHandler from "../error/errorHandler.js";
import { PaymentMethodType } from "../../generated/prisma/client.js";
// Validation schemas
const paymentMethodSchema = z.object({
    type: z.enum(['GCASH', 'PAYMAYA', 'BANK']),
    accountName: z.string().min(1, "Account name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    bankName: z.string().optional(),
    isDefault: z.boolean().optional().default(false),
});
const paymentMethodUpdateSchema = paymentMethodSchema.partial();
/**
 * Get all payment methods for a user
 */
const getPaymentMethods = async (userId) => {
    const paymentMethods = await prisma.paymentMethod.findMany({
        where: { customerId: userId },
        orderBy: [
            { isDefault: 'desc' },
            { updatedAt: 'desc' }
        ]
    });
    return { paymentMethods };
};
/**
 * Create a new payment method
 */
const createPaymentMethod = async (userId, input) => {
    let parsedInput;
    try {
        parsedInput = paymentMethodSchema.parse(input);
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
    // If BANK type, bankName is required
    if (parsedInput.type === 'BANK' && !parsedInput.bankName) {
        throw new ErrorHandler.BadRequestError("Bank name is required for bank accounts");
    }
    // Check if this is the first payment method
    const existingCount = await prisma.paymentMethod.count({ where: { customerId: userId } });
    const shouldBeDefault = existingCount === 0 || parsedInput.isDefault;
    // Use transaction to ensure only one default
    const paymentMethod = await prisma.$transaction(async (tx) => {
        if (shouldBeDefault) {
            await tx.paymentMethod.updateMany({
                where: { customerId: userId, isDefault: true },
                data: { isDefault: false }
            });
        }
        return tx.paymentMethod.create({
            data: {
                customerId: userId,
                type: parsedInput.type,
                accountName: parsedInput.accountName,
                accountNumber: parsedInput.accountNumber,
                bankName: parsedInput.bankName ?? null,
                isDefault: shouldBeDefault,
            }
        });
    });
    return { paymentMethod };
};
/**
 * Update a payment method
 */
const updatePaymentMethod = async (userId, paymentMethodId, input) => {
    // Verify ownership
    const existing = await prisma.paymentMethod.findUnique({ where: { uid: paymentMethodId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to update this payment method");
    }
    let parsedInput;
    try {
        parsedInput = paymentMethodUpdateSchema.parse(input);
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
    // Handle default payment method change via transaction
    const paymentMethod = await prisma.$transaction(async (tx) => {
        if (parsedInput.isDefault) {
            await tx.paymentMethod.updateMany({
                where: { customerId: userId, isDefault: true },
                data: { isDefault: false }
            });
        }
        return tx.paymentMethod.update({
            where: { uid: paymentMethodId },
            data: {
                ...(parsedInput.type && { type: parsedInput.type }),
                ...(parsedInput.accountName && { accountName: parsedInput.accountName }),
                ...(parsedInput.accountNumber && { accountNumber: parsedInput.accountNumber }),
                ...(parsedInput.bankName !== undefined && { bankName: parsedInput.bankName }),
                ...(parsedInput.isDefault !== undefined && { isDefault: parsedInput.isDefault }),
            }
        });
    });
    return { paymentMethod };
};
/**
 * Delete a payment method
 */
const deletePaymentMethod = async (userId, paymentMethodId) => {
    // Verify ownership
    const existing = await prisma.paymentMethod.findUnique({ where: { uid: paymentMethodId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to delete this payment method");
    }
    // Delete the payment method
    await prisma.paymentMethod.delete({ where: { uid: paymentMethodId } });
    // If deleted was default, set another as default
    if (existing.isDefault) {
        const nextDefault = await prisma.paymentMethod.findFirst({
            where: { customerId: userId },
            orderBy: { updatedAt: 'desc' }
        });
        if (nextDefault) {
            await prisma.paymentMethod.update({
                where: { uid: nextDefault.uid },
                data: { isDefault: true }
            });
        }
    }
    return { success: true };
};
/**
 * Set a payment method as default
 */
const setDefaultPaymentMethod = async (userId, paymentMethodId) => {
    // Verify ownership
    const existing = await prisma.paymentMethod.findUnique({ where: { uid: paymentMethodId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to modify this payment method");
    }
    // Use transaction to ensure only one default
    const paymentMethod = await prisma.$transaction(async (tx) => {
        await tx.paymentMethod.updateMany({
            where: { customerId: userId, isDefault: true },
            data: { isDefault: false }
        });
        return tx.paymentMethod.update({
            where: { uid: paymentMethodId },
            data: { isDefault: true }
        });
    });
    return { paymentMethod };
};
export default {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod
};
//# sourceMappingURL=PaymentMethodController.js.map