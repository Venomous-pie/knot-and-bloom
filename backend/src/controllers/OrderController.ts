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

        const orders = await prisma.order.findMany({
            where: {
                customerId: userId
            },
            orderBy: {
                uploaded: 'desc'
            }
        });

        res.json(orders);
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
        const { status, message, estimatedCompletionDate, rejectionReason, trackingNumber, courierName, photos } = req.body;

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const order = await prisma.order.findUnique({
            where: { uid: parseInt(id || '0') },
            include: { customer: true }
        });

        if (!order) return res.status(404).json({ error: "Order not found" });

        // Authorization
        let isAuthorized = false;
        if (user.role === 'ADMIN') isAuthorized = true;
        else if (user.role === 'SELLER') {
            if (user.sellerId && user.sellerId === order.sellerId) isAuthorized = true;
        }

        if (!isAuthorized) return res.status(403).json({ error: "Forbidden" });

        // Status-specific validation
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
        }
        else if (status === 'SHIPPED') {
            if (!trackingNumber) return res.status(400).json({ error: "Tracking number required" });
            updateData.trackingNumber = trackingNumber;
            updateData.courierName = courierName;
            updateData.shippedAt = new Date();
            timelineTitle = 'Order Shipped';
        }
        else if (status === 'IN_PRODUCTION') timelineTitle = 'In Production';
        else if (status === 'READY_TO_SHIP') timelineTitle = 'Ready to Ship';
        else if (status === 'COMPLETED') {
            timelineTitle = 'Order Completed';

            // Payment Reconciliation (COD Handshake)
            if (order.paymentStatus === 'PARTIALLY_PAID') {
                updateData.paymentStatus = 'SUCCEEDED';
            }

            // Escrow Release: Credit Seller
            if (order.sellerId) {
                await prisma.seller.update({
                    where: { uid: order.sellerId },
                    data: {
                        totalSales: { increment: order.total },
                        totalOrders: { increment: 1 }
                    }
                });
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

export default {
    getOrders,
    getOrderById,
    updateOrderItemStatus,
    updateOrderStatus
};
