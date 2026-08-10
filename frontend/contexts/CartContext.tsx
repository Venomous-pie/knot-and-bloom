import { cartAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { CartItem } from '@/types/cart';

interface CartContextType {
    cartCount: number;
    cartItems: CartItem[];
    isLoading: boolean;
    error: Error | null;
    refreshCart: () => Promise<void>;
    setCartCount: React.Dispatch<React.SetStateAction<number>>;
}

const CartContext = createContext<CartContextType>({
    cartCount: 0,
    cartItems: [],
    isLoading: true, // Start in loading state until first fetch completes
    error: null,
    refreshCart: async () => { },
    setCartCount: () => { },
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [cartCount, setCartCount] = useState(0);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Track the current request to avoid race conditions (last response wins)
    const abortControllerRef = useRef<AbortController | null>(null);

    const refreshCart = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        if (!user?.uid) {
            setCartCount(0);
            setCartItems([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await cartAPI.getCart(user.uid);
            
            // If another request was started, ignore this one
            if (abortController.signal.aborted) return;

            if (response.data && response.data.cart && Array.isArray(response.data.cart.items)) {
                const items = response.data.cart.items;
                // Count sum of quantities rather than total unique items, unless backend provides an explicit itemCount
                const count = response.data.cart.itemCount ?? items.reduce((acc, item) => acc + (item.quantity || 1), 0);
                
                setCartCount(count);
                setCartItems(items);
            } else {
                setCartCount(0);
                setCartItems([]);
            }
        } catch (err: any) {
            if (abortController.signal.aborted) return;

            console.error("Failed to refresh cart count", err);
            setError(err);
            setCartCount(0);
            setCartItems([]);
        } finally {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
            }
        }
    }, [user?.uid]);

    useEffect(() => {
        refreshCart();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [refreshCart]);

    const value = useMemo(() => ({
        cartCount,
        cartItems,
        isLoading,
        error,
        refreshCart,
        setCartCount,
    }), [cartCount, cartItems, isLoading, error, refreshCart, setCartCount]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
