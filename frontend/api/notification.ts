import { apiClient } from './client';

export interface NotificationSettings {
    uid: number;
    orderUpdates: boolean;
    promotions: boolean;
    systemMessages: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Notification {
    uid: number;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    data?: string;
    createdAt: string;
}

export const notificationAPI = {
    getSettings: () =>
        apiClient.get<{ settings: NotificationSettings }>('/notifications/settings'),
    updateSettings: (data: Partial<Omit<NotificationSettings, 'uid' | 'createdAt' | 'updatedAt'>>) =>
        apiClient.put<{ settings: NotificationSettings }>('/notifications/settings', data),
    getNotifications: (params?: { unreadOnly?: boolean; limit?: number; offset?: number; excludeType?: string }) =>
        apiClient.get<{ notifications: Notification[]; totalCount: number; unreadCount: number }>(
            '/notifications',
            { params }
        ),
    markAsRead: (id: number) =>
        apiClient.patch<{ notification: Notification }>(`/notifications/${id}/read`),
    markAllAsRead: () =>
        apiClient.patch<{ success: boolean }>('/notifications/read-all'),
    deleteNotification: (id: number) =>
        apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
};
