import type { Request, Response } from 'express';
import prisma from '../utils/prismaUtils.js';

export const WishlistController = {
    getWishlist: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            let wishlist = await prisma.wishlist.findUnique({
                where: { userId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    variants: true,
                                    seller: {
                                        select: {
                                            uid: true,
                                            name: true,
                                            slug: true
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    }
                }
            });

            if (!wishlist) {
                // Return an empty wishlist if it doesn't exist yet
                return res.json({ wishlist: { items: [] } });
            }

            res.json({ wishlist });
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            res.status(500).json({ error: 'Failed to fetch wishlist' });
        }
    },

    toggleWishlistItem: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            const { productId } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            if (typeof productId !== 'number') {
                return res.status(400).json({ error: 'Invalid product ID' });
            }

            // Ensure wishlist exists
            const wishlist = await prisma.wishlist.upsert({
                where: { userId },
                update: {},
                create: { userId }
            });

            // Check if item already exists
            const existingItem = await prisma.wishlistItem.findUnique({
                where: {
                    wishlistId_productId: {
                        wishlistId: wishlist.uid,
                        productId
                    }
                }
            });

            if (existingItem) {
                // Remove item
                await prisma.wishlistItem.delete({
                    where: { uid: existingItem.uid }
                });
                return res.json({ success: true, action: 'removed' });
            } else {
                // Add item
                await prisma.wishlistItem.create({
                    data: {
                        wishlistId: wishlist.uid,
                        productId
                    }
                });
                return res.json({ success: true, action: 'added' });
            }
        } catch (error) {
            console.error('Error toggling wishlist item:', error);
            res.status(500).json({ error: 'Failed to update wishlist' });
        }
    }
};
