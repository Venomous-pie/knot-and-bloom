import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController.js';
import express from 'express';

const router = Router();

// IMPORTANT: We use express.raw() here so that the webhook controller receives the raw Buffer.
// This is strictly necessary for verifying the HMAC signature without serialization bugs.
// This route must be mounted BEFORE the global express.json() middleware in index.ts.
router.post('/didit', express.raw({ type: 'application/json' }), webhookController.handleDiditWebhook);

// PayMongo webhook (we'll just use express.json() here since we aren't doing strict HMAC verification yet)
router.post('/paymongo', express.json(), webhookController.handlePaymongoWebhook);

export default router;
