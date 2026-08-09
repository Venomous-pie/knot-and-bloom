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
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createReview = async (req: any, res: Response) => {
    try {
        const userId = req.user.id; // From authenticate middleware
        const productId = parseInt(req.body.productId);
        const rating = parseInt(req.body.rating);
        const comment = req.body.comment || null;

        if (isNaN(productId) || isNaN(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Invalid product ID or rating' });
        }

        // Ensure product exists
        const product = await prisma.product.findUnique({
            where: { uid: productId }
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Optional: Check if user actually bought the product (skip for now to allow any user to review in MVP)

        const review = await prisma.review.create({
            data: {
                userId,
                productId,
                sellerId: product.sellerId as number,
                rating,
                comment
            }
        });

        // Update product review count/average asynchronously (can be done here or in a hook)
        const allReviews = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { uid: true }
        });

        // Ignore if error
        await prisma.product.update({
            where: { uid: productId },
            data: {} // In this schema rating doesn't seem to be cached on Product, but we'll leave this here if it is.
        }).catch(() => {});

        return res.status(201).json({ success: true, review });
    } catch (error) {
        console.error('Error creating review:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
