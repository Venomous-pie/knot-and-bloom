import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { CreateProductData, GetProductsParams, GetProductsResponse, Product } from '../types/products';

// Base URL for the API - replace with your actual API base URL
const BASE_URL = 'http://localhost:3030/api';

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth tokens or other headers
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Add authorization token if available
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error retrieving token', error);
        }

        // Log request for debugging (for dev local)
        if (process.env.NODE_ENV === 'development') {
            console.log('API Request:', config.method?.toUpperCase(), config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Common error handling
api.interceptors.response.use(
    (response: AxiosResponse) => {
        // Log response for debugging (for dev local)
        if (process.env.NODE_ENV === 'development') {
            console.log('API Response:', response.status, response.config.url);
        }
        return response;
    },
    async (error) => {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);

            if (error.response.status === 401) {
                // Get the error message from backend
                const errorMessage = error.response.data?.error || 'Authentication error';

                // Import and emit auth error for toast display
                // Using dynamic import to avoid circular dependencies
                import('@/components/AuthToast').then(({ authErrorEmitter }) => {
                    authErrorEmitter.emit(errorMessage);
                }).catch(() => {
                    // Fallback if import fails - still clear token
                    console.error('Failed to emit auth error');
                });

                // Handle unauthorized - clear token and user data
                await AsyncStorage.removeItem('authToken');
                await AsyncStorage.removeItem('authUser');
            }
        } else if (error.request) {
            console.error('Network Error:', error.message);
        } else {
            console.error('Request Error:', error.message);
        }
        return Promise.reject(error);
    }
);

// Generic API methods
export const apiClient = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.get<T>(url, config);
    },

    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.post<T>(url, data, config);
    },

    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.put<T>(url, data, config);
    },

    patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.patch<T>(url, data, config);
    },

    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.delete<T>(url, config);
    },
};

export const productAPI = {
    getProducts: (params?: GetProductsParams) =>
        apiClient.get<GetProductsResponse>('/products/get-product', { params }),

    createProduct: (data: CreateProductData) =>
        apiClient.post<Product>('/products/post-product', data),

    searchProducts: (searchTerm: string, limit?: number) =>
        apiClient.get<GetProductsResponse>('/products/search-product', {
            params: { searchTerm, limit }
        }),

    getProductById: (id: string) =>
        apiClient.get<{ success: boolean; product: Product }>(`/products/${id}`),

    updateProduct: (id: string, data: any) =>
        apiClient.put<Product>(`/products/${id}`, data),

    deleteProduct: (id: string) =>
        apiClient.delete(`/products/${id}`),

    // Admin-only methods
    getAdminProducts: (params?: { status?: string; limit?: number; offset?: number }) =>
        apiClient.get<{ success: boolean; products: Product[]; total: number }>('/products/admin', { params }),

    updateProductStatus: (id: string | number, status: string) =>
        apiClient.patch<{ success: boolean; product: Product }>(`/products/admin/${id}/status`, { status }),
};

export const authAPI = {
    login: (data: any) => apiClient.post('/customers/login', data),
    register: (data: any) => apiClient.post('/customers/register', data),
};

export const cartAPI = {
    addToCart: (customerId: number, productId: number, quantity: number, variant?: string | null) => {
        return apiClient.post('/cart/add', { customerId, productId, quantity, variant });
    },

    getCart: (customerId: number) => {
        return apiClient.get<{ cart: import('../types/cart').Cart }>(`/cart/${customerId}`);
    },

    updateCartItem: (itemId: number, quantity: number) => {
        return apiClient.patch(`/cart/item/${itemId}`, { quantity });
    },

    removeFromCart: (itemId: number) => {
        return apiClient.delete(`/cart/item/${itemId}`);
    },

    checkout: (customerId: number, selectedItemIds: number[]) => {
        return apiClient.post('/cart/checkout', { customerId, selectedItemIds });
    }
};

export const customerAPI = {
    getProfile: () => apiClient.get<import('../types/user').User>('/customers/profile'),
    updateProfile: (data: any) => apiClient.put('/customers/profile', data),
};

export const orderAPI = {
    getOrders: () => apiClient.get('/orders'),
    getOrderById: (id: string) => apiClient.get(`/orders/${id}`),
};

export interface LockedPriceItem {
    itemUid: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    finalPrice: number;
    productName: string;
    variantName: string | null;
    image: string | null;
}

export interface InitiateCheckoutResponse {
    success: boolean;
    sessionId: number;
    lockedPrices: LockedPriceItem[];
    totalAmount: number;
    expiresAt: string;
    message: string;
    isExisting?: boolean;
}

export interface CheckoutSessionResponse {
    success: boolean;
    session: {
        uid: number;
        status: string;
        lockedPrices: LockedPriceItem[];
        totalAmount: number;
        expiresAt: string;
    };
}

export interface ValidateCheckoutResponse {
    success: boolean;
    message: string;
    priceChanges?: Array<{
        productName: string;
        variantName: string | null;
        oldPrice: number;
        newPrice: number;
    }>;
    note?: string;
}

export interface PaymentResponse {
    success: boolean;
    paymentId?: number;
    gatewayRef?: string;
    message: string;
    error?: string;
    isExisting?: boolean;
}

export interface CompleteCheckoutResponse {
    success: boolean;
    orderId?: number;
    orderIds?: number[];
    message: string;
    isExisting?: boolean;
}

export const checkoutAPI = {
    /**
     * Initiate a checkout session - locks prices and validates stock
     */
    initiate: (customerId: number, selectedItemIds: number[], idempotencyKey: string) =>
        apiClient.post<InitiateCheckoutResponse>('/checkout/initiate', {
            customerId,
            selectedItemIds,
            idempotencyKey,
        }),

    /**
     * Get checkout session details
     */
    getSession: (sessionId: number) =>
        apiClient.get<CheckoutSessionResponse>(`/checkout/${sessionId}`),

    /**
     * Validate checkout - re-validates stock before payment
     */
    validate: (sessionId: number) =>
        apiClient.post<ValidateCheckoutResponse>(`/checkout/${sessionId}/validate`),

    /**
     * Process payment
     */
    pay: (sessionId: number, paymentMethod: string, idempotencyKey: string) =>
        apiClient.post<PaymentResponse>(`/checkout/${sessionId}/pay`, {
            paymentMethod,
            idempotencyKey,
        }),

    /**
     * Complete checkout - finalize order after payment
     */
    complete: (sessionId: number, paymentId: number, idempotencyKey?: string) =>
        apiClient.post<CompleteCheckoutResponse>(`/checkout/${sessionId}/complete`, {
            paymentId,
            idempotencyKey,
        }),

    /**
     * Cancel checkout session
     */
    cancel: (sessionId: number) =>
        apiClient.delete(`/checkout/${sessionId}`),

    /**
     * Get available payment methods
     */
    getPaymentMethods: () =>
        apiClient.get<{ success: boolean; methods: string[] }>('/checkout/methods/available'),
};

// ============================================
// Address API
// ============================================

export interface Address {
    uid: number;
    label?: string | null;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string | null;
    city: string;
    stateProvince?: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AddressInput {
    label?: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string;
    city: string;
    stateProvince?: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
}

export const addressAPI = {
    /**
     * Get all addresses for authenticated user
     */
    getAddresses: () =>
        apiClient.get<{ addresses: Address[] }>('/addresses/me'),

    /**
     * Create a new address
     */
    createAddress: (data: AddressInput) =>
        apiClient.post<{ address: Address }>('/addresses/me', data),

    /**
     * Update an address
     */
    updateAddress: (addressId: number, data: Partial<AddressInput>) =>
        apiClient.put<{ address: Address }>(`/addresses/me/${addressId}`, data),

    /**
     * Delete an address
     */
    deleteAddress: (addressId: number) =>
        apiClient.delete<{ success: boolean }>(`/addresses/me/${addressId}`),

    /**
     * Set an address as default
     */
    setDefaultAddress: (addressId: number) =>
        apiClient.patch<{ address: Address }>(`/addresses/me/${addressId}/default`),
};

export const sellerAPI = {
    getSellers: () => apiClient.get<any[]>('/sellers'),
    updateSellerStatus: (id: number, status: string) => apiClient.put(`/sellers/${id}`, { status }),
    markWelcomeSeen: () => apiClient.patch('/sellers/me/welcome-seen', {}),
};

export const sellerProductsAPI = {
    getMyProducts: (params?: { page?: number; limit?: number; status?: string }) =>
        apiClient.get<{ products: any[]; pagination: any }>('/sellers/me/products', { params }).then(res => res.data),
    createProduct: (data: any) => apiClient.post('/products/post-product', data).then(res => res.data),
    updateProduct: (id: string | number, data: any) => apiClient.put(`/products/${id}`, data).then(res => res.data),
    deleteProduct: (id: string | number) => apiClient.delete(`/products/${id}`).then(res => res.data),
};

// ============================================
// Payment Methods API
// ============================================

export type PaymentMethodType = 'GCASH' | 'PAYMAYA' | 'BANK';

export interface PaymentMethod {
    uid: number;
    type: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    bankName?: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentMethodInput {
    type: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    bankName?: string;
    isDefault?: boolean;
}

export const paymentMethodAPI = {
    /**
     * Get all payment methods for authenticated user
     */
    getPaymentMethods: () =>
        apiClient.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods/me'),

    /**
     * Create a new payment method
     */
    createPaymentMethod: (data: PaymentMethodInput) =>
        apiClient.post<{ paymentMethod: PaymentMethod }>('/payment-methods/me', data),

    /**
     * Update a payment method
     */
    updatePaymentMethod: (id: number, data: Partial<PaymentMethodInput>) =>
        apiClient.put<{ paymentMethod: PaymentMethod }>(`/payment-methods/me/${id}`, data),

    /**
     * Delete a payment method
     */
    deletePaymentMethod: (id: number) =>
        apiClient.delete<{ success: boolean }>(`/payment-methods/me/${id}`),

    /**
     * Set a payment method as default
     */
    setDefaultPaymentMethod: (id: number) =>
        apiClient.patch<{ paymentMethod: PaymentMethod }>(`/payment-methods/me/${id}/default`),
};

// ============================================
// Notifications API
// ============================================

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
    /**
     * Get notification settings
     */
    getSettings: () =>
        apiClient.get<{ settings: NotificationSettings }>('/notifications/settings'),

    /**
     * Update notification settings
     */
    updateSettings: (data: Partial<Omit<NotificationSettings, 'uid' | 'createdAt' | 'updatedAt'>>) =>
        apiClient.put<{ settings: NotificationSettings }>('/notifications/settings', data),

    /**
     * Get notifications
     */
    getNotifications: (params?: { unreadOnly?: boolean; limit?: number; offset?: number }) =>
        apiClient.get<{ notifications: Notification[]; totalCount: number; unreadCount: number }>(
            '/notifications',
            { params }
        ),

    /**
     * Mark notification as read
     */
    markAsRead: (id: number) =>
        apiClient.patch<{ notification: Notification }>(`/notifications/${id}/read`),

    /**
     * Mark all notifications as read
     */
    markAllAsRead: () =>
        apiClient.patch<{ success: boolean }>('/notifications/read-all'),

    /**
     * Delete a notification
     */
    deleteNotification: (id: number) =>
        apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
};

// ============================================
// Account API
// ============================================

export interface DeletionStatus {
    hasPendingDeletion: boolean;
    deletionRequestedAt?: string | null;
    deletionScheduledFor?: string | null;
}

export const accountAPI = {
    /**
     * Request account deletion
     */
    requestDeletion: (data: { reason?: string; password: string }) =>
        apiClient.post<{ success: boolean; message: string; deletionScheduledFor: string }>('/account/delete-request', data),

    /**
     * Cancel account deletion request
     */
    cancelDeletion: () =>
        apiClient.delete<{ success: boolean; message: string }>('/account/delete-request'),

    /**
     * Get account deletion status
     */
    getDeletionStatus: () =>
        apiClient.get<DeletionStatus>('/account/delete-status'),
};


export default api;