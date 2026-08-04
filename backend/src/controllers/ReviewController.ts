import type { Request, Response } from 'express';
import prisma from '../utils/prismaUtils.js';

export const getReviewsBySeller = async (req: Request, res: Response) => {
    try {
        const slug = req.params.slug as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const seller = await prisma.seller.findUnique({
            where: { slug }
        });

        if (!seller) {
            return res.status(404).json({ error: 'Seller not found' });
        }

        const [reviews, totalCount] = await Promise.all([
            prisma.review.findMany({
                where: { sellerId: seller.uid },
                include: {
                    user: {
                        select: { name: true, avatar: true }
                    },
                    product: {
                        select: { name: true, image: true, uid: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.review.count({
                where: { sellerId: seller.uid }
            })
        ]);

        // Calculate aggregate statistics
        const aggregate = await prisma.review.aggregate({
            where: { sellerId: seller.uid },
            _avg: { rating: true },
        });

        res.json({
            data: reviews,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                averageRating: aggregate._avg.rating || 0
            }
        });
    } catch (error) {
        console.error('Error fetching seller reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

export const getReviewsByProduct = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [reviews, totalCount] = await Promise.all([
            prisma.review.findMany({
                where: { productId },
                include: {
                    user: {
                        select: { name: true, avatar: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.review.count({
                where: { productId }
            })
        ]);

        const aggregate = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        res.json({
            data: reviews,
            meta: {
                totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
                averageRating: aggregate._avg.rating || 0
            }
        });
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};
