import type { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prismaUtils.js';

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
        // We expect req.body to be a raw Buffer (configured via express.raw in routes)
        if (!Buffer.isBuffer(req.body)) {
            console.error('Webhook payload is not a Buffer. Ensure express.raw() is used.');
            return res.status(500).json({ error: 'Internal server error' });
        }

        const rawBody = req.body.toString('utf8');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        // Use constant-time comparison to prevent timing attacks
        try {
            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
                console.error('Webhook signature verification failed.');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        } catch (error) {
            // This catches cases where the lengths of the buffers differ
            console.error('Webhook signature length mismatch.', error);
            return res.status(401).json({ error: 'Invalid signature length' });
        }

        // 5. Respond 2xx ASAP, process asynchronously
        res.status(200).send('OK');

        // 6. Process the webhook
        try {
            const payload = JSON.parse(rawBody);
            const { status, vendor_data, webhook_type, decision } = payload;
            
            if (!vendor_data) {
                console.log('Didit Webhook ignored: no vendor_data provided.');
                return;
            }
            
            // Map vendor_data to Seller UID
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
                    case 'Declined':
                        // Extract warnings from decision if available
                        let rejectionReason = 'Identity verification declined.';
                        if (decision) {
                            rejectionReason = JSON.stringify(decision); // Can be refined later based on decision object schema
                        }
                        
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'REJECTED', rejectionReason }
                        });
                        break;
                    case 'In Review':
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'PENDING', kycFlagged: true }
                        });
                        break;
                    case 'In Progress':
                    case 'Resubmitted':
                    case 'Not Started':
                        // Just ensure it stays pending
                        await prisma.seller.update({
                            where: { uid: sellerUid },
                            data: { status: 'PENDING' }
                        });
                        break;
                    case 'Abandoned':
                    case 'Expired':
                    case 'KYC Expired':
                        console.log(`Didit session ${status} for seller ${sellerUid}. Session expired/abandoned.`);
                        // Optional: we could mark it REJECTED or add a specific note.
                        break;
                    default:
                        console.log(`Unknown Didit status: ${status}`);
                        break;
                }
            } else {
                console.log(`Didit Webhook ignored: unhandled webhook_type (${webhook_type}).`);
            }
        } catch (error) {
            console.error('Error processing Didit webhook payload:', error);
            // Since we already responded 200, we just log this. 
        }
    }
};
