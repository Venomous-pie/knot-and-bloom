import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface CartAnimationContextType {
    animationStartPos: { x: number; y: number } | null;
    triggerCartAnimation: (pos: { x: number; y: number }) => void;
    clearAnimation: () => void;
    cartIconPosition: { x: number; y: number } | null;
    setCartIconPosition: (pos: { x: number; y: number }) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType>({
    animationStartPos: null,
    triggerCartAnimation: () => { },
    clearAnimation: () => { },
    cartIconPosition: null,
    setCartIconPosition: () => { },
});

export const useCartAnimation = () => useContext(CartAnimationContext);

export const CartAnimationProvider = ({ children }: { children: React.ReactNode }) => {
    const [animationStartPos, setAnimationStartPos] = useState<{ x: number; y: number } | null>(null);
    const [cartIconPosition, setCartIconPosition] = useState<{ x: number; y: number } | null>(null);

    const triggerCartAnimation = useCallback((pos: { x: number; y: number }) => {
        setAnimationStartPos(pos);
    }, []);

    const clearAnimation = useCallback(() => {
        setAnimationStartPos(null);
    }, []);

    const value = useMemo(() => ({
        animationStartPos,
        triggerCartAnimation,
        clearAnimation,
        cartIconPosition,
        setCartIconPosition,
    }), [animationStartPos, triggerCartAnimation, clearAnimation, cartIconPosition]);

    return (
        <CartAnimationContext.Provider value={value}>
            {children}
        </CartAnimationContext.Provider>
    );
};
