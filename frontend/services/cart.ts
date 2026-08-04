import { apiClient } from './client';
import type { Cart } from '../types/cart';

export const cartAPI = {
    addToCart: (customerId: number, productId: number, quantity: number, variant?: string | null, isBuyNow?: boolean) => {
        return apiClient.post('/cart/add', { userId: customerId, productId, quantity, variant, isBuyNow });
    },

    getCart: (customerId: number) => {
        return apiClient.get<{ cart: Cart }>(`/cart/${customerId}`);
    },

    updateCartItem: (itemId: number, quantity: number) => {
        return apiClient.patch(`/cart/item/${itemId}`, { quantity });
    },

    removeFromCart: (itemId: number) => {
        return apiClient.delete(`/cart/item/${itemId}`);
    },

    checkout: (customerId: number, selectedItemIds: number[]) => {
        return apiClient.post('/cart/checkout', { userId: customerId, selectedItemIds });
    }
};
