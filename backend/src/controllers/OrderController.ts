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

// Update Order Item Status (Seller)
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

export default {
    getOrders,
    getOrderById,
    updateOrderItemStatus
};
