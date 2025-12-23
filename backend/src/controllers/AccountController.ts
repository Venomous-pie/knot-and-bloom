import prisma from "../utils/prismaUtils.js";
import { z, ZodError } from "zod";
import ErrorHandler from "../error/errorHandler.js";
import bcrypt from "bcrypt";

// Validation schema for account deletion request
const deleteAccountSchema = z.object({
    reason: z.string().optional(),
    password: z.string().min(1, "Password is required for verification"),
});

type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// 7 days in milliseconds
const DELETION_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Request account deletion - schedules deletion for 7 days
 */
const requestAccountDeletion = async (userId: number, input: unknown) => {
    let parsedInput: DeleteAccountInput;

    try {
        parsedInput = deleteAccountSchema.parse(input);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // Get customer and verify password
    const customer = await prisma.customer.findUnique({
        where: { uid: userId }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError("Customer", String(userId));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(parsedInput.password, customer.password);
    if (!isPasswordValid) {
        throw new ErrorHandler.BadRequestError("Incorrect password");
    }

    // Check if deletion is already requested
    if (customer.deletionRequestedAt) {
        throw new ErrorHandler.BadRequestError("Deletion already requested. Cancel before requesting again.");
    }

    // Schedule deletion for 7 days from now
    const deletionScheduledFor = new Date(Date.now() + DELETION_DELAY_MS);

    await prisma.customer.update({
        where: { uid: userId },
        data: {
            deletionRequestedAt: new Date(),
            deletionScheduledFor,
        }
    });

    return {
        success: true,
        message: "Account deletion scheduled",
        deletionScheduledFor,
        reason: parsedInput.reason,
    };
};

/**
 * Cancel account deletion request
 */
const cancelAccountDeletion = async (userId: number) => {
    const customer = await prisma.customer.findUnique({
        where: { uid: userId }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError("Customer", String(userId));
    }

    if (!customer.deletionRequestedAt) {
        throw new ErrorHandler.BadRequestError("No deletion request found");
    }

    await prisma.customer.update({
        where: { uid: userId },
        data: {
            deletionRequestedAt: null,
            deletionScheduledFor: null,
        }
    });

    return {
        success: true,
        message: "Account deletion cancelled"
    };
};

/**
 * Get account deletion status
 */
const getDeletionStatus = async (userId: number) => {
    const customer = await prisma.customer.findUnique({
        where: { uid: userId },
        select: {
            deletionRequestedAt: true,
            deletionScheduledFor: true,
        }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError("Customer", String(userId));
    }

    return {
        hasPendingDeletion: !!customer.deletionRequestedAt,
        deletionRequestedAt: customer.deletionRequestedAt,
        deletionScheduledFor: customer.deletionScheduledFor,
    };
};

/**
 * Process scheduled account deletions (to be run by a cron job)
 * This permanently deletes accounts that are past their scheduled deletion date
 */
const processScheduledDeletions = async () => {
    const now = new Date();

    // Find accounts scheduled for deletion that are past their date
    const accountsToDelete = await prisma.customer.findMany({
        where: {
            deletionScheduledFor: {
                lte: now
            }
        },
        select: { uid: true, email: true, phone: true }
    });

    const results = {
        processed: 0,
        deleted: 0,
        errors: [] as string[]
    };

    for (const account of accountsToDelete) {
        try {
            // Delete all related data in order
            await prisma.$transaction(async (tx) => {
                // Delete notifications
                await tx.notification.deleteMany({ where: { customerId: account.uid } });

                // Delete notification settings
                await tx.notificationSettings.deleteMany({ where: { customerId: account.uid } });

                // Delete payment methods
                await tx.paymentMethod.deleteMany({ where: { customerId: account.uid } });

                // Delete addresses
                await tx.address.deleteMany({ where: { customerId: account.uid } });

                // Delete cart items and cart
                const cart = await tx.cart.findUnique({ where: { customerId: account.uid } });
                if (cart) {
                    await tx.cartItem.deleteMany({ where: { cartId: cart.uid } });
                    await tx.cart.delete({ where: { uid: cart.uid } });
                }

                // Note: Orders are kept for record-keeping but anonymized
                await tx.order.updateMany({
                    where: { customerId: account.uid },
                    data: { products: JSON.stringify({ note: "Customer account deleted" }) }
                });

                // Finally delete customer
                await tx.customer.delete({ where: { uid: account.uid } });
            });

            results.deleted++;
        } catch (error) {
            results.errors.push(`Failed to delete account ${account.uid}: ${error}`);
        }
        results.processed++;
    }

    return results;
};

export default {
    requestAccountDeletion,
    cancelAccountDeletion,
    getDeletionStatus,
    processScheduledDeletions
};
