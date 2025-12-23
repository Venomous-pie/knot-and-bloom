import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import AccountController from '../controllers/AccountController.js';

const router = Router();

/**
 * POST /api/account/delete-request
 * Request account deletion (7-day grace period)
 */
router.post('/delete-request', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await AccountController.requestAccountDeletion(userId, req.body);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error requesting account deletion:', error);
        res.status(500).json({ error: "Failed to request account deletion" });
    }
});

/**
 * DELETE /api/account/delete-request
 * Cancel account deletion request
 */
router.delete('/delete-request', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await AccountController.cancelAccountDeletion(userId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error cancelling account deletion:', error);
        res.status(500).json({ error: "Failed to cancel account deletion" });
    }
});

/**
 * GET /api/account/delete-status
 * Get account deletion status
 */
router.get('/delete-status', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await AccountController.getDeletionStatus(userId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error getting deletion status:', error);
        res.status(500).json({ error: "Failed to get deletion status" });
    }
});

/**
 * POST /api/account/process-deletions
 * Process scheduled account deletions (Admin only - for cron job)
 */
router.post('/process-deletions', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
    try {
        const result = await AccountController.processScheduledDeletions();
        res.json(result);
    } catch (error) {
        console.error('Error processing scheduled deletions:', error);
        res.status(500).json({ error: "Failed to process scheduled deletions" });
    }
});

export default router;
