import type { Request, Response } from 'express';
import prisma from '../utils/prismaUtils.js';

export const WishlistController = {
    getWishlist: async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.userId as string);

            if (isNaN(userId)) {
                return res.status(400).json({ error: 'Invalid user ID' });
            }

            // Verify the request comes from the owner
            if (req.user && (req.user as any).id !== userId) {
                return res.status(403).json({ error: 'Forbidden' });
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
            const userId = parseInt(req.params.userId as string);
            const { productId } = req.body;

            if (isNaN(userId) || typeof productId !== 'number') {
                return res.status(400).json({ error: 'Invalid user ID or product ID' });
            }

            if (req.user && (req.user as any).id !== userId) {
                return res.status(403).json({ error: 'Forbidden' });
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
