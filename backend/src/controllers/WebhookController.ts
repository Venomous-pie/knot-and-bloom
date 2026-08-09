import type { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prismaUtils.js';
import { PaymentStatus } from '../../generated/prisma/index.js';
import { createOrdersFromSession } from './CheckoutController.js';

export const webhookController = {
    async handleDiditWebhook(req: Request, res: Response) {
        // 1. Check configuration
        const secret = process.env.DIDIT_WEBHOOK_SECRET;
        if (!secret) {
            console.error('Missing DIDIT_WEBHOOK_SECRET');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        // 2. Extract signature headers
        const signature = req.headers['x-signature-v2'] as string;
        const timestamp = req.headers['x-timestamp'] as string;

        if (!signature || !timestamp) {
            return res.status(401).json({ error: 'Missing signature headers' });
        }

        // 3. Validate timestamp freshness (within 5 minutes)
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - parseInt(timestamp)) > 300) {
            return res.status(401).json({ error: 'Request expired' });
        }

        // 4. Verify HMAC-SHA256 signature
        if (!Buffer.isBuffer(req.body)) {
            console.error('Webhook payload is not a Buffer. Ensure express.raw() is used.');
            return res.status(500).json({ error: 'Internal server error' });
        }

        const rawBody = req.body.toString('utf8');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        try {
            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
                console.error('Webhook signature verification failed.');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        } catch (error) {
            console.error('Webhook signature length mismatch.', error);
            return res.status(401).json({ error: 'Invalid signature length' });
        }

        // 5. Respond 2xx ASAP, process asynchronously
        res.status(200).send('OK');

        // 6. Process the webhook payload
        try {
            const payload = JSON.parse(rawBody);
            const { status, vendor_data, webhook_type, decision } = payload;
            
            if (!vendor_data) {
                console.log('Didit Webhook ignored: no vendor_data provided.');
                return;
            }
            
            const sellerUid = parseInt(vendor_data, 10);
            if (isNaN(sellerUid)) {
                console.log(`Didit Webhook ignored: vendor_data (${vendor_data}) is not a valid Seller UID.`);
                return;
            }

            if (webhook_type === 'status.updated' || webhook_type === 'business.status.updated') {
                switch (status) {
                    case 'Approved':
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'ACTIVE', kycFlagged: false, rejectionReason: null }
                        });
                        break;
                    case 'Declined': {
                        let rejectionReason = 'Identity verification declined.';
                        if (decision) rejectionReason = JSON.stringify(decision);
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'REJECTED', rejectionReason }
                        });
                        break;
                    }
                    case 'In Review':
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'PENDING', kycFlagged: true }
                        });
                        break;
                    case 'In Progress':
                    case 'Resubmitted':
                    case 'Not Started':
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'PENDING' }
                        });
                        break;
                    case 'Abandoned':
                    case 'Expired':
                    case 'KYC Expired':
                        console.log(`Didit session ${status} for seller ${sellerUid}.`);
                        break;
                    default:
                        console.log(`Unknown Didit status: ${status}`);
                }
            } else {
                console.log(`Didit Webhook ignored: unhandled webhook_type (${webhook_type}).`);
            }
        } catch (error) {
            console.error('Error processing Didit webhook payload:', error);
        }
    },

    async handlePaymongoWebhook(req: Request, res: Response): Promise<void> {
        try {
            const payload = req.body;

            if (!payload || !payload.data) {
                res.status(400).send('Invalid payload');
                return;
            }

            const eventType = payload.data.attributes?.type;

            if (eventType === 'checkout_session.payment.paid' || eventType === 'checkout.session.completed') {
                const checkoutSessionData = payload.data.attributes.data;
                const gatewayRef = checkoutSessionData.id; // cs_xxxx

                // Find the payment record linked to this PayMongo checkout session
                const payment = await prisma.payment.findFirst({
                    where: { gatewayRef },
                    include: { checkoutSession: true },
                });

                if (!payment) {
                    console.log(`[Webhook] Payment not found for gatewayRef: ${gatewayRef}`);
                    res.status(404).send('Payment not found');
                    return;
                }

                if (payment.status === PaymentStatus.SUCCEEDED) {
                    console.log(`[Webhook] Payment already succeeded: ${payment.uid}`);
                    res.status(200).send('Already processed');
                    return;
                }

                // Get PayMongo gateway fee (in centavos, convert to PHP)
                const paymentsFromGateway = checkoutSessionData.attributes?.payments || [];
                let totalFeeCentavos = 0;
                if (paymentsFromGateway.length > 0) {
                    totalFeeCentavos = paymentsFromGateway[0].attributes?.fee || 0;
                }
                const gatewayFeePhp = totalFeeCentavos / 100;

                // ── IDEMPOTENT PAYMENT CONFIRMATION ─────────────────────────
                // Re-read inside a transaction to guard against concurrent webhook retries.
                const alreadyProcessed = await prisma.$transaction(async (tx) => {
                    const lockedPayment = await tx.payment.findUnique({ where: { uid: payment.uid } });
                    if (lockedPayment?.status === PaymentStatus.SUCCEEDED) return true;
                    await tx.payment.update({
                        where: { uid: payment.uid },
                        data: { status: PaymentStatus.SUCCEEDED },
                    });
                    return false;
                });

                if (alreadyProcessed) {
                    console.log(`[Webhook] Payment ${payment.uid} already processed (concurrent webhook). Skipping.`);
                    res.status(200).send('Already processed');
                    return;
                }

                // ── CREATE ORDERS ────────────────────────────────────────────
                // Now that payment is confirmed, create orders using the shipping snapshot
                // that was saved to the session before the PayMongo redirect.
                console.log(`[Webhook] Payment ${payment.uid} confirmed. Creating orders for session ${payment.checkoutSessionId}...`);

                const paymentWithSucceeded = { ...payment, status: PaymentStatus.SUCCEEDED };
                const createdOrderIds = await createOrdersFromSession(payment.checkoutSessionId, paymentWithSucceeded as any);
                console.log(`[Webhook] Orders created: ${createdOrderIds.join(', ')}`);

                // ── DISTRIBUTE GATEWAY FEE PROPORTIONALLY ACROSS ORDERS ──────
                // Deduct the PayMongo processing fee from seller earnings.
                if (gatewayFeePhp > 0 && createdOrderIds.length > 0) {
                    const orders = await prisma.order.findMany({ where: { uid: { in: createdOrderIds } } });
                    const totalAmount = orders.reduce((sum, order) => sum + Number(order.total), 0);

                    for (const order of orders) {
                        const orderShare = totalAmount > 0 ? Number(order.total) / totalAmount : 1 / orders.length;
                        const orderGatewayFee = gatewayFeePhp * orderShare;

                        await prisma.order.update({
                            where: { uid: order.uid },
                            data: {
                                sellerEarnings: Math.max(0, Number(order.sellerEarnings) - orderGatewayFee),
                                platformFee: Number(order.platformFee) + orderGatewayFee,
                            },
                        });
                    }
                }

                console.log(`[Webhook] Successfully processed payment ${payment.uid} → ${createdOrderIds.length} order(s).`);
                res.status(200).send('Success');
            } else {
                res.status(200).send('Ignored');
            }
        } catch (error) {
            console.error('[Webhook] Error processing PayMongo webhook:', error);
            res.status(500).send('Internal Server Error');
        }
    }
};


