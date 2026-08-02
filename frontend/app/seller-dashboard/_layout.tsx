import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter, Slot, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

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
                (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const pathname = usePathname();
    const isFullWidth = pathname.includes('/products/form') || pathname.includes('/add-payout-method');

    if (isDesktop) {
        return (
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#F4F4F8' }}>
                {!isFullWidth && <DashboardSidebar />}
                <View style={{ flex: 1 }}>
                    <Slot />
                </View>
            </View>
        );
    }

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
