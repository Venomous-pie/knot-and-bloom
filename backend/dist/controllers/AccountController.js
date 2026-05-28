import prisma from "../utils/prismaUtils.js";
import { z, ZodError } from "zod";
import ErrorHandler from "../error/errorHandler.js";
import bcrypt from "bcrypt";
// Validation schema for account deletion request
const deleteAccountSchema = z.object({
    reason: z.string().optional(),
    password: z.string().min(1, "Password is required for verification"),
});
// 7 days in milliseconds
const DELETION_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Request account deletion - schedules deletion for 7 days
 */
const requestAccountDeletion = async (userId, input) => {
    let parsedInput;
    try {
        parsedInput = deleteAccountSchema.parse(input);
    }
    catch (error) {
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
        await tx.address.deleteMany({ where: { customerId: userId } });
        await tx.paymentMethod.deleteMany({ where: { customerId: userId } });
        await tx.notification.deleteMany({ where: { customerId: userId } });
        await tx.notificationSettings.deleteMany({ where: { customerId: userId } });
        await tx.checkoutSession.deleteMany({ where: { customerId: userId } });
        // Delete Cart
        const cart = await tx.cart.findUnique({ where: { customerId: userId } });
        if (cart) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.uid } });
            await tx.cart.delete({ where: { uid: cart.uid } });
        }
        // Delete Wishlist
        const wishlist = await tx.wishlist.findUnique({ where: { customerId: userId } });
        if (wishlist) {
            await tx.wishlistItem.deleteMany({ where: { wishlistId: wishlist.uid } });
            await tx.wishlist.delete({ where: { uid: wishlist.uid } });
        }
        // 2. Soft delete and anonymize Customer
        const anonymizedEmail = `deleted_${userId}_${Date.now()}@anonymized.com`;
        await tx.customer.update({
            where: { uid: userId },
            data: {
                name: "Deleted User",
                email: anonymizedEmail,
                phone: null,
                googleId: null,
                address: null,
                avatar: null,
                deletedAt: new Date(),
                password: "deleted", // overwrite password hash
            }
        });
        // 3. Soft delete and anonymize Seller (if exists)
        const seller = await tx.seller.findUnique({ where: { customerId: userId } });
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
                    location: null,
                    legalName: null,
                    businessAddress: null,
                    portfolioLink: null,
                    idType: null,
                    idNumber: null,
                    deletedAt: new Date(),
                    status: "BANNED" // Change status to prevent appearing in listings
                }
            });
            // 4. Soft delete all Products owned by the seller
            await tx.product.updateMany({
                where: { sellerId: seller.uid },
                data: {
                    deletedAt: new Date(),
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
const cancelAccountDeletion = async (userId) => {
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
const getDeletionStatus = async (userId) => {
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
        errors: []
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
        }
        catch (error) {
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
//# sourceMappingURL=AccountController.js.map