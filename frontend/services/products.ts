import { apiClient } from './client';
import type { CreateProductData, GetProductsParams, GetProductsResponse, Product } from '../types/products';

export const productAPI = {
    getProducts: (params?: GetProductsParams) =>
        apiClient.get<GetProductsResponse>('/products/get-product', { params }),
    getRecommendations: (searchData?: { term: string, count: number, lastSearched?: number }[]) => {
        let searchDataStr = undefined;
        if (searchData && searchData.length > 0) {
            const topTerms = [...searchData].sort((a, b) => b.count - a.count).slice(0, 15);
            searchDataStr = JSON.stringify(topTerms);
        }
        return apiClient.get<{ success: boolean; products: Product[] }>('/products/recommendations', {
            params: { searchData: searchDataStr }
        });
    },
    getRecentPurchases: () =>
        apiClient.get<{ success: boolean; data: Product[] }>('/products/recent-purchases'),
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

    getSimilarProducts: (id: string | number) =>
        apiClient.get<{ success: boolean; products: Product[] }>(`/products/${id}/similar`),

    updateProduct: (id: string, data: any) =>
        apiClient.put<Product>(`/products/${id}`, data),

    deleteProduct: (id: string) =>
        apiClient.delete(`/products/${id}`),

    getAdminProducts: (params?: { status?: string; limit?: number; offset?: number }) =>
        apiClient.get<{ success: boolean; products: Product[]; total: number }>('/products/admin', { params }),

    updateProductStatus: (id: string | number, status: string, rejectionReason?: string) =>
        apiClient.patch<{ success: boolean; product: Product }>(`/products/admin/${id}/status`, { status, rejectionReason }),
};

export const productGenerationAPI = {
    generateSku: (data: { category: string; variants?: string[] }) =>
        apiClient.post<{ success: boolean; sku: string; message?: string }>('/products/generate-sku', data),

    generateDescription: (data: { name: string; category: string; variants?: string[]; basePrice?: number; discountedPrice?: number }) =>
        apiClient.post<{ success: boolean; description: string; message?: string }>('/products/generate-description', data),

    generateVariantSku: (data: { baseSKU: string; variantName: string }) =>
        apiClient.post<{ success: boolean; sku: string; message?: string }>('/products/generate-variant-sku', data),

    generateOptionValues: (data: { optionName: string }) =>
        apiClient.post<{ success: boolean; values: string[] }>('/products/generate-option-values', data),
};
