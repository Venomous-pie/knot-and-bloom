import type { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const addToCart = async (req: Request, res: Response): Promise<void> => {
    console.log("Backend: addToCart controller hit");
    try {
        console.log("Backend: Request body:", req.body);
        const { customerId, productId, quantity, variant } = req.body;

        if (!customerId || !productId) {
            res.status(400).json({ message: "Customer ID and Product ID are required." });
            return;
        }

        // Find the product variant
        let productVariant = null;
        if (variant) {
            productVariant = await prisma.productVariant.findFirst({
                where: {
                    productId: Number(productId),
                    name: variant
                }
            });

            if (!productVariant) {
                res.status(404).json({ message: `Variant "${variant}" not found for this product.` });
                return;
            }

            // Check stock availability
            if (productVariant.stock < (quantity || 1)) {
                res.status(400).json({
                    message: `Insufficient stock for variant "${variant}". Available: ${productVariant.stock}`
                });
                return;
            }
        }

        // Find or create cart for customer
        let cart = await prisma.cart.findUnique({
            where: { customerId: Number(customerId) }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { customerId: Number(customerId) }
            });
        }

        // Check if item already exists in cart
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.uid,
                productId: Number(productId),
                productVariantId: productVariant?.uid || null
            }
        });

        if (existingItem) {
            // Update quantity
            await prisma.cartItem.update({
                where: { uid: existingItem.uid },
                data: { quantity: existingItem.quantity + (quantity || 1) }
            });
        } else {
            // Create new item
            await prisma.cartItem.create({
                data: {
                    cartId: cart.uid,
                    productId: Number(productId),
                    productVariantId: productVariant?.uid || null,
                    quantity: quantity || 1,
                }
            });
        }

        res.status(200).json({ message: "Product added to cart successfully." });

    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId } = req.params;

        const cart = await prisma.cart.findUnique({
            where: { customerId: Number(customerId) },
            include: {
                items: {
                    include: {
                        product: true,
                        productVariant: true  // Include variant details
                    },
                    orderBy: {
                        uid: 'asc'
                    }
                }
            }
        });

        if (!cart) {
            res.status(200).json({ cart: { items: [] } }); // Return empty cart structure
            return;
        }

        res.status(200).json({ cart });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            res.status(400).json({ message: "Quantity must be at least 1." });
            return;
        }

        await prisma.cartItem.update({
            where: { uid: Number(itemId) },
            data: { quantity: Number(quantity) }
        });

        res.status(200).json({ message: "Cart item updated." });

    } catch (error) {
        console.error("Error updating cart item:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        console.log(`Backend: removeFromCart called with itemId: ${itemId}, type: ${typeof itemId}`);

        // Use deleteMany to avoid error if item doesn't exist (idempotent)
        const result = await prisma.cartItem.deleteMany({
            where: { uid: Number(itemId) }
        });

        console.log(`Backend: Delete result:`, result);

        if (result.count === 0) {
            console.log(`Remove item: Item ${itemId} not found (already deleted?)`);
        } else {
            console.log(`Remove item: Successfully removed item ${itemId}`);
        }

        res.status(200).json({ message: "Item removed from cart." });

    } catch (error) {
        console.error("Error removing cart item:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

export const checkout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, selectedItemIds } = req.body; // Expecting array of CartItem UIDs

        if (!customerId || !selectedItemIds || !Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
            res.status(400).json({ message: "Customer ID and selected items are required for checkout." });
            return;
        }

        const cart = await prisma.cart.findUnique({
            where: { customerId: Number(customerId) },
            include: {
                items: {
                    where: {
                        uid: { in: selectedItemIds.map((id: any) => Number(id)) }
                    },
                    include: {
                        product: true,
                        productVariant: true  // Include variant for stock validation
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            res.status(400).json({ message: "No selected items found in cart." });
            return;
        }

        // Calculate total and prepare products array with full details
        let totalAmount = 0;
        const orderedProductsData = cart.items.map(item => {
            // Apply standardized pricing logic: effectivePrice = variant.price ?? basePrice
            const effectivePrice = Number(
                item.productVariant?.price ?? item.product.basePrice
            );

            // Apply discount hierarchy: variant discount > product discount
            const discountPercentage =
                item.productVariant?.discountPercentage ??
                item.product.discountPercentage ??
                0;

            // Calculate final price with discount applied
            const finalPrice = discountPercentage > 0
                ? effectivePrice * (1 - discountPercentage / 100)
                : effectivePrice;

            const lineTotal = finalPrice * item.quantity;
            totalAmount += lineTotal;

            return {
                product: {
                    uid: item.product.uid,
                    name: item.product.name,
                    image: item.product.image,
                    basePrice: item.product.basePrice,
                    discountedPrice: item.product.discountedPrice,
                    discountPercentage: item.product.discountPercentage
                },
                quantity: item.quantity,
                variant: item.productVariant ? {
                    uid: item.productVariant.uid,
                    name: item.productVariant.name,
                    price: item.productVariant.price,
                    discountPercentage: item.productVariant.discountPercentage
                } : null
            };
        });

        // Validate stock availability for all items (variant-specific)
        for (const item of cart.items) {
            if (item.productVariant) {
                // Check variant stock
                if (item.productVariant.stock < item.quantity) {
                    res.status(400).json({
                        message: `Insufficient stock for ${item.product.name} (${item.productVariant.name}). Available: ${item.productVariant.stock}, Requested: ${item.quantity}`
                    });
                    return;
                }
            }
        }

        // Create Order and Update Variant Stock in a transaction
        const order = await prisma.$transaction(async (tx) => {
            // 1. Update variant stock for each item ATOMICALLY
            // This is the critical part for concurrency.
            // We use updateMany with a where clause checking stock >= quantity.
            // If the update affects 0 rows, it means stock was insufficient (or variant deleted).

            for (const item of cart.items) {
                if (item.productVariant) {
                    const result = await tx.productVariant.updateMany({
                        where: {
                            uid: item.productVariant.uid,
                            stock: {
                                gte: item.quantity // ATOMIC CHECK: Only update if stock is sufficient
                            }
                        },
                        data: {
                            stock: {
                                decrement: item.quantity
                            }
                        }
                    });

                    if (result.count === 0) {
                        // Throw error to rollback transaction
                        throw new Error(`Insufficient stock for ${item.product.name} (${item.productVariant.name}). requested: ${item.quantity}`);
                    }

                    console.log(`✅ Atomic stock update successful for ${item.product.name} (${item.productVariant.name})`);
                }
            }

            // 2. Create the order (only reachable if all stock updates succeeded)
            const newOrder = await tx.order.create({
                data: {
                    customerId: Number(customerId),
                    products: JSON.stringify(orderedProductsData),
                    total: totalAmount,
                    discount: 0, // Placeholder
                }
            });

            return newOrder;
        });

        // Remove ONLY selected items from Cart
        await prisma.cartItem.deleteMany({
            where: {
                uid: { in: selectedItemIds.map((id: any) => Number(id)) }
            }
        });

        res.status(200).json({ message: "Order placed successfully!", orderId: order.uid });

    } catch (error) {
        console.error("Error during checkout:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};
