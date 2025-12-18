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
    (error) => {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);

            if (error.response.status === 401) {
                // Handle unauthorized - clear token
                AsyncStorage.removeItem('authToken');
                // You might need a more robust way to navigate to login from here in React Native
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

export default api;