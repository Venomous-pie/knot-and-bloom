import prisma from "../utils/prismaUtils.js";
import { z, ZodError } from "zod";
import ErrorHandler from "../error/errorHandler.js";

// Validation schema for notification settings update
const notificationSettingsSchema = z.object({
    orderUpdates: z.boolean().optional(),
    promotions: z.boolean().optional(),
    systemMessages: z.boolean().optional(),
});

type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

/**
 * Get notification settings for a user (creates default if none exists)
 */
const getNotificationSettings = async (userId: number) => {
    let settings = await prisma.notificationSettings.findUnique({
        where: { userId: userId }
    });

    // Create default settings if none exist
    if (!settings) {
        settings = await prisma.notificationSettings.create({
            data: {
                userId: userId,
                orderUpdates: true,
                promotions: true,
                systemMessages: true,
            }
        });
    }

    return { settings };
};

/**
 * Update notification settings
 */
const updateNotificationSettings = async (userId: number, input: unknown) => {
    let parsedInput: NotificationSettingsInput;

    try {
        parsedInput = notificationSettingsSchema.parse(input);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // Upsert settings
    const settings = await prisma.notificationSettings.upsert({
        where: { userId: userId },
        create: {
            userId: userId,
            orderUpdates: parsedInput.orderUpdates ?? true,
            promotions: parsedInput.promotions ?? true,
            systemMessages: parsedInput.systemMessages ?? true,
        },
        update: {
            ...(parsedInput.orderUpdates !== undefined && { orderUpdates: parsedInput.orderUpdates }),
            ...(parsedInput.promotions !== undefined && { promotions: parsedInput.promotions }),
            ...(parsedInput.systemMessages !== undefined && { systemMessages: parsedInput.systemMessages }),
        }
    });

    return { settings };
};

/**
 * Get notifications for a user
 */
const getNotifications = async (userId: number, options?: { unreadOnly?: boolean; limit?: number; offset?: number; excludeType?: string }) => {
    const { unreadOnly = false, limit = 50, offset = 0, excludeType } = options || {};

    const [notifications, totalCount, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: {
                userId: userId,
                ...(unreadOnly && { isRead: false }),
                ...(excludeType && { type: { not: excludeType } })
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.notification.count({
            where: {
                userId: userId,
                ...(unreadOnly && { isRead: false }),
                ...(excludeType && { type: { not: excludeType } })
            }
        }),
        prisma.notification.count({
            where: { 
                userId: userId, 
                isRead: false,
                ...(excludeType && { type: { not: excludeType } })
            }
        })
    ]);

    return { notifications, totalCount, unreadCount };
};

/**
 * Mark notification as read
 */
const markAsRead = async (userId: number, notificationId: number) => {
    const existing = await prisma.notification.findUnique({ where: { uid: notificationId } });
    if (!existing || existing.userId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to modify this notification");
    }

    const notification = await prisma.notification.update({
        where: { uid: notificationId },
        data: { isRead: true }
    });

    return { notification };
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId: number) => {
    await prisma.notification.updateMany({
        where: { userId: userId, isRead: false },
        data: { isRead: true }
    });

    return { success: true };
};

/**
 * Create a notification (internal use - for system to send notifications)
 */
const createNotification = async (userId: number, title: string, message: string, type: string, data?: any) => {
    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            data: data ? JSON.stringify(data) : null,
        }
    });

    return notification;
};

/**
 * Delete a notification
 */
const deleteNotification = async (userId: number, notificationId: number) => {
    const existing = await prisma.notification.findUnique({ where: { uid: notificationId } });
    if (!existing || existing.userId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to delete this notification");
    }

    await prisma.notification.delete({ where: { uid: notificationId } });

    return { success: true };
};

export default {
    getNotificationSettings,
    updateNotificationSettings,
    getNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification
};
