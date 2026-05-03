import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

/**
 * Seller Dashboard Layout
 * Provides a shared Stack navigator for all seller-dashboard/* screens.
 * Auth + role guard runs here so every child screen is protected.
 */
export default function SellerDashboardLayout() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            const isAuthorized =
                user.role === 'ADMIN' ||
                (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    return (
        <Stack
            screenOptions={{
                headerShown: false,       // Each screen manages its own header
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: '#F4F4F8' },
            }}
        />
    );
}
