import type { Request, Response } from 'express';
import { CheckoutStatus, OrderStatus, PaymentStatus } from '../../generated/prisma/index.js';
import { AuditService } from '../services/AuditService.js';
import { PaymentService } from '../services/PaymentService.js';
import prisma from '../utils/prisma.js';

// Session expiration time (15 minutes)
const SESSION_EXPIRY_MS = 15 * 60 * 1000;

// Payment timeout (45 seconds)
const PAYMENT_TIMEOUT_MS = 45000;

interface CartItemWithDetails {
    uid: number;
    quantity: number;
    productId: number;
    productVariantId: number | null;
    product: {
        uid: number;
        name: string;
        image: string | null;
        basePrice: any;
        discountPercentage: number | null;
        discountedPrice: any;
    };
    productVariant: {
        uid: number;
        name: string;
        price: any;
        discountPercentage: number | null;
        discountedPrice: any;
        stock: number;
        image: string | null;
    } | null;
}

interface LockedPriceItem {
    itemUid: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    finalPrice: number;
    productName: string;
    variantName: string | null;
    image: string | null;
}

/**
 * Calculate effective price for a cart item
 */
function calculateItemPrice(item: CartItemWithDetails): { unitPrice: number; discountPercentage: number; finalPrice: number } {
    // Variant price overrides base price
    const basePrice = item.productVariant?.price
        ? Number(item.productVariant.price)
        : Number(item.product.basePrice);

    // Variant discount overrides product discount
    const discountPercentage = item.productVariant?.discountPercentage
        ?? item.product.discountPercentage
        ?? 0;

    const finalPrice = discountPercentage > 0
        ? basePrice * (1 - discountPercentage / 100)
        : basePrice;

    return { unitPrice: basePrice, discountPercentage, finalPrice };
}

/**
 * Initiate Checkout Session
 * Creates a new checkout session with locked prices and cart snapshot
 */
export const initiateCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerId, selectedItemIds, idempotencyKey } = req.body;

        if (!customerId || !selectedItemIds || !Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
            res.status(400).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Customer ID and selected items are required.',
            });
            return;
        }

        if (!idempotencyKey) {
            res.status(400).json({
                success: false,
                error: 'MISSING_IDEMPOTENCY_KEY',
                message: 'Idempotency key is required to prevent duplicate checkouts.',
            });
            return;
        }

        // Check for existing session with same idempotency key
        const existingSession = await prisma.checkoutSession.findUnique({
            where: { idempotencyKey },
        });

        if (existingSession) {
            // Return existing session (idempotent response)
            res.status(200).json({
                success: true,
                sessionId: existingSession.uid,
                status: existingSession.status,
                message: 'Existing checkout session returned.',
                isExisting: true,
            });
            return;
        }

        // Fetch cart items with product details
        const cart = await prisma.cart.findUnique({
            where: { customerId: Number(customerId) },
            include: {
                items: {
                    where: {
                        uid: { in: selectedItemIds.map((id: any) => Number(id)) },
                    },
                    include: {
                        product: true,
                        productVariant: true,
                    },
                },
            },
        });

        if (!cart || cart.items.length === 0) {
            res.status(400).json({
                success: false,
                error: 'EMPTY_CART',
                message: 'No selected items found in cart.',
            });
            return;
        }

        // Validate stock availability for all items
        const stockIssues: string[] = [];
        for (const item of cart.items) {
            if (item.productVariant) {
                if (item.productVariant.stock < item.quantity) {
                    stockIssues.push(
                        `"${item.product.name}" (${item.productVariant.name}): Only ${item.productVariant.stock} available, requested ${item.quantity}`
                    );
                }
            }
        }

        if (stockIssues.length > 0) {
            res.status(400).json({
                success: false,
                error: 'INSUFFICIENT_STOCK',
                message: 'Some items have insufficient stock.',
                details: stockIssues,
            });
            return;
        }

        // Lock prices and create snapshot
        let totalAmount = 0;
        const lockedPrices: LockedPriceItem[] = cart.items.map(item => {
            const { unitPrice, discountPercentage, finalPrice } = calculateItemPrice(item as CartItemWithDetails);
            const lineTotal = finalPrice * item.quantity;
            totalAmount += lineTotal;

            return {
                itemUid: item.uid,
                productId: item.productId,
                variantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice,
                discountPercentage,
                finalPrice,
                productName: item.product.name,
                variantName: item.productVariant?.name ?? null,
                image: item.productVariant?.image ?? item.product.image ?? null,
            };
        });

        // Create checkout session
        const session = await prisma.checkoutSession.create({
            data: {
                customerId: Number(customerId),
                cartSnapshot: JSON.stringify(cart.items),
                lockedPrices: JSON.stringify(lockedPrices),
                totalAmount,
                status: CheckoutStatus.INITIATED,
                expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
                idempotencyKey,
            },
        });

        AuditService.logCheckout('CHECKOUT_INITIATED', session.uid, Number(customerId), {
            itemCount: lockedPrices.length,
            totalAmount,
        });

        res.status(201).json({
            success: true,
            sessionId: session.uid,
            lockedPrices,
            totalAmount,
            expiresAt: session.expiresAt,
            message: 'Checkout session created successfully.',
        });

    } catch (error) {
        console.error('Error initiating checkout:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to initiate checkout. Please try again.',
        });
    }
};

/**
 * Get Checkout Session
 * Retrieves current session status and details
 */
export const getCheckoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
            include: {
                payments: true,
            },
        });

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Checkout session not found.',
            });
            return;
        }

        // Check if session has expired
        if (session.expiresAt < new Date() && session.status !== CheckoutStatus.COMPLETED) {
            await prisma.checkoutSession.update({
                where: { uid: session.uid },
                data: { status: CheckoutStatus.EXPIRED },
            });

            res.status(410).json({
                success: false,
                error: 'SESSION_EXPIRED',
                message: 'Checkout session has expired. Please start a new checkout.',
            });
            return;
        }

        res.status(200).json({
            success: true,
            session: {
                uid: session.uid,
                status: session.status,
                lockedPrices: JSON.parse(session.lockedPrices),
                totalAmount: Number(session.totalAmount),
                expiresAt: session.expiresAt,
                payments: session.payments,
            },
        });

    } catch (error) {
        console.error('Error getting checkout session:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to retrieve checkout session.',
        });
    }
};

/**
 * Validate Checkout
 * Re-validates stock before payment. Uses locked prices.
 */
export const validateCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
        });

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Checkout session not found.',
            });
            return;
        }

        if (session.expiresAt < new Date()) {
            res.status(410).json({
                success: false,
                error: 'SESSION_EXPIRED',
                message: 'Checkout session has expired. Please start a new checkout.',
            });
            return;
        }

        if (session.status === CheckoutStatus.COMPLETED) {
            res.status(400).json({
                success: false,
                error: 'SESSION_COMPLETED',
                message: 'This checkout has already been completed.',
            });
            return;
        }

        // Update status
        await prisma.checkoutSession.update({
            where: { uid: session.uid },
            data: { status: CheckoutStatus.VALIDATING },
        });

        const lockedPrices: LockedPriceItem[] = JSON.parse(session.lockedPrices);

        // Re-validate stock for all items
        const stockIssues: Array<{ productName: string; variantName: string | null; available: number; requested: number }> = [];
        const priceChanges: Array<{ productName: string; variantName: string | null; oldPrice: number; newPrice: number }> = [];

        for (const item of lockedPrices) {
            if (item.variantId) {
                const variant = await prisma.productVariant.findUnique({
                    where: { uid: item.variantId },
                    include: { product: true },
                });

                if (!variant) {
                    stockIssues.push({
                        productName: item.productName,
                        variantName: item.variantName,
                        available: 0,
                        requested: item.quantity,
                    });
                    continue;
                }

                if (variant.stock < item.quantity) {
                    stockIssues.push({
                        productName: item.productName,
                        variantName: item.variantName,
                        available: variant.stock,
                        requested: item.quantity,
                    });
                }

                // Check for price changes (informational - we use locked prices)
                const currentPrice = variant.price ? Number(variant.price) : Number(variant.product.basePrice);
                const currentDiscount = variant.discountPercentage ?? variant.product.discountPercentage ?? 0;
                const currentFinalPrice = currentDiscount > 0 ? currentPrice * (1 - currentDiscount / 100) : currentPrice;

                if (Math.abs(currentFinalPrice - item.finalPrice) > 0.01) {
                    priceChanges.push({
                        productName: item.productName,
                        variantName: item.variantName,
                        oldPrice: item.finalPrice,
                        newPrice: currentFinalPrice,
                    });
                }
            }
        }

        if (stockIssues.length > 0) {
            await prisma.checkoutSession.update({
                where: { uid: session.uid },
                data: { status: CheckoutStatus.FAILED },
            });

            AuditService.logCheckout('CHECKOUT_VALIDATION_FAILED', session.uid, session.customerId, {
                stockIssues,
            });

            res.status(400).json({
                success: false,
                error: 'STOCK_VALIDATION_FAILED',
                message: 'Some items are no longer available.',
                stockIssues,
            });
            return;
        }

        // Update to awaiting payment
        await prisma.checkoutSession.update({
            where: { uid: session.uid },
            data: { status: CheckoutStatus.AWAITING_PAYMENT },
        });

        AuditService.logCheckout('CHECKOUT_VALIDATED', session.uid, session.customerId, {
            priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
        });

        res.status(200).json({
            success: true,
            message: 'Checkout validated successfully.',
            priceChanges: priceChanges.length > 0 ? priceChanges : undefined,
            note: priceChanges.length > 0 ? 'Some prices have changed since checkout started. You will be charged the original locked prices.' : undefined,
        });

    } catch (error) {
        console.error('Error validating checkout:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to validate checkout.',
        });
    }
};

/**
 * Process Payment
 * Handles payment processing with idempotency and timeout
 */
export const processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { paymentMethod, idempotencyKey } = req.body;

        if (!paymentMethod || !idempotencyKey) {
            res.status(400).json({
                success: false,
                error: 'INVALID_REQUEST',
                message: 'Payment method and idempotency key are required.',
            });
            return;
        }

        // Validate payment method
        if (!PaymentService.validatePaymentMethod(paymentMethod)) {
            res.status(400).json({
                success: false,
                error: 'INVALID_PAYMENT_METHOD',
                message: `Invalid payment method. Available methods: ${PaymentService.getAvailableMethods().join(', ')}`,
            });
            return;
        }

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
        });

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Checkout session not found.',
            });
            return;
        }

        if (session.status === CheckoutStatus.COMPLETED) {
            res.status(400).json({
                success: false,
                error: 'ALREADY_COMPLETED',
                message: 'This checkout has already been completed.',
            });
            return;
        }

        if (session.expiresAt < new Date()) {
            res.status(410).json({
                success: false,
                error: 'SESSION_EXPIRED',
                message: 'Checkout session has expired. Please start a new checkout.',
            });
            return;
        }

        // Check for existing payment with same idempotency key
        const existingPayment = await prisma.payment.findUnique({
            where: { idempotencyKey },
        });

        if (existingPayment) {
            // Return existing payment result (idempotent)
            res.status(200).json({
                success: existingPayment.status === PaymentStatus.SUCCEEDED,
                paymentId: existingPayment.uid,
                status: existingPayment.status,
                message: 'Existing payment returned (idempotent response).',
                isExisting: true,
            });
            return;
        }

        // Update session status
        await prisma.checkoutSession.update({
            where: { uid: session.uid },
            data: { status: CheckoutStatus.PROCESSING_PAYMENT },
        });

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                checkoutSessionId: session.uid,
                amount: session.totalAmount,
                method: paymentMethod.toUpperCase(),
                status: PaymentStatus.PROCESSING,
                idempotencyKey,
            },
        });

        AuditService.logPayment('PAYMENT_INITIATED', payment.uid, session.customerId, {
            amount: Number(session.totalAmount),
            method: paymentMethod,
        });

        // Process payment through gateway
        const paymentResult = await PaymentService.processPayment({
            amount: Number(session.totalAmount),
            method: paymentMethod,
            idempotencyKey,
            customerId: session.customerId,
        }, PAYMENT_TIMEOUT_MS);

        if (paymentResult.success) {
            // Update payment record
            await prisma.payment.update({
                where: { uid: payment.uid },
                data: {
                    status: PaymentStatus.SUCCEEDED,
                    gatewayRef: paymentResult.gatewayRef ?? null,
                },
            });

            AuditService.logPayment('PAYMENT_SUCCEEDED', payment.uid, session.customerId, {
                gatewayRef: paymentResult.gatewayRef,
            });

            res.status(200).json({
                success: true,
                paymentId: payment.uid,
                gatewayRef: paymentResult.gatewayRef,
                message: 'Payment processed successfully.',
            });
        } else {
            // Update payment record
            await prisma.payment.update({
                where: { uid: payment.uid },
                data: {
                    status: PaymentStatus.FAILED,
                    errorMessage: paymentResult.errorMessage ?? null,
                    attempts: { increment: 1 },
                },
            });

            // Update session status back to awaiting payment (allow retry)
            await prisma.checkoutSession.update({
                where: { uid: session.uid },
                data: { status: CheckoutStatus.AWAITING_PAYMENT },
            });

            AuditService.logPayment('PAYMENT_FAILED', payment.uid, session.customerId, undefined, paymentResult.errorMessage);

            res.status(400).json({
                success: false,
                error: paymentResult.errorCode || 'PAYMENT_FAILED',
                message: paymentResult.errorMessage || 'Payment failed. Please try again or use a different payment method.',
                paymentId: payment.uid,
            });
        }

    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Payment processing failed. Please try again.',
        });
    }
};

/**
 * Complete Checkout
 * Finalizes order after successful payment - atomic stock update and order creation
 */
export const completeCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { paymentId, idempotencyKey } = req.body;

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
            include: {
                payments: {
                    where: { status: PaymentStatus.SUCCEEDED },
                    take: 1,
                },
            },
        });

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Checkout session not found.',
            });
            return;
        }

        if (session.status === CheckoutStatus.COMPLETED) {
            // Find existing order
            const existingOrder = await prisma.order.findFirst({
                where: {
                    customerId: session.customerId,
                    idempotencyKey: session.idempotencyKey,
                },
            });

            res.status(200).json({
                success: true,
                orderId: existingOrder?.uid,
                message: 'Order already completed (idempotent response).',
                isExisting: true,
            });
            return;
        }

        // Verify payment success
        const successfulPayment = session.payments[0];
        if (!successfulPayment && paymentId) {
            const payment = await prisma.payment.findUnique({
                where: { uid: Number(paymentId) },
            });
            if (!payment || payment.status !== PaymentStatus.SUCCEEDED) {
                res.status(400).json({
                    success: false,
                    error: 'PAYMENT_NOT_FOUND',
                    message: 'No successful payment found for this checkout.',
                });
                return;
            }
        }

        const lockedPrices: LockedPriceItem[] = JSON.parse(session.lockedPrices);

        // Atomic transaction: update stock and create order
        const order = await prisma.$transaction(async (tx) => {
            // Update stock for each item
            for (const item of lockedPrices) {
                if (item.variantId) {
                    const result = await tx.productVariant.updateMany({
                        where: {
                            uid: item.variantId,
                            stock: { gte: item.quantity },
                        },
                        data: {
                            stock: { decrement: item.quantity },
                        },
                    });

                    if (result.count === 0) {
                        throw new Error(`Insufficient stock for ${item.productName} (${item.variantName})`);
                    }
                }
            }

            // Prepare order products data
            const orderedProducts = lockedPrices.map(item => ({
                product: {
                    uid: item.productId,
                    name: item.productName,
                    image: item.image,
                },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                finalPrice: item.finalPrice,
                discountPercentage: item.discountPercentage,
                variant: item.variantName ? {
                    uid: item.variantId,
                    name: item.variantName,
                } : null,
            }));

            // Create order
            const newOrder = await tx.order.create({
                data: {
                    customerId: session.customerId,
                    products: JSON.stringify(orderedProducts),
                    total: session.totalAmount,
                    discount: 0,
                    status: OrderStatus.CONFIRMED,
                    idempotencyKey: idempotencyKey || session.idempotencyKey,
                },
            });

            // Link payment to order
            if (successfulPayment) {
                await tx.payment.update({
                    where: { uid: successfulPayment.uid },
                    data: { orderId: newOrder.uid },
                });
            }

            return newOrder;
        });

        // Update session status
        await prisma.checkoutSession.update({
            where: { uid: session.uid },
            data: { status: CheckoutStatus.COMPLETED },
        });

        // Clear purchased items from cart
        await prisma.cartItem.deleteMany({
            where: {
                uid: { in: lockedPrices.map(item => item.itemUid) },
            },
        });

        AuditService.logOrder('ORDER_CREATED', order.uid, session.customerId, {
            total: Number(session.totalAmount),
            itemCount: lockedPrices.length,
        });

        AuditService.logCheckout('CHECKOUT_COMPLETED', session.uid, session.customerId, {
            orderId: order.uid,
        });

        res.status(201).json({
            success: true,
            orderId: order.uid,
            message: 'Order placed successfully!',
        });

    } catch (error) {
        console.error('Error completing checkout:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to complete checkout.',
        });
    }
};

/**
 * Cancel Checkout
 * Cancels an active checkout session
 */
export const cancelCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
        });

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Checkout session not found.',
            });
            return;
        }

        if (session.status === CheckoutStatus.COMPLETED) {
            res.status(400).json({
                success: false,
                error: 'CANNOT_CANCEL',
                message: 'Cannot cancel a completed checkout.',
            });
            return;
        }

        await prisma.checkoutSession.update({
            where: { uid: session.uid },
            data: { status: CheckoutStatus.CANCELLED },
        });

        AuditService.logCheckout('CHECKOUT_CANCELLED', session.uid, session.customerId);

        res.status(200).json({
            success: true,
            message: 'Checkout session cancelled.',
        });

    } catch (error) {
        console.error('Error cancelling checkout:', error);
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to cancel checkout.',
        });
    }
};

/**
 * Get available payment methods
 */
export const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        success: true,
        methods: PaymentService.getAvailableMethods(),
    });
};

export default {
    initiateCheckout,
    getCheckoutSession,
    validateCheckout,
    processPayment,
    completeCheckout,
    cancelCheckout,
    getPaymentMethods,
};
