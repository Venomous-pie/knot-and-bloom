import { wishlistAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface WishlistContextType {
    wishlistCount: number;
    wishlistedProductIds: Set<number>;
    refreshWishlist: () => Promise<void>;
    toggleWishlist: (productId: number) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextType>({
    wishlistCount: 0,
    wishlistedProductIds: new Set(),
    refreshWishlist: async () => { },
    toggleWishlist: async () => false,
});

export const useWishlist = () => useContext(WishlistContext);

export default function WishlistProviderScreen() { return null; }

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [wishlistCount, setWishlistCount] = useState(0);
    const [wishlistedProductIds, setWishlistedProductIds] = useState<Set<number>>(new Set());

    const refreshWishlist = async () => {
        if (!user?.uid) {
            setWishlistCount(0);
            setWishlistedProductIds(new Set());
            return;
        }
        try {
            const response = await wishlistAPI.getWishlist(user.uid);
            if (response.data && response.data.wishlist && Array.isArray(response.data.wishlist.items)) {
                setWishlistCount(response.data.wishlist.items.length);
                const ids = new Set<number>(response.data.wishlist.items.map((item: any) => item.productId));
                setWishlistedProductIds(ids);
            } else {
                setWishlistCount(0);
                setWishlistedProductIds(new Set());
            }
        } catch (error) {
            console.error("Failed to refresh wishlist count", error);
            setWishlistCount(0);
            setWishlistedProductIds(new Set());
        }
    };

    const toggleWishlist = async (productId: number) => {
        if (!user?.uid) return false;

        const originalIds = new Set(wishlistedProductIds);
        const originalCount = wishlistCount;

        // Optimistic update
        const newIds = new Set(wishlistedProductIds);
        if (newIds.has(productId)) {
            newIds.delete(productId);
            setWishlistCount(prev => Math.max(0, prev - 1));
        } else {
            newIds.add(productId);
            setWishlistCount(prev => prev + 1);
        }
        setWishlistedProductIds(newIds);

        try {
            const res = await wishlistAPI.toggleWishlistItem(user.uid, productId);
            if (res.data && res.data.success) {
                return true;
            } else {
                throw new Error("Toggle failed");
            }
        } catch (error) {
            console.error("Failed to toggle wishlist item", error);
            // Revert optimistic update
            setWishlistedProductIds(originalIds);
            setWishlistCount(originalCount);
            return false;
        }
    };

    useEffect(() => {
        refreshWishlist();
    }, [user]);

    return (
        <WishlistContext.Provider value={{
            wishlistCount,
            wishlistedProductIds,
            refreshWishlist,
            toggleWishlist,
        }}>
            {children}
        </WishlistContext.Provider>
    );
};
