import type { NextFunction, Request, Response } from 'express';
import { notifications } from '../services/notificationService.js';
import prisma from '../utils/prismaUtils.js';
import { socketService } from '../services/SocketService.js';
import type { AuthPayload } from '../types/authTypes.js';

const getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        const userId = user?.id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const offset = parseInt(req.query.offset as string) || 0;
        const status = req.query.status as string;

        const whereClause: any = { customerId: userId };
        if (status) whereClause.status = status;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: whereClause,
                orderBy: { uploaded: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.order.count({ where: whereClause }),
        ]);

        res.json({
            orders,
            total,
            pagination: {
                limit,
                offset,
                hasMore: offset + limit < total,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        const userId = user?.id;
        const orderId = parseInt(req.params.id || '');

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid order ID" });
        }

        const order = await prisma.order.findUnique({
            where: {
                uid: orderId
            },
            include: {
                timeline: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.customerId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        res.json(order);
    } catch (error) {
        next(error);
    }
};

const updateOrderItemStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        const { itemId } = req.params;
        const { status, trackingNumber, shippingProvider } = req.body;

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const item = await prisma.orderItem.findUnique({
            where: { uid: parseInt(itemId || '0') },
            include: { seller: true, order: { include: { customer: true } }, product: true }
        });

        if (!item) return res.status(404).json({ error: "Item not found" });

        // Strict Role & Ownership Check
        let isAuthorized = false;

        // Admins can update anything
        if (user.role === 'ADMIN') { // Use string literal if Role enum import is tricky, or import Role
            isAuthorized = true;
        }
        // Sellers can only update their own items
        else if (user.role === 'SELLER') {
            if (user.sellerId && user.sellerId === item.sellerId) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: You are not authorized to update this item" });
        }

        const updateData: any = {
            status,
            trackingNumber,
            shippingProvider
        };

        if (status === 'shipped') updateData.shippedAt = new Date();
        if (status === 'delivered') updateData.deliveredAt = new Date();

        await prisma.orderItem.update({
            where: { uid: item.uid },
            data: updateData
        });

        // Notifications
        if (status === 'shipped' || status === 'delivered') {
            notifications.send({
                type: 'email',
                to: item.order.customer.email || '',
                subject: `Your item from ${item.seller?.name ?? 'Knot & Bloom'} has been ${status}`,
                body: `Item: ${item.product.name} is now ${status}. Tracking: ${trackingNumber || 'N/A'}`
            }).catch(console.error);
        }

        // Real-time Update
        socketService.emitToRoom(`user_${item.order.customerId}`, 'order:status:updated', {
            orderId: item.order.uid,
            itemId: item.uid,
            status,
            customerId: item.order.customerId
        });

        // Sales update moved to Order Completion (Escrow Release)


        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        const { id } = req.params;
        const { status, message, estimatedCompletionDate, rejectionReason, trackingNumber, courierName, photos, shippingMethod, proofPhotos } = req.body;

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const order = await prisma.order.findUnique({
            where: { uid: parseInt(id || '0') },
            include: { customer: true }
        });

        if (!order) return res.status(404).json({ error: "Order not found" });

        // Authorization Checks
        let isAuthorized = false;

        // Seller / Admin Authorization
        if (user.role === 'ADMIN') isAuthorized = true;
        else if (user.role === 'SELLER') {
            if (user.sellerId && user.sellerId === order.sellerId) isAuthorized = true;
        }

        // CUSTOMER Authorization (Only for Completing Order)
        if (user.id === order.customerId && status === 'COMPLETED') {
            if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) return res.status(403).json({ error: "Forbidden" });

        // Status-specific validation & Logic
        const updateData: any = { status };
        let timelineTitle = `Order ${status}`;

        if (status === 'CONFIRMED') {
            if (!estimatedCompletionDate) return res.status(400).json({ error: "Estimated completion date required" });
            updateData.estimatedCompletionDate = new Date(estimatedCompletionDate);
            timelineTitle = 'Order Confirmed';
        }
        else if (status === 'CANCELLED') {
            if (!rejectionReason) return res.status(400).json({ error: "Reason required for cancellation" });
            updateData.rejectionReason = rejectionReason;
            timelineTitle = 'Order Cancelled';

            // Intelligent COD: Punish bad behavior
            // If Buyer cancels (or Rejected due to buyer fault), check payment method
            const isBuyerFault = rejectionReason.toLowerCase().includes('change of mind') || rejectionReason.toLowerCase().includes('refused');

            // Note: rejectionReason usually comes from Seller "Rejecting" OR Buyer "Cancelling"
            if (isBuyerFault && order.paymentMethod === 'COD') {
                await prisma.customer.update({
                    where: { uid: order.customerId },
                    data: {
                        codCancellationCount: { increment: 1 },
                        trustScore: { decrement: 10 }
                    }
                });
            }
        }
        else if (status === 'SHIPPED') {
            // New Handmade Logic
            if (!shippingMethod) return res.status(400).json({ error: "Shipping method required (TRACKED or UNTRACKED)" });
            if (!proofPhotos) return res.status(400).json({ error: "Proof photos required (Item + Package)" });

            // Validate photos
            let photosArray: string[] = [];
            try {
                photosArray = typeof proofPhotos === 'string' ? JSON.parse(proofPhotos) : proofPhotos;
                if (!Array.isArray(photosArray) || photosArray.length < 2) {
                    throw new Error("Minimum 2 photos required");
                }
            } catch (e) {
                return res.status(400).json({ error: "Invalid proof photos. Minimum 2 photos required." });
            }

            updateData.shippingMethod = shippingMethod;
            updateData.proofPhotos = JSON.stringify(photosArray);
            updateData.courierName = courierName;
            updateData.shippedAt = new Date();

            const now = new Date();
            if (shippingMethod === 'TRACKED') {
                if (!trackingNumber) return res.status(400).json({ error: "Tracking number required for tracked shipping" });
                updateData.trackingNumber = trackingNumber;

                // 14 Days for Tracked
                now.setDate(now.getDate() + 14);
            } else {
                // Untracked (Regular Mail) - 7 Days
                now.setDate(now.getDate() + 7);
                // No tracking number required
            }

            updateData.autoConfirmAt = now;
            updateData.reminderStage = 0; // Reset reminder

            timelineTitle = 'Order Shipped';
        }
        else if (status === 'DELIVERED') {
            // Start 7-day timer
            const now = new Date();
            now.setDate(now.getDate() + 7);
            updateData.estimatedDeliveryDate = new Date(); // Using this as deliveredAt equivalent if needed, or add deliveredAt to Order model
            updateData.autoConfirmAt = now;
            updateData.reminderStage = 0; // Reset reminder

            timelineTitle = 'Order Delivered';
        }
        else if (status === 'IN_PRODUCTION') timelineTitle = 'In Production';
        else if (status === 'READY_TO_SHIP') timelineTitle = 'Ready to Ship';
        else if (status === 'DISPUTED') {
            updateData.disputeStartedAt = new Date();
            timelineTitle = 'Order Disputed';
        }
        else if (status === 'COMPLETED') {
            timelineTitle = 'Order Completed';

            // Payment Reconciliation (COD Handshake)
            if (order.paymentStatus === 'PARTIALLY_PAID') {
                updateData.paymentStatus = 'SUCCEEDED';
            }

            // Escrow Release: Credit Seller
            if (order.sellerId) {
                // Determine earnings to release
                // If the order has sellerEarnings calculated (Phase 1+), use that.
                // Fallback to order.total for legacy orders (though commission logic implies we should calculate it now if missing, but simpler to rely on stored value)
                const earningsToRelease = order.sellerEarnings && Number(order.sellerEarnings) > 0
                    ? order.sellerEarnings
                    : order.total; // Fallback for old orders (0% commission effectively)

                await prisma.seller.update({
                    where: { uid: order.sellerId },
                    data: {
                        totalSales: { increment: order.total }, // GMV
                        totalOrders: { increment: 1 },
                        pendingBalance: { decrement: earningsToRelease },
                        availableBalance: { increment: earningsToRelease }
                    }
                });
            }
        }

        // Logic for Resolving Dispute (Return to SHIPPED/DELIVERED)
        // If we are moving FROM disputed TO shipped/delivered, we need to resume the timer.
        if (order.status === 'DISPUTED' && (status === 'SHIPPED' || status === 'DELIVERED')) {
            if (order.disputeStartedAt && order.autoConfirmAt) {
                const now = new Date();
                const pauseDuration = now.getTime() - new Date(order.disputeStartedAt).getTime();

                // Add the paused duration to the deadline
                const newDeadline = new Date(new Date(order.autoConfirmAt).getTime() + pauseDuration);
                updateData.autoConfirmAt = newDeadline;
                updateData.disputeStartedAt = null; // Clear pause start
            }
        }

        // Transaction: Update Order & Add Timeline
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { uid: order.uid },
                data: updateData
            });

            await tx.orderTimeline.create({
                data: {
                    orderId: order.uid,
                    status: status, // Ensure this matches enum or cast as needed
                    title: timelineTitle,
                    message: message || '',
                    photos: photos || [],
                    createdBy: user.role
                }
            });

            return updated;
        });

        // Notifications & Realtime
        const notifyMessage = message ? `\nNote: ${message}` : '';
        notifications.send({
            type: 'email',
            to: order.customer.email || '',
            subject: `Order Update: ${timelineTitle}`,
            body: `Your order #${order.uid} is now ${status}.${notifyMessage}`
        }).catch(console.error);

        socketService.emitToRoom(`user_${order.customerId}`, 'order:status:updated', {
            orderId: order.uid,
            status,
            timeline: { title: timelineTitle, message, photos }
        });

        res.json({ success: true, order: result });

    } catch (error) {
        next(error);
    }
};

const extendOrderGuarantee = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        const { id } = req.params;

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const order = await prisma.order.findUnique({
            where: { uid: parseInt(id || '0') },
        });

        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.customerId !== user.id) return res.status(403).json({ error: "Forbidden" });
        if (!order.autoConfirmAt) return res.status(400).json({ error: "Order suggests no guarantee period active" });

        // Extension Limits Logic
        const maxExtensions = order.status === 'SHIPPED' ? 2 : 1;

        if (order.extensionCount >= maxExtensions) {
            return res.status(400).json({ error: `Maximum extensions (${maxExtensions}) reached for this status.` });
        }

        // Add 7 days
        const newDate = new Date(order.autoConfirmAt);
        newDate.setDate(newDate.getDate() + 7);

        const updated = await prisma.order.update({
            where: { uid: order.uid },
            data: {
                autoConfirmAt: newDate,
                extensionCount: { increment: 1 },
                reminderStage: 0 // Reset reminder stage so they get notified again
            }
        });

        await prisma.orderTimeline.create({
            data: {
                orderId: order.uid,
                status: order.status,
                title: 'Guarantee Extended',
                message: 'Buyer extended the guarantee period by 7 days.',
                createdBy: 'USER'
            }
        });

        res.json({ success: true, newDate });

    } catch (error) {
        next(error);
    }
};

export default {
    getOrders,
    getOrderById,
    updateOrderItemStatus,
    updateOrderStatus,
    extendOrderGuarantee
};
