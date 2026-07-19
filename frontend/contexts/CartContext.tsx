import { cartAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface CartContextType {
    cartCount: number;
    setCartCount: (count: number) => void;
    refreshCart: () => Promise<void>;
    animationStartPos: { x: number; y: number } | null;
    triggerCartAnimation: (pos: { x: number; y: number }) => void;
    clearAnimation: () => void;
    cartIconPosition: { x: number; y: number } | null;
    setCartIconPosition: (pos: { x: number; y: number }) => void;
    cartItems: any[];
}

const CartContext = createContext<CartContextType>({
    cartCount: 0,
    setCartCount: () => { },
    refreshCart: async () => { },
    animationStartPos: null,
    triggerCartAnimation: () => { },
    clearAnimation: () => { },
    cartIconPosition: null,
    setCartIconPosition: () => { },
    cartItems: [],
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [cartCount, setCartCount] = useState(0);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [animationStartPos, setAnimationStartPos] = useState<{ x: number; y: number } | null>(null);
    const [cartIconPosition, setCartIconPosition] = useState<{ x: number; y: number } | null>(null);

    const refreshCart = async () => {
        if (!user?.uid) {
            setCartCount(0);
            return;
        }
        try {
            const response = await cartAPI.getCart(user.uid);
            if (response.data && response.data.cart && Array.isArray(response.data.cart.items)) {
                // Count unique items (product variants) rather than total quantity
                setCartCount(response.data.cart.items.length);
                setCartItems(response.data.cart.items);
            } else {
                setCartCount(0);
                setCartItems([]);
            }
        } catch (error) {
            console.error("Failed to refresh cart count", error);
            // On error, safest to show 0
            setCartCount(0);
            setCartItems([]);
        }
    };

    const triggerCartAnimation = (pos: { x: number; y: number }) => {
        setAnimationStartPos(pos);
    };

    const clearAnimation = () => {
        setAnimationStartPos(null);
    };

    useEffect(() => {
        refreshCart();
    }, [user]);

    return (
        <CartContext.Provider value={{
            cartCount,
            setCartCount,
            refreshCart,
            animationStartPos,
            triggerCartAnimation,
            clearAnimation,
            cartIconPosition,
            setCartIconPosition,
            cartItems
        }}>
            {children}
        </CartContext.Provider>
    );
};
