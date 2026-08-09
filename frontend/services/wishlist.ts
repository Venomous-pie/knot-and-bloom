import { apiClient } from './client';

export const wishlistAPI = {
    getWishlist: (customerId?: number) => {
        return apiClient.get(`/wishlist`);
    },

    toggleWishlistItem: (customerId: number | undefined, productId: number) => {
        return apiClient.post(`/wishlist/toggle`, { productId });
    }
};
