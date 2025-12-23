import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import NotificationController from '../controllers/NotificationController.js';

const router = Router();

/**
 * GET /api/notifications/settings
 * Get notification settings for authenticated user
 */
router.get('/settings', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await NotificationController.getNotificationSettings(userId);
        res.json(result);
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ error: "Failed to fetch notification settings" });
    }
});

/**
 * PUT /api/notifications/settings
 * Update notification settings
 */
router.put('/settings', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await NotificationController.updateNotificationSettings(userId, req.body);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error updating notification settings:', error);
        res.status(500).json({ error: "Failed to update notification settings" });
    }
});

/**
 * GET /api/notifications
 * Get notifications for authenticated user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { unreadOnly, limit, offset } = req.query;
        const result = await NotificationController.getNotifications(userId, {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit as string, 10) : 50,
            offset: offset ? parseInt(offset as string, 10) : 0,
        });
        res.json(result);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const notificationId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(notificationId)) return res.status(400).json({ error: "Invalid notification ID" });

        const result = await NotificationController.markAsRead(userId, notificationId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: "Failed to mark notification as read" });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await NotificationController.markAllAsRead(userId);
        res.json(result);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const notificationId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(notificationId)) return res.status(400).json({ error: "Invalid notification ID" });

        const result = await NotificationController.deleteNotification(userId, notificationId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: "Failed to delete notification" });
    }
});

export default router;
