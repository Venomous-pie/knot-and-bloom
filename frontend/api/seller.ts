import { apiClient } from './client';

export interface UpdateSellerStatusPayload {
    status: string;
    rejectionReason?: string;
    [key: string]: any;
}

export interface UpdateSellerProfilePayload {
    [key: string]: any;
}

export interface UpdateOrderStatusPayload {
    status: string;
    message?: string;
    [key: string]: any;
}

export const sellerAPI = {
    getSellers: () => apiClient.get<any[]>('/sellers'),
    getActiveSellers: () => apiClient.get<any[]>('/sellers/active'),
    updateSellerStatus: (id: number, status: string, rejectionReason?: string) => apiClient.put(`/sellers/${id}`, { status, rejectionReason }),
    updateSellerProfile: (id: number, data: UpdateSellerProfilePayload) => apiClient.put(`/sellers/${id}`, data),
    markWelcomeSeen: () => apiClient.patch<{ success: boolean; token: string; customer: any }>('/sellers/me/welcome-seen', {}),
    cancelApplication: () => apiClient.delete('/sellers/me/application'),
    getDashboardStats: () => apiClient.get<any>('/sellers/me/dashboard-stats').then(res => res.data),
    getSidebarStats: () => apiClient.get<any>('/sellers/me/sidebar-stats').then(res => res.data),
    getAdminSidebarStats: () => apiClient.get<{ pendingSellers: number; pendingProducts: number }>('/sellers/admin/sidebar-stats').then(res => res.data),
    onboard: (data: any) => apiClient.post('/sellers/onboard', data),
    updateShippingSettings: (data: any) => apiClient.patch('/sellers/me/shipping-settings', data),
    getShippingPreview: () => apiClient.get('/sellers/me/shipping-preview'),
};

export const sellerProductsAPI = {
    getMyProducts: (params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string; includeStats?: string }) =>
        apiClient.get<{ products: any[]; pagination: any; stats?: any }>('/sellers/me/products', { params }).then(res => res.data),
    createProduct: (data: any) => apiClient.post('/products/post-product', data).then(res => res.data),
    updateProduct: (id: string | number, data: any) => apiClient.put(`/products/${id}`, data).then(res => res.data),
    deleteProduct: (id: string | number) => apiClient.delete(`/products/${id}`).then(res => res.data),
};

export const sellerOrdersAPI = {
    getSellerOrders: (sellerId: number) =>
        apiClient.get<any>(`/sellers/${sellerId}/orders`),
    getSellerBySlug: (slug: string) =>
        apiClient.get<any>(`/sellers/${slug}`),
    updateOrderStatus: (orderId: number, data: UpdateOrderStatusPayload) =>
        apiClient.put<{ success: boolean; order: any }>(`/orders/${orderId}/status`, data),
};
