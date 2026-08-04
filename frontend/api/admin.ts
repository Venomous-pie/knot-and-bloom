import { apiClient } from './client';

export const adminAPI = {
    getDashboardStats: () =>
        apiClient.get<{ totalRevenue: number; activeSellers: number; pendingSellers: number; activeProducts: number }>('/admin/dashboard-stats').then(res => res.data),
    getPlatformConfig: () =>
        apiClient.get<{ config: Record<string, string> }>('/admin/platform-config').then(res => res.data),
    updatePlatformConfig: (updates: Record<string, number | string>) =>
        apiClient.patch<{ success: boolean; updated: number }>('/admin/platform-config', updates).then(res => res.data),
    getOrders: (params?: { limit?: number; offset?: number; status?: string }) => 
        apiClient.get<{ orders: any[], total: number, pagination: any }>('/admin/orders', { params }),
};
