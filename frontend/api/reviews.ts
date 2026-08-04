import { apiClient } from './client';

export const reviewsAPI = {
    getReviewsBySeller: (slug: string, page = 1, limit = 10) => 
        apiClient.get(`/reviews/seller/${slug}?page=${page}&limit=${limit}`),
    
    getReviewsByProduct: (productId: number, page = 1, limit = 10) => 
        apiClient.get(`/reviews/product/${productId}?page=${page}&limit=${limit}`),
};
