import cron from 'node-cron';
import prisma from '../utils/prismaUtils.js';
import { notifications } from './notificationService.js';
import { supabaseService } from './SupabaseService.js';
import { fuelService } from './fuelService.js';

class CronService {
    public start() {
        console.log('Starting Cron Service...');

        // Run every hour
        cron.schedule('0 * * * *', () => {
            console.log('Running Order Auto-Complete & Reminder Cron Job...');
            this.processOrderAutoComplete();
            this.processOrderReminders();
            this.processProgressImageReminders();
        });

        // Run every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            console.log('\x1b[35m[CRON]\x1b[0m \x1b[90mRunning Expired Checkout Session Cleanup...\x1b[0m');
            this.processExpiredCheckoutSessions();
        });

        // Run daily at 3 AM
        cron.schedule('0 3 * * *', () => {
            console.log('Running Daily Cleanup Jobs...');
            this.cleanupExpiredRateLimits();
            this.cleanupExpiredRefreshTokens();
        });

        // Run daily at 1 AM for fuel prices
        cron.schedule('0 1 * * *', () => {
            console.log('Running Daily Fuel Price Fetch...');
            fuelService.updateFuelPriceConfig();
        });

        // Run daily at 4 AM for taxonomy cleanup
        cron.schedule('0 4 * * *', () => {
            console.log('Running Daily Taxonomy Cleanup...');
            this.processTaxonomyCleanup();
        });
    }

    private async processOrderAutoComplete() {
        try {
            const now = new Date();

            const ordersToComplete = await prisma.order.findMany({
                where: {
                    status: { in: ['SHIPPED', 'DELIVERED'] },
                    autoConfirmAt: { lt: now }
                },
                include: { user: true, seller: true }
            });

            for (const order of ordersToComplete) {
                console.log(`Auto-completing Order #${order.uid}`);

                await prisma.$transaction(async (tx) => {
                    // Update Status
                    await tx.order.update({
                        where: { uid: order.uid },
                        data: {
                            status: 'COMPLETED',
                            paymentStatus: order.paymentStatus === 'PARTIALLY_PAID' ? 'SUCCEEDED' : order.paymentStatus
                        }
                    });

                    // Add to Timeline
                    await tx.orderTimeline.create({
                        data: {
                            orderId: order.uid,
                            status: 'COMPLETED',
                            title: 'Order Completed (Auto)',
                            message: 'Order automatically marked as completed after guarantee period.'
                        }
                    });

                    // Credit Seller (Escrow Release)
                    if (order.sellerId) {
                        await tx.seller.update({
                            where: { uid: order.sellerId },
                            data: {
                                totalSales: { increment: order.total },
                                totalOrders: { increment: 1 }
                            }
                        });
                    }
                });

                // Notify User
                notifications.send({
                    type: 'email',
                    to: order.user.email || '',
                    subject: `Order #${order.uid} Completed`,
                    body: `Your order from ${order.seller?.name || 'Knot & Bloom'} has been securely completed. Funds have been released to the seller.`
                });

                // Socket Update
                supabaseService.emitToRoom(`user_${order.userId}`, 'order:status:updated', {
                    orderId: order.uid,
                    status: 'COMPLETED',
                    timeline: { title: 'Order Completed (Auto)', message: 'Order automatically marked as completed.' }
                });
            }

        } catch (error) {
            console.error("Error in processOrderAutoComplete:", error);
        }
    }

    private async processOrderReminders() {
        try {
            const now = new Date();
            // Look ahead 24 hours (approx) and 4 days
            // But simpler logic based on stages:

            // Strategy: Just check all SHIPPED/DELIVERED orders and see if they need a reminder based on remaining time and current stage

            const activeOrders = await prisma.order.findMany({
                where: {
                    status: { in: ['SHIPPED', 'DELIVERED'] },
                    autoConfirmAt: { not: null }
                },
                include: { user: true }
            });

            for (const order of activeOrders) {
                if (!order.autoConfirmAt) continue;

                const msUpdates = order.autoConfirmAt.getTime() - now.getTime();
                const daysLeft = msUpdates / (1000 * 60 * 60 * 24);

                let shouldRemind = false;
                let reminderType = '';

                // SHIPPED Logic (14 days total)
                if (order.status === 'SHIPPED') {
                    // Stage 0 -> 1: ~4 days left (Day 10)
                    if (order.reminderStage === 0 && daysLeft <= 4 && daysLeft > 1) {
                        shouldRemind = true;
                        reminderType = 'reminder_1';
                    }
                    // Stage 1 -> 2: ~1 day left (Day 13)
                    else if (order.reminderStage <= 1 && daysLeft <= 1 && daysLeft > 0) {
                        shouldRemind = true;
                        reminderType = 'reminder_final';
                    }
                }
                // DELIVERED Logic (7 days total)
                else if (order.status === 'DELIVERED') {
                    // Stage 0 -> 1: ~3 days left (Day 4)
                    if (order.reminderStage === 0 && daysLeft <= 3 && daysLeft > 1) {
                        shouldRemind = true;
                        reminderType = 'reminder_1';
                    }
                    // Stage 1 -> 2: ~1 day left (Day 6)
                    else if (order.reminderStage <= 1 && daysLeft <= 1 && daysLeft > 0) {
                        shouldRemind = true;
                        reminderType = 'reminder_final';
                    }
                }

                if (shouldRemind) {
                    // Update stage first to prevent double sending
                    const newStage = reminderType === 'reminder_final' ? 2 : 1;

                    await prisma.order.update({
                        where: { uid: order.uid },
                        data: { reminderStage: newStage }
                    });

                    // Send Notification
                    const subject = reminderType === 'reminder_final'
                        ? `Action Required: Order #${order.uid} Auto-Completes in 24 Hours`
                        : `Reminder: Order #${order.uid} Validity Period Ending Soon`;

                    const body = `Your order guarantee period is ending soon. If you have any issues, please extend the guarantee or file a dispute. Order will be marked completed on ${order.autoConfirmAt.toLocaleDateString()}.`;

                    notifications.send({
                        type: 'email',
                        to: order.user.email || '',
                        subject,
                        body
                    });

                    console.log(`Sent ${reminderType} for Order #${order.uid}`);
                }
            }

        } catch (error) {
            console.error("Error in processOrderReminders:", error);
        }
    }

    private async processProgressImageReminders() {
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            
            const ordersToRemind = await prisma.order.findMany({
                where: {
                    status: 'IN_PRODUCTION',
                    progressImagesRequested: false,
                    updated: { lt: threeDaysAgo }
                },
                include: { seller: true }
            });

            for (const order of ordersToRemind) {
                if (!order.seller) continue;

                // Update flag to prevent duplicate notifications
                await prisma.order.update({
                    where: { uid: order.uid },
                    data: { progressImagesRequested: true }
                });

                // Notify Seller
                notifications.send({
                    type: 'email', // Or whatever channel is configured
                    to: order.seller.email || '',
                    subject: `Update Customer: Order #${order.uid} Progress Images`,
                    body: `Your order #${order.uid} has been in production for over 3 days. Please upload up to 3 progress images via your Seller Dashboard to keep the customer updated!`
                });

                console.log(`Sent Progress Image Reminder for Order #${order.uid}`);
            }
        } catch (error) {
            console.error("Error in processProgressImageReminders:", error);
        }
    }

    private async processExpiredCheckoutSessions() {
        try {
            const now = new Date();
            const expiredSessions = await prisma.checkoutSession.findMany({
                where: {
                    status: { in: ['INITIATED', 'VALIDATING', 'PROCESSING_PAYMENT', 'AWAITING_PAYMENT'] },
                    expiresAt: { lt: now }
                }
            });

            for (const session of expiredSessions) {
                console.log(`Auto-cancelling expired checkout session #${session.uid}`);

                try {
                    const lockedPrices = JSON.parse(session.lockedPrices);
                    await prisma.$transaction(async (tx) => {
                        // Restore reserved stock
                        for (const item of lockedPrices) {
                            if (item.variantId) {
                                await tx.productVariant.updateMany({
                                    where: { uid: item.variantId, reservedStock: { gte: item.quantity } },
                                    data: { reservedStock: { decrement: item.quantity } }
                                });
                            }
                        }

                        // Update Status
                        await tx.checkoutSession.update({
                            where: { uid: session.uid },
                            data: { status: 'EXPIRED' }
                        });
                    });
                } catch (txError) {
                    console.error(`Failed to cancel session #${session.uid}:`, txError);
                }
            }
        } catch (error) {
            console.error("Error in processExpiredCheckoutSessions:", error);
        }
    }

    private async cleanupExpiredRateLimits() {
        try {
            const result = await prisma.rateLimit.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
            if (result.count > 0) {
                console.log(`Cleaned up ${result.count} expired rate limit records.`);
            }
        } catch (error) {
            console.error("Error in cleanupExpiredRateLimits:", error);
        }
    }

    private async cleanupExpiredRefreshTokens() {
        try {
            const result = await prisma.refreshToken.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
            if (result.count > 0) {
                console.log(`Cleaned up ${result.count} expired refresh tokens.`);
            }
        } catch (error) {
            console.error("Error in cleanupExpiredRefreshTokens:", error);
        }
    }

    private async processTaxonomyCleanup() {
        try {
            // @ts-ignore
            const badWords = await import('bad-words');
            const Filter = (badWords as any).default || badWords;
            const filter = new Filter();

            // Check CustomCategories
            const categories = await prisma.customCategory.findMany();
            for (const cat of categories) {
                if (filter.isProfane(cat.name)) {
                    console.log(`Deleting profane category: ${cat.name}`);
                    await prisma.customCategory.delete({ where: { uid: cat.uid } });

                    // Find products with this category
                    const products = await prisma.product.findMany({
                        where: { categories: { has: cat.name } }
                    });
                    
                    for (const product of products) {
                        const newCats = product.categories.filter(c => c !== cat.name);
                        await prisma.product.update({
                            where: { uid: product.uid },
                            data: { categories: newCats }
                        });
                    }
                }
            }

            // Check CustomTags
            const tags = await prisma.customTag.findMany();
            for (const tag of tags) {
                if (filter.isProfane(tag.name)) {
                    console.log(`Deleting profane tag: ${tag.name}`);
                    await prisma.customTag.delete({ where: { uid: tag.uid } });

                    // Find products with this tag
                    const products = await prisma.product.findMany({
                        where: { tags: { has: tag.name } }
                    });
                    
                    for (const product of products) {
                        const newTags = product.tags.filter(t => t !== tag.name);
                        await prisma.product.update({
                            where: { uid: product.uid },
                            data: { tags: newTags }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error during taxonomy cleanup:', error);
        }
    }
}

export const cronService = new CronService();
