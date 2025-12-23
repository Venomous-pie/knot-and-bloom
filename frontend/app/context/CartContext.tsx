import { cartAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface CartContextType {
    cartCount: number;
    refreshCart: () => Promise<void>;
    animationStartPos: { x: number; y: number } | null;
    triggerCartAnimation: (pos: { x: number; y: number }) => void;
    clearAnimation: () => void;
    cartIconPosition: { x: number; y: number } | null;
    setCartIconPosition: (pos: { x: number; y: number }) => void;
}

const CartContext = createContext<CartContextType>({
    cartCount: 0,
    refreshCart: async () => { },
    animationStartPos: null,
    triggerCartAnimation: () => { },
    clearAnimation: () => { },
    cartIconPosition: null,
    setCartIconPosition: () => { },
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [cartCount, setCartCount] = useState(0);
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
            } else {
                setCartCount(0);
            }
        } catch (error) {
            console.error("Failed to refresh cart count", error);
            // On error, safest to show 0
            setCartCount(0);
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
            refreshCart,
            animationStartPos,
            triggerCartAnimation,
            clearAnimation,
            cartIconPosition,
            setCartIconPosition
        }}>
            {children}
        </CartContext.Provider>
    );
};

// Default export required for expo-router
export default function CartLayout({ children }: { children: React.ReactNode }) {
    return <CartProvider>{children}</CartProvider>;
}
