import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter, Slot, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import AdminSidebar from '@/components/admin/AdminSidebar';

/**
 * Admin Dashboard Layout
 * Provides a shared Stack navigator for all admin/* screens.
 * Auth + role guard runs here so every child screen is protected.
 */
export default function AdminLayout() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            if (user.role !== 'ADMIN') {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const pathname = usePathname();

    if (isDesktop) {
        return (
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#F4F4F8' }}>
                <AdminSidebar />
                <View style={{ flex: 1 }}>
                    <Slot />
                </View>
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: '#F4F4F8' },
            }}
        />
    );
}
