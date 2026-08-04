import { apiClient } from './client';

export const wishlistAPI = {
    getWishlist: (customerId: number) => {
        return apiClient.get(`/wishlist/${customerId}`);
    },

    toggleWishlistItem: (customerId: number, productId: number) => {
        return apiClient.post(`/wishlist/${customerId}/toggle`, { productId });
    }
};
