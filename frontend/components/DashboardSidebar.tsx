import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LayoutDashboard, Package, ShoppingBag, DollarSign, Bell, Store, LogOut, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI } from '@/api/api';

export default function DashboardSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    
    const [sidebarStats, setSidebarStats] = useState({ unreadNotifications: 0, lowStockCount: 0 });

    useEffect(() => {
        if (user && (user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE'))) {
            sellerAPI.getSidebarStats()
                .then(setSidebarStats)
                .catch(console.error);
        }
    }, [user]);

    const menuItems = [
        { label: 'Dashboard', route: '/seller-dashboard', icon: LayoutDashboard },
        { label: 'Products', route: '/seller-dashboard/products', icon: Package, badge: sidebarStats.lowStockCount > 0 ? { type: 'alert', count: sidebarStats.lowStockCount } : null },
        { label: 'Orders', route: '/seller-dashboard/orders', icon: ShoppingBag },
        { label: 'Earnings', route: '/seller-dashboard/earnings', icon: DollarSign },
    ];

    const globalItems = [
        { label: 'Notifications', route: '/profile/notifications', icon: Bell, badge: sidebarStats.unreadNotifications > 0 ? { type: 'count', count: sidebarStats.unreadNotifications } : null },
        { label: 'Storefront', route: '/', icon: Store },
    ];

    return (
        <View style={s.sidebar}>
            {/* Branding */}
            <View style={s.brandArea}>
                <Text style={s.brandLogo}>Knot & Bloom</Text>
                <Text style={s.brandSub}>Seller Control Center</Text>
            </View>

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

            {/* Global Actions */}
            <View style={s.menuSection}>
                <Text style={s.sectionTitle}>Global</Text>
                {globalItems.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={s.menuItem}
                        onPress={() => router.push(item.route as any)}
                    >
                        <item.icon size={20} color="#6B7280" />
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Text style={s.menuText}>{item.label}</Text>
                            {item.badge?.type === 'count' && (
                                <View style={s.countBadge}>
                                    <Text style={s.countBadgeTxt}>{item.badge.count > 9 ? '9+' : item.badge.count}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ flex: 1 }} />

            {/* Footer / Logout */}
            <View style={s.footer}>
                <TouchableOpacity style={s.menuItem} onPress={logout}>
                    <LogOut size={20} color="#EF4444" />
                    <Text style={[s.menuText, { color: '#EF4444' }]}>Sign Out</Text>
                </TouchableOpacity>
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
    },
    brandArea: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    brandLogo: {
        fontSize: 22,
        fontWeight: '800',
        color: '#B36979',
        fontFamily: 'Quicksand',
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
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16,
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
