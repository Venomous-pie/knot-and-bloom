import type { Request, Response } from 'express';
import prisma from '../utils/prismaUtils.js';
import { notifications } from '../services/notificationService.js';
import { supabaseService } from '../services/SupabaseService.js';
import type { AuthPayload } from '../types/authTypes.js';
import { PaymentService } from '../services/PaymentService.js';
import { OrderStatus } from '../../generated/prisma/client.js';

export const disputeController = {
    /**
     * POST /api/orders/:id/dispute
     * Initiates a dispute for an order.
     */
    async raiseDispute(req: Request, res: Response) {
        try {
            const user = req.user as AuthPayload;
            const orderId = parseInt(req.params.id || '');
            const { reason, photos } = req.body;

            if (isNaN(orderId) || !reason) {
                return res.status(400).json({ error: "Invalid request data" });
            }

            const order = await prisma.order.findUnique({
                where: { uid: orderId },
                include: { user: true, seller: true }
            });

            if (!order) return res.status(404).json({ error: "Order not found" });

            // Only Buyer or Seller can initiate
            let isAuthorized = false;
            if (user.id === order.userId) isAuthorized = true;
            if (user.sellerId && user.sellerId === order.sellerId) isAuthorized = true;
            if (user.role === 'ADMIN') isAuthorized = true;

            if (!isAuthorized) return res.status(403).json({ error: "Forbidden" });

            // Only allow disputing shipped or delivered orders
            if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
                return res.status(400).json({ error: `Cannot dispute an order in ${order.status} state` });
            }

            // Parse photos
            let photosArray: string[] = [];
            if (photos) {
                try {
                    photosArray = typeof photos === 'string' ? JSON.parse(photos) : photos;
                } catch (e) {
                    return res.status(400).json({ error: "Invalid photos array format" });
                }
            }

            const updatedOrder = await prisma.$transaction(async (tx) => {
                const updated = await tx.order.update({
                    where: { uid: orderId },
                    data: {
                        status: 'DISPUTED',
                        disputeStartedAt: new Date(),
                    }
                });

                await tx.orderTimeline.create({
                    data: {
                        orderId: orderId,
                        status: 'DISPUTED',
                        title: 'Dispute Initiated',
                        message: reason,
                        photos: photosArray,
                        createdBy: user.role
                    }
                });

                return updated;
            });

            // Notify
            const recipientId = user.id === order.userId ? order.seller?.userId : order.userId;
            if (recipientId) {
                const recipient = await prisma.user.findUnique({ where: { uid: recipientId } });
                if (recipient?.email) {
                    notifications.send({
                        type: 'email',
                        to: recipient.email,
                        subject: `Dispute Initiated for Order #${orderId}`,
                        body: `A dispute has been raised regarding Order #${orderId}. Please log in to respond.`
                    });
                }
                supabaseService.emitToRoom(`user_${recipientId}`, 'order:status:updated', {
                    orderId, status: 'DISPUTED'
                });
            }

            res.json({ success: true, order: updatedOrder });
        } catch (error) {
            console.error('raiseDispute error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    /**
     * POST /api/orders/:id/dispute-message
     * Adds evidence/message to an ongoing dispute.
     */
    async addDisputeEvidence(req: Request, res: Response) {
        try {
            const user = req.user as AuthPayload;
            const orderId = parseInt(req.params.id || '');
            const { message, photos } = req.body;

            if (isNaN(orderId) || (!message && (!photos || photos.length === 0))) {
                return res.status(400).json({ error: "Message or photos required" });
            }

            const order = await prisma.order.findUnique({ where: { uid: orderId } });
            if (!order) return res.status(404).json({ error: "Order not found" });

            if (order.status !== 'DISPUTED') {
                return res.status(400).json({ error: "Order is not currently disputed" });
            }

            let isAuthorized = false;
            if (user.id === order.userId) isAuthorized = true;
            if (user.sellerId && user.sellerId === order.sellerId) isAuthorized = true;
            if (user.role === 'ADMIN') isAuthorized = true;

            if (!isAuthorized) return res.status(403).json({ error: "Forbidden" });

            let photosArray: string[] = [];
            if (photos) {
                try {
                    photosArray = typeof photos === 'string' ? JSON.parse(photos) : photos;
                } catch (e) {
                    // ignore
                }
            }

            const timelineEntry = await prisma.orderTimeline.create({
                data: {
                    orderId: orderId,
                    status: 'DISPUTED',
                    title: 'Dispute Evidence Added',
                    message: message || '',
                    photos: photosArray,
                    createdBy: user.role
                }
            });

            supabaseService.emitToRoom(`order_${orderId}`, 'dispute:message:added', timelineEntry);

            res.json({ success: true, timeline: timelineEntry });
        } catch (error) {
            console.error('addDisputeEvidence error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    /**
     * POST /api/admin/orders/:id/resolve-dispute
     * Admin resolves the dispute.
     * Body: { resolution: 'REFUND_BUYER' | 'RELEASE_SELLER', adminNote: string }
     */
    async resolveDispute(req: Request, res: Response) {
        try {
            const user = req.user as AuthPayload;
            const orderId = parseInt(req.params.id || '');
            const { resolution, adminNote } = req.body;

            if (isNaN(orderId) || !['REFUND_BUYER', 'RELEASE_SELLER'].includes(resolution)) {
                return res.status(400).json({ error: "Invalid resolution" });
            }

            // Verify Admin
            if (user.role !== 'ADMIN') {
                return res.status(403).json({ error: "Admin access required" });
            }

            const order = await prisma.order.findUnique({
                where: { uid: orderId },
                include: { payments: true }
            });

            if (!order) return res.status(404).json({ error: "Order not found" });

            if (order.status !== 'DISPUTED') {
                return res.status(400).json({ error: "Order is not disputed" });
            }

            await prisma.$transaction(async (tx) => {
                if (resolution === 'REFUND_BUYER') {
                    // Find payment
                    const payment = order.payments.find(p => p.status === 'SUCCEEDED' && p.gatewayRef);
                    if (payment && payment.gatewayRef) {
                        await PaymentService.refundPayment(payment.gatewayRef, Number(payment.amount));
                    }

                    await tx.order.update({
                        where: { uid: orderId },
                        data: {
                            status: 'REFUNDED',
                            disputeStartedAt: null,
                            paymentStatus: 'REFUNDED'
                        }
                    });

                    await tx.orderTimeline.create({
                        data: {
                            orderId: orderId,
                            status: 'REFUNDED',
                            title: 'Dispute Resolved: Refunded',
                            message: adminNote || 'Dispute resolved in favor of the buyer.',
                            createdBy: 'ADMIN'
                        }
                    });
                } else if (resolution === 'RELEASE_SELLER') {
                    const earningsToRelease = order.sellerEarnings && Number(order.sellerEarnings) > 0
                        ? order.sellerEarnings
                        : order.total;

                    if (order.sellerId) {
                        await tx.seller.update({
                            where: { uid: order.sellerId },
                            data: {
                                totalSales: { increment: order.total },
                                totalOrders: { increment: 1 },
                                pendingBalance: { decrement: earningsToRelease },
                                availableBalance: { increment: earningsToRelease }
                            }
                        });
                    }

                    await tx.order.update({
                        where: { uid: orderId },
                        data: {
                            status: 'COMPLETED',
                            disputeStartedAt: null,
                            paymentStatus: 'SUCCEEDED'
                        }
                    });

                    await tx.orderTimeline.create({
                        data: {
                            orderId: orderId,
                            status: 'COMPLETED',
                            title: 'Dispute Resolved: Funds Released',
                            message: adminNote || 'Dispute resolved in favor of the seller.',
                            createdBy: 'ADMIN'
                        }
                    });
                }
            });

            const updatedOrder = await prisma.order.findUnique({ where: { uid: orderId } });
            res.json({ success: true, order: updatedOrder });
        } catch (error) {
            console.error('resolveDispute error:', error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
};
