import cron from 'node-cron';
import prisma from '../utils/prismaUtils.js';
import { notifications } from './notificationService.js';
import { socketService } from './SocketService.js';

class CronService {
    public start() {
        console.log('Starting Cron Service...');

        // Run every hour
        cron.schedule('0 * * * *', () => {
            console.log('Running Order Auto-Complete & Reminder Cron Job...');
            this.processOrderAutoComplete();
            this.processOrderReminders();
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
                include: { customer: true, seller: true }
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
                            message: 'Order automatically marked as completed after guarantee period.',
                            createdBy: 'SYSTEM'
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
                    to: order.customer.email || '',
                    subject: `Order #${order.uid} Completed`,
                    body: `Your order from ${order.seller?.name || 'Knot & Bloom'} has been securely completed. Funds have been released to the seller.`
                });

                // Socket Update
                socketService.emitToRoom(`user_${order.customerId}`, 'order:status:updated', {
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
                include: { customer: true }
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
                        to: order.customer.email || '',
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
}

export const cronService = new CronService();
