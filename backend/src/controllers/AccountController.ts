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
    const customer = await prisma.user.findUnique({
        where: { uid: userId }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError("Customer", String(userId));
    }

    if (!customer.password) {
        throw new ErrorHandler.BadRequestError("This account uses Google Sign-In and cannot be verified with a password. Please contact support.");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(parsedInput.password, customer.password);
    if (!isPasswordValid) {
        throw new ErrorHandler.BadRequestError("Incorrect password");
    }

    // Execute the privacy-focused soft delete in a transaction
    await prisma.$transaction(async (tx) => {
        // 1. Delete sensitive PII-heavy sub-records completely
        await tx.address.deleteMany({ where: { userId: userId } });
        await tx.paymentMethod.deleteMany({ where: { userId: userId } });
        await tx.notification.deleteMany({ where: { userId: userId } });
        await tx.notificationSettings.deleteMany({ where: { userId: userId } });
        await tx.checkoutSession.deleteMany({ where: { userId: userId } });

        // Delete Cart
        const cart = await tx.cart.findUnique({ where: { userId: userId } });
        if (cart) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.uid } });
            await tx.cart.delete({ where: { uid: cart.uid } });
        }

        // Delete Wishlist
        const wishlist = await tx.wishlist.findUnique({ where: { userId: userId } });
        if (wishlist) {
            await tx.wishlistItem.deleteMany({ where: { wishlistId: wishlist.uid } });
            await tx.wishlist.delete({ where: { uid: wishlist.uid } });
        }

        // 2. Soft delete and anonymize Customer
        const anonymizedEmail = `deleted_${userId}_${Date.now()}@anonymized.com`;
        await tx.user.update({
            where: { uid: userId },
            data: {
                name: "Deleted User",
                email: anonymizedEmail,
                phone: null,
                googleId: null,
                address: null,
                avatar: null,
                
                password: "deleted", // overwrite password hash
            }
        });

        // 3. Soft delete and anonymize Seller (if exists)
        const seller = await tx.seller.findUnique({ where: { userId: userId } });
        if (seller) {
            const sellerAnonymizedEmail = `deleted_seller_${seller.uid}_${Date.now()}@anonymized.com`;
            await tx.seller.update({
                where: { uid: seller.uid },
                data: {
                    name: "Deleted Shop",
                    slug: `deleted-shop-${seller.uid}`,
                    email: sellerAnonymizedEmail,
                    phone: null,
                    description: null,
                    logo: null,
                    banner: null,
                    socialMediaLink: null,
                    businessAddress: null,
                    
                    
                    
                    
                    status: "BANNED" // Change status to prevent appearing in listings
                }
            });

            // 4. Soft delete all Products owned by the seller
            await tx.product.updateMany({
                where: { sellerId: seller.uid },
                data: {
                    
                    status: "SUSPENDED"
                }
            });
        }
    });

    return {
        success: true,
        message: "Account has been successfully deleted.",
        reason: parsedInput.reason,
    };
};

/**
 * Cancel account deletion request
 */
const cancelAccountDeletion = async (userId: number) => {
    const customer = await prisma.user.findUnique({
        where: { uid: userId }
    });

    if (!customer) {
        throw new ErrorHandler.NotFoundError("Customer", String(userId));
    }

    if (!customer.deletionRequestedAt) {
        throw new ErrorHandler.BadRequestError("No deletion request found");
    }

    await prisma.user.update({
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
    const customer = await prisma.user.findUnique({
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
    const accountsToDelete = await prisma.user.findMany({
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
                await tx.notification.deleteMany({ where: { userId: account.uid } });

                // Delete notification settings
                await tx.notificationSettings.deleteMany({ where: { userId: account.uid } });

                // Delete payment methods
                await tx.paymentMethod.deleteMany({ where: { userId: account.uid } });

                // Delete addresses
                await tx.address.deleteMany({ where: { userId: account.uid } });

                // Delete cart items and cart
                const cart = await tx.cart.findUnique({ where: { userId: account.uid } });
                if (cart) {
                    await tx.cartItem.deleteMany({ where: { cartId: cart.uid } });
                    await tx.cart.delete({ where: { uid: cart.uid } });
                }

                // Note: Orders are kept for record-keeping but anonymized
                await tx.order.updateMany({
                    where: { userId: account.uid },
                    data: { products: JSON.stringify({ note: "Customer account deleted" }) }
                });

                // Finally delete customer
                await tx.user.delete({ where: { uid: account.uid } });
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
