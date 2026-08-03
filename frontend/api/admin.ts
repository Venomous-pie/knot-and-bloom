import { apiClient } from './client';

export const adminAPI = {
    getPlatformConfig: () =>
        apiClient.get<{ config: Record<string, string> }>('/admin/platform-config').then(res => res.data),
    updatePlatformConfig: (updates: Record<string, number | string>) =>
        apiClient.patch<{ success: boolean; updated: number }>('/admin/platform-config', updates).then(res => res.data),
    getOrders: (params?: { limit?: number; offset?: number; status?: string }) => 
        apiClient.get<{ orders: any[], total: number, pagination: any }>('/admin/orders', { params }),
};
