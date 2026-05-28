import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { CreateProductData, GetProductsParams, GetProductsResponse, Product } from '../types/products';
import { authEvents } from '@/utils/authEvents';

// Base URL for the API - uses EXPO_PUBLIC_API_URL env var with localhost fallback
const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api`;

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
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Common error handling
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response: AxiosResponse) => {
        if (process.env.NODE_ENV === 'development') {
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);

            if (error.response.status === 401 && !originalRequest._retry) {
                const requestUrl = originalRequest?.url || '';
                const isAuthEndpoint = ['/customers/login', '/customers/register', '/customers/login/google', '/auth/refresh'].some(
                    endpoint => requestUrl.includes(endpoint)
                );

                if (!isAuthEndpoint) {
                    // Try to refresh the token
                    if (isRefreshing) {
                        return new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return api(originalRequest);
                        }).catch(err => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const refreshToken = await AsyncStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const response = await api.post('/auth/refresh', { refreshToken });
                            const { token: newToken, refreshToken: newRefreshToken } = response.data;

                            await AsyncStorage.setItem('authToken', newToken);
                            await AsyncStorage.setItem('refreshToken', newRefreshToken);

                            processQueue(null, newToken);
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return api(originalRequest);
                        }
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        await AsyncStorage.removeItem('refreshToken');
                    } finally {
                        isRefreshing = false;
                    }

                    // Refresh failed — logout
                    const errorMessage = error.response.data?.error || 'Session expired';
                    authEvents.emit('ERROR', { message: errorMessage });
                    authEvents.emit('LOGOUT');
                }
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

    getCategoryCounts: () =>
        apiClient.get<{ success: boolean; counts: Record<string, number> }>('/products/category-counts'),

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

    updateProductStatus: (id: string | number, status: string, rejectionReason?: string) =>
        apiClient.patch<{ success: boolean; product: Product }>(`/products/admin/${id}/status`, { status, rejectionReason }),
};

export const authAPI = {
    login: (data: any) => apiClient.post('/customers/login', data),
    loginWithGoogle: (data: { token?: string, accessToken?: string }) => apiClient.post('/customers/login/google', data),
    register: (data: any) => apiClient.post('/customers/register', data),
    sendOTP: (target: string) => apiClient.post('/auth/send-otp', { target }),
    exchangeCode: (code: string) => apiClient.post<{ success: boolean; token: string }>('/auth/exchange-code', { code }),
    refreshToken: (refreshToken: string) => apiClient.post<{ success: boolean; token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
    logout: (refreshToken?: string) => apiClient.post('/auth/logout', { refreshToken }),
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

export const wishlistAPI = {
    getWishlist: (customerId: number) => {
        return apiClient.get(`/wishlist/${customerId}`);
    },

    toggleWishlistItem: (customerId: number, productId: number) => {
        return apiClient.post(`/wishlist/${customerId}/toggle`, { productId });
    }
};

export const customerAPI = {
    getProfile: () => apiClient.get<import('../types/user').User>('/customers/profile'),
    updateProfile: (data: any) => apiClient.put('/customers/profile', data),
};

export const orderAPI = {
    getOrders: () => apiClient.get('/orders'),
    getOrderById: (id: string) => apiClient.get(`/orders/${id}`),
    updateStatus: (id: number, status: string, data?: any) => apiClient.put(`/orders/${id}/status`, { status, ...data }),
    extendOrderGuarantee: (id: number) => apiClient.post(`/orders/${id}/extend-guarantee`),
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
    sellerId: number | null;
}

export interface InitiateCheckoutResponse {
    success: boolean;
    sessionId: number;
    lockedPrices: LockedPriceItem[];
    totalAmount: number;
    expiresAt: string;
    message: string;
    isExisting?: boolean;
    sellerMetrics?: Record<number, { avgShipTimeHours: number; successRate: number }>;
    codInfo?: {
        allowed: boolean;
        depositPercent: number;
        disabledBy?: string[] | null;
        reason?: string | null;
    };
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
    initiate: (selectedItemIds: number[], idempotencyKey: string) =>
        apiClient.post<InitiateCheckoutResponse>('/checkout/initiate', {
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
    complete: (sessionId: number, paymentId: number, idempotencyKey?: string, shippingInfo?: any) =>
        apiClient.post<CompleteCheckoutResponse>(`/checkout/${sessionId}/complete`, {
            paymentId,
            idempotencyKey,
            shippingAddress: shippingInfo,
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
    region?: string | null;
    province?: string | null; // Keeping as alias or primary depending on backend, but let's add region/barangay
    city: string;
    barangay?: string | null;
    stateProvince?: string | null; // Legacy support or alias
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
    region?: string;
    province?: string;
    city: string;
    barangay?: string;
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
    getActiveSellers: () => apiClient.get<any[]>('/sellers/active'),
    updateSellerStatus: (id: number, status: string, rejectionReason?: string) => apiClient.put(`/sellers/${id}`, { status, rejectionReason }),
    markWelcomeSeen: () => apiClient.patch<{ success: boolean; token: string; customer: any }>('/sellers/me/welcome-seen', {}),
    cancelApplication: () => apiClient.delete('/sellers/me/application'),
    getDashboardStats: () => apiClient.get<any>('/sellers/me/dashboard-stats').then(res => res.data),
    getSidebarStats: () => apiClient.get<any>('/sellers/me/sidebar-stats').then(res => res.data),
    onboard: (data: any) => apiClient.post('/sellers/onboard', data),
};

export const sellerProductsAPI = {
    getMyProducts: (params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string }) =>
        apiClient.get<{ products: any[]; pagination: any; stats?: any }>('/sellers/me/products', { params }).then(res => res.data),
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

export const locationAPI = {
    getRegions: () => apiClient.get<{ code: string; name: string }[]>('/locations/regions'),
    getProvinces: (regCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/provinces/${regCode}`),
    getCities: (provCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/cities/${provCode}`),
    getBarangays: (citymunCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/barangays/${citymunCode}`),
};

// ============================================
// AI Chat API
// ============================================
export const chatAPI = {
    /**
     * Send message history to Groq AI
     */
    sendAiMessage: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
        apiClient.post<{ success: boolean; reply: string }>('/chat/ai', { messages }),
};

// ============================================
// Earnings API
// ============================================
export const earningsAPI = {
    /**
     * Get admin platform stats (revenue, GMV, pending payouts)
     */
    getAdminStats: () =>
        apiClient.get<{ revenue: number; gmv: number; pendingWithdrawals: number }>('/earnings/admin/stats'),
};

// ============================================
// Seller Orders API
// ============================================
export const sellerOrdersAPI = {
    /**
     * Get orders for a specific seller
     */
    getSellerOrders: (sellerId: number) =>
        apiClient.get<any[]>(`/sellers/${sellerId}/orders`),

    /**
     * Get public seller profile by slug
     */
    getSellerBySlug: (slug: string) =>
        apiClient.get<any>(`/sellers/${slug}`),

    /**
     * Update order status
     */
    updateOrderStatus: (orderId: number, data: { status: string; message?: string;[key: string]: any }) =>
        apiClient.put<{ success: boolean; order: any }>(`/orders/${orderId}/status`, data),
};

// ============================================
// Services API (OCR, etc.)
// ============================================
export const servicesAPI = {
    /**
     * Run OCR on an image URL
     */
    ocr: (imageUrl: string) =>
        apiClient.post<{ success: boolean; text: string }>('/services/ocr', { imageUrl }),
};

// ============================================
// Product Generation API
// ============================================
export const productGenerationAPI = {
    /**
     * Auto-generate a product SKU based on category and variant names
     */
    generateSku: (data: { category: string; variants?: string[] }) =>
        apiClient.post<{ success: boolean; sku: string; message?: string }>('/products/generate-sku', data),

    /**
     * Auto-generate a product description using AI
     */
    generateDescription: (data: { name: string; category: string; variants?: string[]; basePrice?: number; discountedPrice?: number }) =>
        apiClient.post<{ success: boolean; description: string; message?: string }>('/products/generate-description', data),

    /**
     * Auto-generate a variant SKU based on the product's base SKU
     */
    generateVariantSku: (data: { baseSKU: string; variantName: string }) =>
        apiClient.post<{ success: boolean; sku: string; message?: string }>('/products/generate-variant-sku', data),

    /**
     * Auto-generate option values for a product option name
     */
    generateOptionValues: (data: { optionName: string }) =>
        apiClient.post<{ success: boolean; values: string[] }>('/products/generate-option-values', data),
};

export default api;