import { apiClient } from './client';

export const orderAPI = {
    getOrders: () => apiClient.get('/orders'),
    getOrderById: (id: string) => apiClient.get(`/orders/${id}`),
    updateStatus: (id: number, status: string, data?: any) => apiClient.put(`/orders/${id}/status`, { status, ...data }),
    extendOrderGuarantee: (id: number) => apiClient.post(`/orders/${id}/extend-guarantee`),
};
