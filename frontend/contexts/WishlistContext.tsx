import { wishlistAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';

interface WishlistContextType {
    wishlistCount: number;
    wishlistedProductIds: Set<number>;
    refreshWishlist: () => Promise<void>;
    toggleWishlist: (productId: number) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [wishlistedProductIds, setWishlistedProductIds] = useState<Set<number>>(new Set());
    
    // Derive wishlistCount directly from the Set to eliminate split-state race conditions
    const wishlistCount = wishlistedProductIds.size;

    const currentFetchIdRef = useRef(0);
    const pendingTogglesRef = useRef<Set<number>>(new Set());

    const refreshWishlist = useCallback(async () => {
        if (!user?.uid) {
            setWishlistedProductIds(new Set());
            return;
        }

        const fetchId = ++currentFetchIdRef.current;

        try {
            const response = await wishlistAPI.getWishlist(user.uid);
            
            // Staleness guard: bail if user changed or another refresh started while in flight
            if (fetchId !== currentFetchIdRef.current) return;

            if (response.data?.wishlist?.items && Array.isArray(response.data.wishlist.items)) {
                const ids = new Set<number>(response.data.wishlist.items.map((item: { productId: number }) => item.productId));
                setWishlistedProductIds(ids);
            } else {
                setWishlistedProductIds(new Set());
            }
        } catch (error) {
            if (fetchId !== currentFetchIdRef.current) return;
            console.error("Failed to refresh wishlist", error);
            setWishlistedProductIds(new Set());
        }
    }, [user?.uid]);

    const toggleWishlist = useCallback(async (productId: number) => {
        if (!user?.uid) return false;

        // In-flight guard to prevent overlapping toggle requests for the same product
        if (pendingTogglesRef.current.has(productId)) return false;
        pendingTogglesRef.current.add(productId);

        let wasWishlisted = false;

        // Optimistic update
        setWishlistedProductIds(prev => {
            wasWishlisted = prev.has(productId);
            const next = new Set(prev);
            if (wasWishlisted) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });

        try {
            const res = await wishlistAPI.toggleWishlistItem(user.uid, productId);
            if (res.data?.success) {
                return true;
            } else {
                throw new Error("Toggle failed");
            }
        } catch (error) {
            console.error("Failed to toggle wishlist item", error);
            // Targeted revert just for this product, preserving any other updates that happened
            setWishlistedProductIds(prev => {
                const next = new Set(prev);
                if (wasWishlisted) {
                    next.add(productId);
                } else {
                    next.delete(productId);
                }
                return next;
            });
            return false;
        } finally {
            pendingTogglesRef.current.delete(productId);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user?.uid) {
            // Cancel any in-flight fetches by bumping the fetch ID
            currentFetchIdRef.current++;
            setWishlistedProductIds(new Set());
        } else {
            refreshWishlist();
        }
    }, [user?.uid, refreshWishlist]);

    const contextValue = useMemo(() => ({
        wishlistCount,
        wishlistedProductIds,
        refreshWishlist,
        toggleWishlist,
    }), [wishlistCount, wishlistedProductIds, refreshWishlist, toggleWishlist]);

    return (
        <WishlistContext.Provider value={contextValue}>
            {children}
        </WishlistContext.Provider>
    );
};
