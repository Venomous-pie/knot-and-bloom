import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, DeviceEventEmitter } from 'react-native';
import { useRouter, usePathname, Link } from 'expo-router';
import { LayoutDashboard, Package, ShoppingBag, DollarSign, Bell, AlertTriangle, PenTool, TrendingUp, BarChart2, Star, Settings, Home, LogOut, ChevronUp, ChevronDown, User, HelpCircle, Truck, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { sellerAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { theme } from '@/constants/theme';
import DropdownMenu, { DropdownItem } from '@/components/ui/DropdownMenu';

export default function DashboardSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { confirm } = useDialog();
    
    const [showUserMenu, setShowUserMenu] = useState(false);

    const isAuthorized = !!(user && (user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE')));

    const { data: sidebarStats = { unreadNotifications: 0, lowStockCount: 0 }, refetch } = useQuery({
        queryKey: ['sidebarStats'],
        queryFn: () => sellerAPI.getSidebarStats(),
        enabled: isAuthorized,
        staleTime: 60 * 1000,
    });

    useEffect(() => {
        if (isAuthorized) {
            const listener = DeviceEventEmitter.addListener('notificationRead', () => refetch());
            return () => {
                listener.remove();
            };
        }
    }, [isAuthorized, refetch]);

    const menuItems = [
        { label: 'Dashboard', route: '/seller-dashboard', icon: LayoutDashboard },
        { label: 'Products', route: '/seller-dashboard/products', icon: Package, badge: sidebarStats.lowStockCount > 0 ? { type: 'alert', count: sidebarStats.lowStockCount } : null },
        { label: 'Orders', route: '/seller-dashboard/orders', icon: ShoppingBag },
        { label: 'Earnings', route: '/seller-dashboard/earnings', icon: DollarSign },
        { label: 'Custom Orders', route: '/seller-dashboard/custom-orders', icon: PenTool },
    ];

    const analyticsItems = [
        { label: 'Sales Trends', route: '/seller-dashboard/sales-trends', icon: TrendingUp },
        { label: 'Product Performance', route: '/seller-dashboard/product-performance', icon: BarChart2 },
        { label: 'Reviews & Ratings', route: '/seller-dashboard/reviews', icon: Star },
    ];

    const globalItems = [
        ...(user?.role === 'ADMIN' ? [{ label: 'Admin Dashboard', route: '/admin', icon: Shield }] : []),
        { label: 'Shop Home', route: '/', icon: Home },
        { label: 'Store Settings', route: '/seller-dashboard/settings', icon: Settings },
    ];

    const handleLogout = async () => {
        const confirmed = await confirm({
            title: "Log Out",
            message: "Are you sure you want to log out of your account?",
            confirmText: "Log Out",
            cancelText: "Cancel",
            isDestructive: true
        });
        if (confirmed) {
            await logout();
        }
    };

    return (
        <View style={s.sidebar}>
            {/* Branding */}
            <View style={s.brandArea}>
                <Link href='/' asChild>
                    <TouchableOpacity style={{ flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                        <Image source={require('@/assets/yarn.png')} style={{ width: 44, height: 44 }} resizeMode='contain' />
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.primary, marginTop: 10, fontWeight: 'bold', fontSize: 18 }}>Knot</Text>
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.secondary, marginTop: 10, fontWeight: 'bold', fontSize: 18 }}>&Bloom</Text>
                    </TouchableOpacity>
                </Link>
                <Text style={s.brandSub}>Seller Control Center</Text>
            </View>

            <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
                {/* Main Menu */}
                <View style={s.menuSection}>
                <Text style={s.sectionTitle}>Main Menu</Text>
                {menuItems.map((item, idx) => {
                    const isActive = pathname === item.route || (item.route !== '/seller-dashboard' && pathname.startsWith(item.route));
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[s.menuItem, isActive && s.menuItemActive]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <item.icon size={20} color={isActive ? '#B36979' : '#6B7280'} />
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[s.menuText, isActive && s.menuTextActive]}>{item.label}</Text>
                                {item.badge?.type === 'alert' && (
                                    <View style={s.alertBadge}>
                                        <AlertTriangle size={12} color="#D97706" />
                                        <Text style={s.alertBadgeTxt}>{item.badge.count}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Analytics */}
            <View style={s.menuSection}>
                <Text style={s.sectionTitle}>Analytics</Text>
                {analyticsItems.map((item, idx) => {
                    const isActive = pathname === item.route || (item.route !== '/seller-dashboard' && pathname.startsWith(item.route));
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[s.menuItem, isActive && s.menuItemActive]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <item.icon size={20} color={isActive ? '#B36979' : '#6B7280'} />
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[s.menuText, isActive && s.menuTextActive]}>{item.label}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Global Actions */}
            <View style={s.menuSection}>
                <Text style={s.sectionTitle}>Global</Text>
                {globalItems.map((item, idx) => {
                    const isActive = pathname === item.route || (item.route !== '/' && pathname.startsWith(item.route));
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[s.menuItem, isActive && s.menuItemActive]}
                            onPress={() => router.push(item.route as any)}
                        >
                            <item.icon size={20} color={isActive ? '#B36979' : '#6B7280'} />
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[s.menuText, isActive && s.menuTextActive]}>{item.label}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
            </ScrollView>
            
            <View style={{ flex: 1 }} />

            {/* User Menu / Footer */}
            <View style={s.footer}>
                <DropdownMenu
                    items={[
                        { title: 'Profile', href: '/profile' as any, icon: <User size={16} color="#4B5563" /> },
                        { title: 'Settings', href: '/seller-dashboard/settings' as any, icon: <Settings size={16} color="#4B5563" /> },
                        { title: 'Help Center', href: '/customer-service' as any, icon: <HelpCircle size={16} color="#4B5563" /> },
                        { type: 'separator' },
                        { title: 'Log Out', onPress: handleLogout, icon: <LogOut size={16} color="#EF4444" /> }
                    ]}
                    isOpen={showUserMenu}
                    onOpenChange={setShowUserMenu}
                    style={{ width: '100%' }}
                    placement="top"
                    align="start"
                    alignOffset={60}
                >
                    <View style={s.userInfo}>
                        <View style={s.avatarPlaceholder}>
                            <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'S'}</Text>
                        </View>
                        <View style={s.userDetails}>
                            <Text style={s.userName} numberOfLines={1}>{user?.name || 'Seller'}</Text>
                            <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
                        </View>
                        {showUserMenu ? <ChevronDown size={16} color="#9CA3AF" /> : <ChevronUp size={16} color="#9CA3AF" />}
                    </View>
                </DropdownMenu>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    sidebar: {
        width: 260,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        height: '100%',
        paddingVertical: 24,
        zIndex: 50,
    },
    brandArea: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    brandSub: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        fontFamily: 'Quicksand',
    },
    menuSection: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        paddingHorizontal: 8,
        fontFamily: 'Quicksand',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    menuItemActive: {
        backgroundColor: '#FFF1F2',
    },
    menuText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4B5563',
        marginLeft: 12,
        fontFamily: 'Quicksand',
    },
    menuTextActive: {
        color: '#B36979',
        fontWeight: '700',
    },
    footer: {
        paddingHorizontal: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FDEEF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#B36979',
        fontFamily: 'Quicksand',
    },
    userDetails: {
        marginLeft: 12,
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        fontFamily: 'Quicksand',
    },
    userEmail: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'Quicksand',
    },
    alertBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 4
    },
    alertBadgeTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: '#D97706',
        fontFamily: 'Quicksand'
    },
    countBadge: {
        backgroundColor: '#EF4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4
    },
    countBadgeTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
        fontFamily: 'Quicksand'
    }
});
