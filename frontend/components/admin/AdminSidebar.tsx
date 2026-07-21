import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter, usePathname, Link } from 'expo-router';
import { LayoutDashboard, Package, Users, Bell, Settings, Home, LogOut, ChevronUp, ChevronDown, User, HelpCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { sellerAPI } from '@/api/api';

export default function AdminSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [adminStats, setAdminStats] = useState({ pendingSellers: 0, pendingProducts: 0 });

    React.useEffect(() => {
        if (user?.role === 'ADMIN') {
            sellerAPI.getAdminSidebarStats()
                .then(setAdminStats)
                .catch(err => console.error("Failed to load admin sidebar stats:", err));
        }
    }, [user]);

    const menuItems = [
        { label: 'Dashboard', route: '/admin', icon: LayoutDashboard },
        { label: 'Sellers', route: '/admin/sellers', icon: Users },
        { label: 'Products', route: '/admin/products', icon: Package },
    ];

    const globalItems = [
        { label: 'Notifications', route: '/admin/notifications', icon: Bell },
        { label: 'Shop Home', route: '/', icon: Home },
        { label: 'Platform Settings', route: '/admin/settings', icon: Settings },
    ];

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
                <Text style={s.brandSub}>Admin Control Center</Text>
            </View>

            <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
                {/* Main Menu */}
                <View style={s.menuSection}>
                    <Text style={s.sectionTitle}>Main Menu</Text>
                    {menuItems.map((item, idx) => {
                        const isActive = pathname === item.route || (item.route !== '/admin' && pathname.startsWith(item.route));
                        
                        let badgeCount = 0;
                        if (item.route === '/admin/sellers') badgeCount = adminStats.pendingSellers;
                        if (item.route === '/admin/products') badgeCount = adminStats.pendingProducts;

                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[s.menuItem, isActive && s.menuItemActive]}
                                onPress={() => router.push(item.route as any)}
                            >
                                <item.icon size={20} color={isActive ? '#B36979' : '#6B7280'} />
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={[s.menuText, isActive && s.menuTextActive]}>{item.label}</Text>
                                    {badgeCount > 0 && (
                                        <View style={s.badge}>
                                            <Text style={s.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
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
                        { title: 'Settings', href: '/admin/settings' as any, icon: <Settings size={16} color="#4B5563" /> },
                        { title: 'Help Center', href: '/customer-service' as any, icon: <HelpCircle size={16} color="#4B5563" /> },
                        { type: 'separator' },
                        { title: 'Log Out', onPress: logout, icon: <LogOut size={16} color="#EF4444" /> }
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
                            <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'A'}</Text>
                        </View>
                        <View style={s.userDetails}>
                            <Text style={s.userName} numberOfLines={1}>{user?.name || 'Admin'}</Text>
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
    badge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'Quicksand',
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
});
