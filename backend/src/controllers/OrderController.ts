import type { NextFunction, Request, Response } from 'express';
import { notifications } from '../services/notificationService.js';
import prisma from '../utils/prisma.js';

const getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

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
        const userId = req.user?.id;
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
        const user = req.user;
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
                to: item.order.customer.email,
                subject: `Your item from ${item.seller?.name ?? 'Knot & Bloom'} has been ${status}`,
                body: `Item: ${item.product.name} is now ${status}. Tracking: ${trackingNumber || 'N/A'}`
            }).catch(console.error);
        }

        // Update Metrics (if delivered)
        if (status === 'delivered' && item.status !== 'delivered' && item.sellerId) {
            await prisma.seller.update({
                where: { uid: item.sellerId },
                data: {
                    totalSales: { increment: item.price },
                    totalOrders: { increment: 1 }
                }
            });
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const shipOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { trackingNumber, courierName } = req.body;

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        const order = await prisma.order.findUnique({
            where: { uid: parseInt(id || '0') },
            include: { customer: true }
        });

        if (!order) return res.status(404).json({ error: "Order not found" });

        // Authorization Check
        let isAuthorized = false;
        if (user.role === 'ADMIN') {
            isAuthorized = true;
        } else if (user.role === 'SELLER') {
            // Check if seller owns the order
            if (user.sellerId && user.sellerId === order.sellerId) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: "Forbidden: You are not authorized to update this order" });
        }

        // Validate Status Transition (Optional strictness)
        // For MVP, allow any status update to SHIPPED if not cancelled/refunded
        if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
            return res.status(400).json({ error: "Cannot ship a cancelled or refunded order" });
        }

        // Validation
        if (!trackingNumber) {
            return res.status(400).json({ error: "Tracking number is required" });
        }

        const updatedOrder = await prisma.order.update({
            where: { uid: order.uid },
            data: {
                status: 'SHIPPED', // Use string if Enums not imported, or OrderStatus.SHIPPED
                trackingNumber,
                courierName,
                shippedAt: new Date(),
                // Sync items status
                items: {
                    updateMany: {
                        where: { orderId: order.uid },
                        data: {
                            status: 'shipped',
                            trackingNumber,
                            shippingProvider: courierName,
                            shippedAt: new Date()
                        }
                    }
                }
            }
        });

        // Notifications
        notifications.send({
            type: 'email',
            to: order.customer.email,
            subject: `Your order #${order.uid} has been shipped!`,
            body: `Great news! Your order is on its way.\n\nCourier: ${courierName || 'Standard'}\nTracking Number: ${trackingNumber}\n\nTrack your package here: [Link]`
        }).catch(console.error);

        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        next(error);
    }
};

export default {
    getOrders,
    getOrderById,
    updateOrderItemStatus,
    shipOrder
};
