declare const _default: {
    getNotificationSettings: (userId: number) => Promise<{
        settings: {
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            orderUpdates: boolean;
            promotions: boolean;
            systemMessages: boolean;
        };
    }>;
    updateNotificationSettings: (userId: number, input: unknown) => Promise<{
        settings: {
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            orderUpdates: boolean;
            promotions: boolean;
            systemMessages: boolean;
        };
    }>;
    getNotifications: (userId: number, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }) => Promise<{
        notifications: {
            type: string;
            message: string;
            uid: number;
            data: string | null;
            customerId: number;
            createdAt: Date;
            title: string;
            isRead: boolean;
        }[];
        totalCount: number;
        unreadCount: number;
    }>;
    markAsRead: (userId: number, notificationId: number) => Promise<{
        notification: {
            type: string;
            message: string;
            uid: number;
            data: string | null;
            customerId: number;
            createdAt: Date;
            title: string;
            isRead: boolean;
        };
    }>;
    markAllAsRead: (userId: number) => Promise<{
        success: boolean;
    }>;
    createNotification: (customerId: number, title: string, message: string, type: string, data?: any) => Promise<{
        type: string;
        message: string;
        uid: number;
        data: string | null;
        customerId: number;
        createdAt: Date;
        title: string;
        isRead: boolean;
    }>;
    deleteNotification: (userId: number, notificationId: number) => Promise<{
        success: boolean;
    }>;
};
export default _default;
//# sourceMappingURL=NotificationController.d.ts.map