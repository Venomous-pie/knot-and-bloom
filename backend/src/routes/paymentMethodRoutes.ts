import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import PaymentMethodController from '../controllers/PaymentMethodController.js';

const router = Router();

/**
 * GET /api/payment-methods/me
 * Get all payment methods for authenticated user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await PaymentMethodController.getPaymentMethods(userId);
        res.json(result);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: "Failed to fetch payment methods" });
    }
});

/**
 * POST /api/payment-methods/me
 * Create a new payment method
 */
router.post('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await PaymentMethodController.createPaymentMethod(userId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error creating payment method:', error);
        res.status(500).json({ error: "Failed to create payment method" });
    }
});

/**
 * PUT /api/payment-methods/me/:id
 * Update a payment method
 */
router.put('/me/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const paymentMethodId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(paymentMethodId)) return res.status(400).json({ error: "Invalid payment method ID" });

        const result = await PaymentMethodController.updatePaymentMethod(userId, paymentMethodId, req.body);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error updating payment method:', error);
        res.status(500).json({ error: "Failed to update payment method" });
    }
});

/**
 * DELETE /api/payment-methods/me/:id
 * Delete a payment method
 */
router.delete('/me/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const paymentMethodId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(paymentMethodId)) return res.status(400).json({ error: "Invalid payment method ID" });

        const result = await PaymentMethodController.deletePaymentMethod(userId, paymentMethodId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error deleting payment method:', error);
        res.status(500).json({ error: "Failed to delete payment method" });
    }
});

/**
 * PATCH /api/payment-methods/me/:id/default
 * Set a payment method as default
 */
router.patch('/me/:id/default', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const paymentMethodId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(paymentMethodId)) return res.status(400).json({ error: "Invalid payment method ID" });

        const result = await PaymentMethodController.setDefaultPaymentMethod(userId, paymentMethodId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error setting default payment method:', error);
        res.status(500).json({ error: "Failed to set default payment method" });
    }
});

export default router;
