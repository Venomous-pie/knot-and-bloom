import type { NextFunction, Request, Response } from 'express';
import prisma from '../utils/prismaUtils.js';
import type { AuthPayload } from '../types/authTypes.js';

// Get Seller Earnings Dashboard Data
const getEarnings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const sellerId = user.sellerId;
        
        if (!sellerId && user.role === 'ADMIN') {
            return res.json({
                balance: { pending: 0, available: 0, withdrawn: 0, gmv: 0 },
                history: { orders: [], withdrawals: [] }
            });
        }
        
        if (!sellerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Fetch Seller Balance
        const seller = await prisma.seller.findUnique({
            where: { uid: sellerId },
            select: { pendingBalance: true, availableBalance: true, totalWithdrawn: true, totalSales: true }
        });

        if (!seller) return res.status(404).json({ error: "Seller not found" });

        // Fetch Recent Transactions (Orders + Withdrawals)
        // We simulate a unified transaction history by fetching both and sorting
        const recentOrders = await prisma.order.findMany({
            where: { sellerId, status: 'COMPLETED' },
            take: 20,
            orderBy: { updated: 'desc' },
            select: { uid: true, referenceNumber: true, total: true, sellerEarnings: true, updated: true, status: true }
        });

        const recentWithdrawals = await prisma.withdrawalRequest.findMany({
            where: { sellerId },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        // Combine and conform to a standard interface if needed, or send separate lists
        // sending separate lists gives frontend flexibility

        res.json({
            balance: {
                pending: Number(seller.pendingBalance),
                available: Number(seller.availableBalance),
                withdrawn: Number(seller.totalWithdrawn),
                gmv: Number(seller.totalSales)
            },
            history: {
                orders: recentOrders.map(o => ({ ...o, total: Number(o.total), sellerEarnings: Number(o.sellerEarnings) })),
                withdrawals: recentWithdrawals.map(w => ({ ...w, amount: Number(w.amount) }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Request a Payout
const requestWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { amount, method, details } = req.body;
        const sellerId = user.sellerId;

        if (!sellerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
        if (!method || !details) return res.status(400).json({ error: "Missing payment details" });

        // Check Balance
        const seller = await prisma.seller.findUnique({ where: { uid: sellerId } });
        if (!seller || Number(seller.availableBalance) < amount) {
            return res.status(400).json({ error: "Insufficient available balance" });
        }

        // Create Request & Deduct Balance Immediately (to prevent double spending)
        await prisma.$transaction(async (tx) => {
            // Deduct from available
            await tx.seller.update({
                where: { uid: sellerId },
                data: { availableBalance: { decrement: amount } }
            });

            // Create record
            await tx.withdrawalRequest.create({
                data: {
                    sellerId,
                    amount,
                    method,
                    details,
                    status: 'PENDING'
                }
            });
        });

        res.json({ success: true, message: "Withdrawal requested successfully" });
    } catch (error) {
        next(error);
    }
};

// ADMIN: Get Platform Income Stats
const getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: "Forbidden" });
        }

        // 1. Total Platform Revenue (Sum of all order platformFees)
        const revenueAgg = await prisma.order.aggregate({
            _sum: { platformFee: true, total: true }
        });

        // 2. Pending Withdrawals
        const pendingWithdrawalsCount = await prisma.withdrawalRequest.count({
            where: { status: 'PENDING' }
        });

        // 3. Recent Payouts
        const recentPayouts = await prisma.withdrawalRequest.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { seller: { select: { name: true, slug: true } } } // Include seller name
        });

        // 4. Monthly Income (Simple Group By for valid chart data)
        // Group by month is hard in Prisma without raw query, so we'll fetch last 100 orders and aggregate in code for now
        // Or just return raw recent orders for frontend to chart
        const recentOrders = await prisma.order.findMany({
            where: { status: 'COMPLETED' },
            take: 100,
            orderBy: { updated: 'desc' },
            select: { platformFee: true, updated: true }
        });

        res.json({
            revenue: Number(revenueAgg._sum.platformFee || 0),
            gmv: Number(revenueAgg._sum.total || 0),
            pendingWithdrawals: pendingWithdrawalsCount,
            recentPayouts: recentPayouts.map(p => ({
                ...p,
                amount: Number(p.amount),
                sellerName: p.seller.name
            })),
            chartData: recentOrders.map(o => ({
                date: o.updated,
                fee: Number(o.platformFee)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// ADMIN: Approve/Reject Withdrawal
const processWithdrawal = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = req.user as AuthPayload | undefined;
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: "Forbidden" });
        }
        const { id } = req.params;
        const { action, note } = req.body; // action: 'APPROVE' | 'REJECT'
        const safeNote = typeof note === 'string' ? note : '';

        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { uid: parseInt(id || '0') } });
        if (!withdrawal) return res.status(404).json({ error: "Request not found" });
        if (withdrawal.status !== 'PENDING') return res.status(400).json({ error: "Request already processed" });

        if (action === 'REJECT') {
            // Refund the balance
            await prisma.$transaction(async (tx) => {
                await tx.seller.update({
                    where: { uid: withdrawal.sellerId },
                    data: { availableBalance: { increment: withdrawal.amount } }
                });
                await tx.withdrawalRequest.update({
                    where: { uid: withdrawal.uid },
                    data: { status: 'REJECTED', adminNote: safeNote }
                });
            });
        } else if (action === 'APPROVE') {
            await prisma.$transaction(async (tx) => {
                // Determine if we need to do anything with balance? 
                // We already deducted it. So just mark as APPROVED (or PROCESSED).
                // Also update 'totalWithdrawn'
                await tx.seller.update({
                    where: { uid: withdrawal.sellerId },
                    data: { totalWithdrawn: { increment: withdrawal.amount } }
                });

                await tx.withdrawalRequest.update({
                    where: { uid: withdrawal.uid },
                    data: { status: 'APPROVED', adminNote: safeNote }
                });
            });
        } else {
            return res.status(400).json({ error: "Invalid action" });
        }

        res.json({ success: true });

    } catch (error) {
        next(error);
    }
};

export default {
    getEarnings,
    requestWithdrawal,
    getAdminStats,
    processWithdrawal
};
