import { Router } from 'express';
import { webhookController } from '../controllers/WebhookController.js';
import express from 'express';

const router = Router();

// IMPORTANT: We use express.raw() here so that the webhook controller receives the raw Buffer.
// This is strictly necessary for verifying the HMAC signature without serialization bugs.
// This route must be mounted BEFORE the global express.json() middleware in index.ts.
router.post('/didit', express.raw({ type: 'application/json' }), webhookController.handleDiditWebhook);

export default router;
