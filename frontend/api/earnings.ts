import { apiClient } from './client';

export const earningsAPI = {
    getAdminStats: () =>
        apiClient.get<{ revenue: number; gmv: number; pendingWithdrawals: number }>('/earnings/admin/stats'),
};
