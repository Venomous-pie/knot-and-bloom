import prisma from '../utils/prismaUtils.js';
import type { Request, Response } from 'express';
import Pricing from '../utils/pricingUtils.js';
import ErrorHandler from '../error/errorHandler.js';
import { socketService } from '../services/SocketService.js';

const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, productId, quantity, variant } = req.body;

        if (!customerId || !productId) {
            throw new ErrorHandler.ValidationError([
                { message: "Customer ID and Product ID are required.", path: ['customerId', 'productId'] }
            ]);
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
                throw new ErrorHandler.NotFoundError('Variant', variant);
            }

            // Check stock availability
            if (productVariant.stock < (quantity || 1)) {
                throw new ErrorHandler.ValidationError([{
                    message: `Insufficient stock for variant "${variant}". Available: ${productVariant.stock}`,
                    path: ['quantity']
                }]);
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

        // Real-time Update
        socketService.emitToRoom(`user_${customerId}`, 'cart:updated', { customerId: Number(customerId) });

        res.status(200).json({ message: "Product added to cart successfully." });

    } catch (error) {
        console.error("Error adding to cart:", error);
        if (error instanceof ErrorHandler.NotFoundError) {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error instanceof ErrorHandler.ValidationError) {
            res.status(400).json({ message: "Validation failed", issues: error.issues });
            return;
        }
        res.status(500).json({ message: "Internal server error." });
    }
};

const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId } = req.params;

        const cart = await prisma.cart.findUnique({
            where: { customerId: Number(customerId) },
            include: {
                items: {
                    include: {
                        product: true,
                        productVariant: true
                    },
                    orderBy: {
                        uid: 'asc'
                    }
                }
            }
        });

        if (!cart) {
            res.status(200).json({
                cart: {
                    items: [],
                    subtotal: 0,
                    totalSavings: 0,
                    itemCount: 0
                }
            });
            return;
        }

        let subtotal = 0;
        let totalSavings = 0;

        const itemsWithPrices = cart.items.map(item => {
            const product = {
                basePrice: Number(item.product.basePrice),
                discountPercentage: item.product.discountPercentage
            };

            const variant = item.productVariant ? {
                price: item.productVariant.price ? Number(item.productVariant.price) : null,
                discountPercentage: item.productVariant.discountPercentage
            } : null;

            const priceCalc = Pricing.calculateFinalPrice(product, variant);

            const lineTotal = priceCalc.finalPrice * item.quantity;
            subtotal += lineTotal;

            if (priceCalc.hasDiscount) {
                const fullPriceTotal = priceCalc.effectivePrice * item.quantity;
                totalSavings += fullPriceTotal - lineTotal;
            }

            return {
                ...item,
                priceInfo: {
                    effectivePrice: priceCalc.effectivePrice,
                    discountPercentage: priceCalc.discountPercentage,
                    finalPrice: priceCalc.finalPrice,
                    hasDiscount: priceCalc.hasDiscount,
                    lineTotal: Math.round(lineTotal * 100) / 100
                }
            };
        });

        res.status(200).json({
            cart: {
                ...cart,
                items: itemsWithPrices,
                subtotal: Math.round(subtotal * 100) / 100,
                totalSavings: Math.round(totalSavings * 100) / 100,
                itemCount: cart.items.length
            }
        });

    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (quantity < 1) {
            throw new ErrorHandler.ValidationError([{ message: "Quantity must be at least 1.", path: ['quantity'] }]);
        }

        const updatedItem = await prisma.cartItem.update({
            where: { uid: Number(itemId) },
            data: { quantity: Number(quantity) },
            include: { cart: true } // Include cart to get customerId
        });

        // Real-time Update
        if (updatedItem && updatedItem.cart) {
            socketService.emitToRoom(`user_${updatedItem.cart.customerId}`, 'cart:updated', { customerId: updatedItem.cart.customerId });
        }

        res.status(200).json({ message: "Cart item updated." });

    } catch (error) {
        console.error("Error updating cart item:", error);
        if (error instanceof ErrorHandler.ValidationError) {
            res.status(400).json({ message: "Validation failed", issues: error.issues });
            return;
        }
        res.status(500).json({ message: "Internal server error." });
    }
};

const removeFromCart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId } = req.params;

        // Find first to get customerId (since delete doesn't allow include on some versions, or to be safe if it fails)
        // But prisma delete returns the record.
        try {
            const deletedItem = await prisma.cartItem.delete({
                where: { uid: Number(itemId) },
                include: { cart: true }
            });

            // Real-time Update
            if (deletedItem && deletedItem.cart) {
                socketService.emitToRoom(`user_${deletedItem.cart.customerId}`, 'cart:updated', { customerId: deletedItem.cart.customerId });
            }
        } catch (e: any) {
            // Ignore if record not found (idempotent)
            if (e.code !== 'P2025') {
                throw e;
            }
        }

        res.status(200).json({ message: "Item removed from cart." });

    } catch (error) {
        console.error("Error removing cart item:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

const checkout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, selectedItemIds } = req.body; // Expecting array of CartItem UIDs

        if (!customerId || !selectedItemIds || !Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
            throw new ErrorHandler.ValidationError([{ message: "Customer ID and selected items are required for checkout.", path: ['selectedItemIds'] }]);
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
            throw new ErrorHandler.ValidationError([{ message: "No selected items found in cart.", path: ['selectedItemIds'] }]);
        }

        // Calculate total and prepare products array with full details
        let totalAmount = 0;

        const orderedProductsData = cart.items.map(item => {
            const product = {
                basePrice: Number(item.product.basePrice),
                discountPercentage: item.product.discountPercentage
            };

            const variant = item.productVariant ? {
                price: item.productVariant.price ? Number(item.productVariant.price) : null,
                discountPercentage: item.productVariant.discountPercentage
            } : null;

            const priceCalc = Pricing.calculateFinalPrice(product, variant);

            const lineTotal = priceCalc.finalPrice * item.quantity;
            totalAmount += lineTotal;

            return {
                product: {
                    uid: item.product.uid,
                    name: item.product.name,
                    image: item.product.image,
                    basePrice: item.product.basePrice,
                    discountedPrice: item.product.discountedPrice,
                    discountPercentage: item.product.discountPercentage
                    // add more details later
                },
                quantity: item.quantity,
                variant: item.productVariant ? {
                    uid: item.productVariant.uid,
                    name: item.productVariant.name,
                    price: item.productVariant.price,
                    discountPercentage: item.productVariant.discountPercentage
                } : null,
                priceInfo: {
                    effectivePrice: priceCalc.effectivePrice,
                    discountPercentage: priceCalc.discountPercentage,
                    finalPrice: priceCalc.finalPrice,
                    hasDiscount: priceCalc.hasDiscount,
                    lineTotal: Math.round(lineTotal * 100) / 100
                }
            };
        });

        // Validate stock availability for all items (variant-specific)
        for (const item of cart.items) {
            if (item.productVariant) {
                // Check variant stock
                if (item.productVariant.stock < item.quantity) {
                    throw new ErrorHandler.ValidationError([
                        { message: `Insufficient stock for ${item.product.name} (${item.productVariant.name}). Available: ${item.productVariant.stock}, Requested: ${item.quantity}`, path: ['quantity'] }
                    ]);
                }
            }
        }

        // Create Order and Update Variant Stock in a transaction
        const order = await prisma.$transaction(async (tx) => {

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
                        throw new ErrorHandler.ValidationError([
                            { message: `Insufficient stock for ${item.product.name} (${item.productVariant.name}). requested: ${item.quantity}`, path: ['quantity'] }
                        ]);
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
        if (error instanceof ErrorHandler.ValidationError) {
            res.status(400).json({ message: "Validation failed", issues: error.issues });
            return;
        }
        res.status(500).json({ message: "Internal server error." });
    }
};

export default {
    addToCart,
    getCart,
    updateCartItem,
    removeFromCart,
    checkout
}