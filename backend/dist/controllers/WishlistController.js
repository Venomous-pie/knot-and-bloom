import prisma from '../utils/prismaUtils.js';
export const WishlistController = {
    getWishlist: async (req, res) => {
        try {
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                return res.status(400).json({ error: 'Invalid customer ID' });
            }
            // Verify the request comes from the owner
            if (req.user && req.user.id !== customerId) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            let wishlist = await prisma.wishlist.findUnique({
                where: { customerId },
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
        }
        catch (error) {
            console.error('Error fetching wishlist:', error);
            res.status(500).json({ error: 'Failed to fetch wishlist' });
        }
    },
    toggleWishlistItem: async (req, res) => {
        try {
            const customerId = parseInt(req.params.customerId);
            const { productId } = req.body;
            if (isNaN(customerId) || typeof productId !== 'number') {
                return res.status(400).json({ error: 'Invalid customer ID or product ID' });
            }
            if (req.user && req.user.id !== customerId) {
                return res.status(403).json({ error: 'Forbidden' });
            }
            // Ensure wishlist exists
            const wishlist = await prisma.wishlist.upsert({
                where: { customerId },
                update: {},
                create: { customerId }
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
            }
            else {
                // Add item
                await prisma.wishlistItem.create({
                    data: {
                        wishlistId: wishlist.uid,
                        productId
                    }
                });
                return res.json({ success: true, action: 'added' });
            }
        }
        catch (error) {
            console.error('Error toggling wishlist item:', error);
            res.status(500).json({ error: 'Failed to update wishlist' });
        }
    }
};
//# sourceMappingURL=WishlistController.js.map