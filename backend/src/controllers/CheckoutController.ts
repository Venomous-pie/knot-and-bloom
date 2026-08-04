import prisma from '../utils/prismaUtils.js';
import Pricing from '../utils/pricingUtils.js';
import ErrorHandler from '../error/errorHandler.js';
import type { Request, Response } from 'express';
import { CheckoutStatus, OrderStatus, PaymentStatus } from '../../generated/prisma/index.js';
import { AuditService } from '../services/AuditService.js';
import { notifications } from '../services/notificationService.js';
import { PaymentService } from '../services/PaymentService.js';
import { supabaseService } from '../services/SupabaseService.js';
import { SellerService } from '../services/SellerService.js';
import { generateOrderReference } from '../utils/orderUtils.js';
import { groupItemsBySeller, buildOrderedProducts, resolveSellerShipping } from '../utils/checkoutHelpers.js';
import { getShippingConfig } from '../utils/platformConfigUtils.js';
import { ShipmentType, VehicleType } from '../../generated/prisma/client.js';

import type {
    LockedPriceItem,
} from '../types/checkoutTypes.js';

// Session expiration time (15 minutes)
const SESSION_EXPIRY_MS = 15 * 60 * 1000;

// Payment timeout (45 seconds)
const PAYMENT_TIMEOUT_MS = 45000;

// Shipping fee constants (legacy, mostly replaced)
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING_FEE = 60;

const initiateCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Security: Use authenticated user's ID, not a client-supplied userId
        const userId = req.user?.id;
        const { selectedItemIds, idempotencyKey } = req.body;

        if (!userId || !selectedItemIds || !Array.isArray(selectedItemIds) || selectedItemIds.length === 0) {
            throw new ErrorHandler.ValidationError([{ message: 'Authentication and selected items are required.', path: ['selectedItemIds'] }]);
        }

        if (!idempotencyKey) {
            throw new ErrorHandler.ValidationError([{ message: 'Idempotency key is required to prevent duplicate checkouts.', path: ['idempotencyKey'] }]);
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
            where: { userId: Number(userId) },
            include: {
                items: {
                    where: {
                        uid: { in: selectedItemIds.map((id: any) => Number(id)) },
                    },
                    include: {
                        product: {
                            include: { seller: true }
                        },
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

        // Validate stock, calculate prices, and create session in an atomic transaction
        const sessionResult = await prisma.$transaction(async (tx) => {
            // Validate stock availability for all items
            const stockIssues: string[] = [];
            for (const item of cart.items) {
                if (item.productVariant) {
                    const availableStock = item.productVariant.stock - item.productVariant.reservedStock;
                    if (availableStock < item.quantity) {
                        stockIssues.push(
                            `"${item.product.name}" (${item.productVariant.name}): Only ${availableStock} available, requested ${item.quantity}`
                        );
                    }
                }
            }

            if (stockIssues.length > 0) {
                throw new ErrorHandler.ValidationError(stockIssues.map(msg => ({ message: msg, path: ['stock'] })));
            }

            // Reserve stock
            for (const item of cart.items) {
                if (item.productVariantId) {
                    await tx.productVariant.update({
                        where: { uid: item.productVariantId },
                        data: { reservedStock: { increment: item.quantity } }
                    });
                }
            }

            // Lock prices and create snapshot
            let totalAmount = 0;
            const lockedPrices: LockedPriceItem[] = cart.items.map(item => {
                const product = {
                    basePrice: Number(item.product.basePrice),
                    discountPercentage: item.product.discountPercentage
                };
                const variant = item.productVariant ? {
                    price: item.productVariant.price ? Number(item.productVariant.price) : null,
                    discountPercentage: item.productVariant.discountPercentage
                } : null;

                const { effectivePrice, discountPercentage, finalPrice } = Pricing.calculateFinalPrice(product, variant);

                const lineTotal = finalPrice * item.quantity;
                totalAmount += lineTotal;

                return {
                    itemUid: item.uid,
                    productId: item.productId,
                    variantId: item.productVariantId,
                    quantity: item.quantity,
                    unitPrice: effectivePrice,
                    discountPercentage,
                    finalPrice,
                    productName: item.product.name,
                    variantName: item.productVariant?.name ?? null,
                    image: item.productVariant?.images?.[0] ?? item.product.image ?? null,
                    sellerId: item.product.sellerId ?? null,
                    sellerName: item.product.seller?.name ?? null,
                    sellerLocation: item.product.seller?.businessAddress ?? null,
                };
            });

            // Create checkout session
            const platformFee = Number((totalAmount * 0.07).toFixed(2));
            const totalWithPlatformFee = totalAmount + platformFee;

            const session = await tx.checkoutSession.create({
                data: {
                    userId: Number(userId),
                    cartSnapshot: JSON.stringify(cart.items),
                    lockedPrices: JSON.stringify(lockedPrices),
                    totalAmount: totalWithPlatformFee,
                    status: CheckoutStatus.INITIATED,
                    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
                    idempotencyKey,
                },
            });

            return { session, lockedPrices, totalAmount, platformFee, totalWithPlatformFee };
        });

        const { session, lockedPrices, totalAmount, platformFee, totalWithPlatformFee } = sessionResult;

        AuditService.logCheckout('CHECKOUT_INITIATED', session.uid, Number(userId), {
            itemCount: lockedPrices.length,
            totalAmount,
        });


        // Identify unique sellers
        const sellerIds = [...new Set(lockedPrices.map(item => item.sellerId).filter((id): id is number => id !== null))];
        const sellerMetrics = await SellerService.getMetricsForSellers(sellerIds);

        // --- COD Eligibility Check ---
        // 1. Check if ANY product in the cart has isCodAllowed = false
        const productIdsInCart = cart.items.map(i => i.productId);
        const productsWithCodDisabled = await prisma.product.findMany({
            where: { uid: { in: productIdsInCart }, isCodAllowed: false },
            select: { uid: true, name: true }
        });
        const codAllowedByProducts = productsWithCodDisabled.length === 0;
        const codDisabledProductNames = productsWithCodDisabled.map(p => p.name);

        // 2. Check customer's cancellation count
        const customer = await prisma.user.findUnique({
            where: { uid: Number(userId) },
            select: { codCancellationCount: true }
        });
        const isRepeatOffender = (customer?.codCancellationCount ?? 0) >= 2;
        const codDepositPercent = isRepeatOffender ? 20 : 0;

        const codInfo = {
            allowed: codAllowedByProducts,
            depositPercent: codDepositPercent,
            disabledBy: codAllowedByProducts ? null : codDisabledProductNames,
            reason: !codAllowedByProducts ? 'Some products do not allow COD' : (isRepeatOffender ? 'A 20% deposit is required due to previous cancellations.' : null)
        };

        res.status(201).json({
            success: true,
            sessionId: session.uid,
            lockedPrices,
            totalAmount: totalWithPlatformFee,
            subtotal: totalAmount,
            platformFee,
            expiresAt: session.expiresAt,
            sellerMetrics,
            codInfo, // NEW
            message: 'Checkout session created successfully.',
        });

    } catch (error) {
        console.error('Error initiating checkout:', error);
        if (error instanceof ErrorHandler.ValidationError) {
            res.status(400).json({
                success: false,
                error: 'VALIDATION_FAILED',
                message: 'Validation failed',
                issues: error.issues
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to initiate checkout. Please try again.',
        });
    }
};

const getCheckoutSession = async (req: Request, res: Response): Promise<void> => {
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

        // Security: Verify session belongs to the requesting user
        if (session.userId !== req.user?.id) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
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

        const lockedPrices: LockedPriceItem[] = JSON.parse(session.lockedPrices);
        const subtotal = lockedPrices.reduce((sum, item) => sum + (item.quantity * item.finalPrice), 0);
        const platformFee = Number((subtotal * 0.07).toFixed(2));

        res.status(200).json({
            success: true,
            session: {
                uid: session.uid,
                status: session.status,
                lockedPrices,
                totalAmount: Number(session.totalAmount),
                subtotal,
                platformFee,
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

const validateCheckout = async (req: Request, res: Response): Promise<void> => {
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

        // Security: Verify session belongs to the requesting user
        if (session.userId !== req.user?.id) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
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
                const product = {
                    basePrice: Number(variant.product.basePrice),
                    discountPercentage: variant.product.discountPercentage
                };
                const variantData = {
                    price: variant.price ? Number(variant.price) : null,
                    discountPercentage: variant.discountPercentage
                };

                const { finalPrice: currentFinalPrice } = Pricing.calculateFinalPrice(product, variantData);

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

            AuditService.logCheckout('CHECKOUT_VALIDATION_FAILED', session.uid, session.userId, {
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

        AuditService.logCheckout('CHECKOUT_VALIDATED', session.uid, session.userId, {
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

const processPayment = async (req: Request, res: Response): Promise<void> => {
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

        // Security: Verify session belongs to the requesting user
        if (session.userId !== req.user?.id) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
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

        // Fetch customer to check COD eligibility
        const customer = await prisma.user.findUnique({
            where: { uid: session.userId },
            select: { codCancellationCount: true }
        });

        // COD Logic: Standard vs Restricted
        // Standard: 0% Deposit
        // Restricted (Repeat Offender): 20% Deposit
        let chargeAmount = Number(session.totalAmount);
        let requiresDeposit = false;

        if (paymentMethod === 'COD') {
            const isRepeatOffender = (customer?.codCancellationCount || 0) >= 2;

            if (isRepeatOffender) {
                // Require 20% deposit for risky users
                chargeAmount = chargeAmount * 0.20;
                requiresDeposit = true;
            } else {
                // Standard COD = No upfront charge
                chargeAmount = 0;
            }
        }


        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                checkoutSessionId: session.uid,
                amount: chargeAmount,
                method: paymentMethod.toUpperCase(),
                status: PaymentStatus.PROCESSING,
                idempotencyKey,
            },
        });

        AuditService.logPayment('PAYMENT_INITIATED', payment.uid, session.userId, {
            amount: chargeAmount,
            method: paymentMethod,
        });

        // Process payment through gateway
        const paymentResult = await PaymentService.processPayment({
            amount: chargeAmount,
            method: paymentMethod,
            idempotencyKey,
            userId: session.userId,
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

            AuditService.logPayment('PAYMENT_SUCCEEDED', payment.uid, session.userId, {
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

            AuditService.logPayment('PAYMENT_FAILED', payment.uid, session.userId, undefined, paymentResult.errorMessage);

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

const estimateShipping = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { shippingAddress, choices } = req.body;

        if (!shippingAddress || !choices) {
            res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'Missing address or choices' });
            return;
        }

        const session = await prisma.checkoutSession.findUnique({
            where: { uid: Number(sessionId) },
        });

        if (!session) {
            res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Session not found' });
            return;
        }

        const lockedPrices: LockedPriceItem[] = JSON.parse(session.lockedPrices);
        const sellerIds = [...new Set(lockedPrices.map(i => i.sellerId).filter(id => id !== null))];
        
        const sellers = await prisma.seller.findMany({
            where: { uid: { in: sellerIds as number[] } }
        });

        const config = await getShippingConfig();
        const estimates: Record<number, any> = {};

        for (const seller of sellers) {
            const sellerItems = lockedPrices.filter(i => i.sellerId === seller.uid);
            const sellerSubtotal = sellerItems.reduce((sum, item) => sum + (item.quantity * item.finalPrice), 0);

            const choice = choices[seller.uid] || 'DELIVERY';
            const result = await resolveSellerShipping(
                seller as any,
                shippingAddress,
                choice,
                config,
                sellerSubtotal
            );
            estimates[seller.uid] = result;
        }

        res.status(200).json({ success: true, estimates });
    } catch (error) {
        console.error('Error estimating shipping:', error);
        res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to estimate shipping' });
    }
};

const completeCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { paymentId, idempotencyKey, shippingAddress, choices } = req.body;

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

        // Security: Verify session belongs to the requesting user
        if (session.userId !== req.user?.id) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
            return;
        }

        if (session.status === CheckoutStatus.COMPLETED) {
            // Find existing orders (Partial match for split orders)
            // Note: This relies on the convention of appending -index to idempotency key
            const existingOrders = await prisma.order.findMany({
                where: {
                    userId: session.userId,
                    idempotencyKey: { startsWith: session.idempotencyKey },
                },
            });

            res.status(200).json({
                success: true,
                orderIds: existingOrders.map(o => o.uid),
                message: 'Order already completed (idempotent response).',
                isExisting: true,
            });
            return;
        }

        // Verify payment success
        let successfulPayment = session.payments[0];

        if (!successfulPayment && paymentId) {
            const payment = await prisma.payment.findUnique({
                where: { uid: Number(paymentId) },
            });

            // For COD, we might accept PROCESSING if we treat the initial step as valid. 
            // But ideally, payment would have been updated to SUCCEEDED after processPayment returns.
            if (payment && (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.PROCESSING)) {
                successfulPayment = payment;
            }
        }

        if (!successfulPayment) {
            res.status(400).json({
                success: false,
                error: 'PAYMENT_NOT_FOUND',
                message: 'No successful payment found for this checkout.',
            });
            return;
        }

        const lockedPrices: LockedPriceItem[] = JSON.parse(session.lockedPrices);

        // Group items by seller
        const itemsBySeller = groupItemsBySeller(lockedPrices);

        // Atomic transaction: update stock and create orders
        const createdOrderIds = await prisma.$transaction(async (tx) => {
            const orderIds: number[] = [];
            let orderIndex = 0;

            // Update stock (Inventory management remains global per item)
            for (const item of lockedPrices) {
                // Increment Product soldCount
                try {
                    await tx.product.update({
                        where: { uid: item.productId },
                        data: { soldCount: { increment: item.quantity } },
                    });
                } catch (error) {
                    console.error(`Failed to update soldCount for product ${item.productId}`, error);
                }

                if (item.variantId) {
                    const result = await tx.productVariant.updateMany({
                        where: {
                            uid: item.variantId,
                            stock: { gte: item.quantity },
                            reservedStock: { gte: item.quantity },
                        },
                        data: {
                            stock: { decrement: item.quantity },
                            reservedStock: { decrement: item.quantity },
                            soldCount: { increment: item.quantity },
                        },
                    });

                    if (result.count === 0) {
                        throw new Error(`Insufficient stock for ${item.productName} (${item.variantName})`);
                    }
                }
            }

            const config = await getShippingConfig();

            // Create an Order for each seller group
            for (const [sellerId, sellerItems] of itemsBySeller) {
                orderIndex++;

                // Calculate total for this specific order
                const orderSubtotal = sellerItems.reduce((sum, item) => sum + (Number(item.finalPrice) * item.quantity), 0);

                // Buyer's Platform Fee for this specific seller order (7%)
                const buyerPlatformFee = Number((orderSubtotal * 0.07).toFixed(2));

                const orderedProducts = buildOrderedProducts(sellerItems);

                // Commission Calculation (Seller side: 5%)
                const seller = await tx.seller.findUnique({ where: { uid: sellerId! } });
                const commissionRate = seller?.commissionRate ? Number(seller.commissionRate) : 0.05;
                const sellerPlatformFee = Number((orderSubtotal * commissionRate).toFixed(2)); // The 5% deducted
                
                // Platform earns both
                const totalPlatformFee = buyerPlatformFee + sellerPlatformFee;
                
                const sellerEarnings = Number((orderSubtotal - sellerPlatformFee).toFixed(2));

                // Calculate shipping fee server-side
                const buyerChoice = (choices && choices[sellerId!]) ? choices[sellerId!] : 'DELIVERY';

                const shippingResult = await resolveSellerShipping(
                    seller as any,
                    shippingAddress,
                    buyerChoice,
                    config,
                    orderSubtotal
                );

                const orderShippingFee = shippingResult.fee;
                const orderTotalWithShippingAndFees = orderSubtotal + buyerPlatformFee + orderShippingFee;

                const newOrder = await tx.order.create({
                    data: {
                        userId: session.userId,
                        sellerId: sellerId, // Assign to seller
                        products: JSON.stringify(orderedProducts),
                        total: orderTotalWithShippingAndFees, // Total includes shipping and buyer fee
                        subtotal: orderSubtotal, // Product subtotal only
                        shippingFee: orderShippingFee, // Shipping fee
                        platformFee: totalPlatformFee, // What the platform keeps
                        sellerEarnings: sellerEarnings, // What the seller takes home
                        discount: 0,
                        status: OrderStatus.PENDING,
                        paymentMethod: successfulPayment.method,
                        // If COD and amount > 0, it means a deposit was paid -> PARTIALLY_PAID
                        // If COD and amount == 0, it means trust-based -> PENDING (Collect full on delivery)
                        paymentStatus: successfulPayment.method === 'COD'
                            ? (Number(successfulPayment.amount) > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING)
                            : PaymentStatus.SUCCEEDED,
                        // Append index to idempotency key to satisfy unique constraint: "key-1", "key-2"
                        idempotencyKey: `${idempotencyKey || session.idempotencyKey}-${orderIndex}`,
                        referenceNumber: generateOrderReference(),
                        shippingAddressSnapshot: shippingAddress ? JSON.stringify(shippingAddress) : null,
                        items: {
                            create: sellerItems.map(item => ({
                                productId: item.productId,
                                sellerId: item.sellerId,
                                quantity: item.quantity,
                                price: item.finalPrice,
                                status: 'paid',
                                trackingNumber: null,
                                shippingProvider: null
                            }))
                        }
                    },
                });

                // Create OrderShipment
                await tx.orderShipment.create({
                    data: {
                        orderId: newOrder.uid,
                        sellerId: sellerId!,
                        fulfillmentType: shippingResult.resolvedType,
                        zoneTier: shippingResult.zoneTier,
                        shippingFee: shippingResult.fee,
                        computedFuelCost: shippingResult.fuelCost,
                        meetUpSnapshot: shippingResult.meetUpSnapshot
                    }
                });

                // Update Seller Pending Balance
                if (sellerId) {
                    await tx.seller.update({
                        where: { uid: sellerId },
                        data: {
                            pendingBalance: { increment: sellerEarnings }
                        }
                    });
                }

                orderIds.push(newOrder.uid);

                // Note: We do NOT link payment to individual orders via payment.orderId 
                // because one payment covers multiple orders. 
                // The link is preserved via CheckoutSession.
            }

            return orderIds;
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

        // Log audit (Summarized)
        AuditService.logCheckout('CHECKOUT_COMPLETED', session.uid, session.userId, {
            orderIds: createdOrderIds,
            orderCount: createdOrderIds.length
        });

        // ------------------------------------------------------------------
        // Real-time Updates
        // ------------------------------------------------------------------

        // 1. Inventory Updates (Trigger refetch for anyone viewing these products)
        const uniqueProductIds = [...new Set(lockedPrices.map(item => item.productId))];
        uniqueProductIds.forEach(pid => {
            supabaseService.emit('product:updated', { productId: pid });
        });

        // 2. Cart Sync (Clear cart for this user on other devices)
        supabaseService.emitToRoom(`user_${session.userId}`, 'cart:updated', {
            userId: session.userId,
            cart: { items: [] }
        });

        // 3. Vendor Notifications (Alert sellers of new orders)
        // We grouped itemsBySeller earlier.
        for (const [sellerId, sellerItems] of itemsBySeller) {
            if (sellerId) {
                supabaseService.emitToRoom(`seller_${sellerId}`, 'vendor:notification', {
                    type: 'NEW_ORDER',
                    message: `You have a new order with ${sellerItems.length} items.`,
                    data: {
                        sellerId,
                        itemCount: sellerItems.length,
                        totalAmount: sellerItems.reduce((sum, item) => sum + (Number(item.finalPrice) * item.quantity), 0)
                    }
                });
            }
        }

        // ------------------------------------------------------------------

        // Send notifications
        notifications.send({
            type: 'email',
            to: (await prisma.user.findUnique({ where: { uid: session.userId } }))?.email || '',
            subject: 'Order Confirmation',
            body: `Your order(s) [${createdOrderIds.join(', ')}] have been placed successfully.`
        }).catch(err => console.error('Failed to send order notification', err));

        res.status(201).json({
            success: true,
            orderIds: createdOrderIds,
            message: 'Orders placed successfully!',
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

const cancelCheckout = async (req: Request, res: Response): Promise<void> => {
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

        // Security: Verify session belongs to the requesting user
        if (session.userId !== req.user?.id) {
            res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Access denied.' });
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

        const lockedPrices = JSON.parse(session.lockedPrices);

        await prisma.$transaction(async (tx) => {
            for (const item of lockedPrices) {
                if (item.variantId) {
                    await tx.productVariant.updateMany({
                        where: { uid: item.variantId, reservedStock: { gte: item.quantity } },
                        data: { reservedStock: { decrement: item.quantity } },
                    });
                }
            }

            await tx.checkoutSession.update({
                where: { uid: session.uid },
                data: { status: CheckoutStatus.CANCELLED },
            });
        });

        AuditService.logCheckout('CHECKOUT_CANCELLED', session.uid, session.userId);

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

const getPaymentMethods = async (req: Request, res: Response): Promise<void> => {
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
    estimateShipping,
};
