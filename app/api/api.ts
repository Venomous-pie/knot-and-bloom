import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { Product, GetProductsParams, GetProductsResponse, CreateProductData } from '../types/products';

// Base URL for the API - replace with your actual API base URL
const BASE_URL = 'http://localhost:3000/api';

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth tokens or other headers
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Add authorization token if available
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
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
                // Handle unauthorized - clear token and redirect to login
                localStorage.removeItem('authToken');
                // window.location.href = '/login'; // Uncomment if needed
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
        apiClient.get<Product>(`/products/${id}`),
    
    updateProduct: (id: string, data: Partial<CreateProductData>) =>
        apiClient.put<Product>(`/products/${id}`, data),
    
    deleteProduct: (id: string) =>
        apiClient.delete(`/products/${id}`),
};

export default api;