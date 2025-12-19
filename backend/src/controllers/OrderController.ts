import type { NextFunction, Request, Response } from 'express';
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

export default {
    getOrders,
    getOrderById
};
