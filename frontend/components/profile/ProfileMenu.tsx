import { accountAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ViewStyle
} from 'react-native';
import {
    AlertTriangle,
    Bell,
    ChevronRight,
    CreditCard,
    LogOut,
    MapPin,
    Megaphone,
    Package,
    Shield,
    ShoppingBag,
    LayoutDashboard,
    Settings,
    Star,
    Users,
    DollarSign,
    Trash2,
    User,
    Wallet,
    Store
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';

interface MenuItemProps {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showBadge?: boolean;
    badgeText?: string;
    danger?: boolean;
    isActive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress, showBadge, badgeText, danger, isActive }) => (
    <Pressable
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={onPress}
    >
        <View style={styles.menuItemLeft}>
            <View style={styles.iconContainer}>
                {/* Clone element to override color if active, strictly optional but nice touch */}
                {React.isValidElement(icon)
                    ? React.cloneElement(icon as React.ReactElement<any>, {
                        color: isActive ? theme.colors.primary : (danger ? theme.colors.error : theme.colors.textSecondary)
                    })
                    : icon
                }
            </View>
            <View>
                <Text style={[
                    styles.menuItemText,
                    danger && styles.dangerText,
                    isActive && styles.menuItemTextActive
                ]}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        <View style={styles.menuItemRight}>
            {showBadge && badgeText && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
            )}
            <ChevronRight size={20} color={isActive ? theme.colors.primary : theme.colors.border} />
        </View>
    </Pressable>
);

interface MenuSectionProps {
    title: string;
    children: React.ReactNode;
}

const MenuSection: React.FC<MenuSectionProps> = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>{children}</View>
    </View>
);

interface StoreHealthProps {
    rating: string | number;
    sales: string | number;
    orders: number;
}

const StoreHealthItem: React.FC<StoreHealthProps> = ({ rating, sales, orders }) => (
    <View style={styles.healthContainer}>
        <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: '#FFF3E0' }]}>
                <Star size={16} color={theme.colors.warning} fill={theme.colors.warning} />
            </View>
            <View>
                <Text style={styles.healthValue}>{Number(rating || 0).toFixed(1)}</Text>
                <Text style={styles.healthLabel}>Rating</Text>
            </View>
        </View>
        <View style={styles.healthDivider} />
        <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: '#E8F5E9' }]}>
                <DollarSign size={16} color={theme.colors.success} />
            </View>
            <View>
                <Text style={styles.healthValue}>₱{Number(sales || 0).toLocaleString()}</Text>
                <Text style={styles.healthLabel}>Sales</Text>
            </View>
        </View>
        <View style={styles.healthDivider} />
        <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: '#E3F2FD' }]}>
                <Package size={16} color="#2196F3" />
            </View>
            <View>
                <Text style={styles.healthValue}>{orders || 0}</Text>
                <Text style={styles.healthLabel}>Orders</Text>
            </View>
        </View>
    </View>
);

interface ProfileMenuProps {
    style?: ViewStyle;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ style }) => {
    const { user, logout, refreshUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [deletionStatus, setDeletionStatus] = useState<{ hasPendingDeletion: boolean; deletionScheduledFor?: string | null }>({ hasPendingDeletion: false });

    useEffect(() => {
        if (user) {
            refreshUser();
            fetchDeletionStatus();
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!user && !authLoading) {
            router.replace('/auth/login' as RelativePathString);
        }
    }, [user, authLoading]);

    const fetchDeletionStatus = async () => {
        try {
            const response = await accountAPI.getDeletionStatus();
            setDeletionStatus(response.data);
        } catch (error) {
            console.error('Error fetching deletion status:', error);
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    if (authLoading || !user) {
        return (
            <View style={[styles.loadingContainer, style]}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, style]}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>My Profile</Text>
                    <Pressable onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                </View>

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        {user.avatar ? (
                            <Image
                                source={{ uri: user.avatar }}
                                style={styles.avatarImage}
                            />
                        ) : (
                            <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userEmail}>{user.email || user.phone}</Text>
                    </View>
                </View>

                {/* Deletion Warning */}
                {deletionStatus.hasPendingDeletion && (
                    <Pressable
                        style={styles.warningBanner}
                    >
                        <View style={styles.warningIcon}>
                            <AlertTriangle size={24} color="#E65100" />
                        </View>
                        <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>Account Deletion Scheduled</Text>
                            <Text style={styles.warningText}>
                                Your account will be deleted on {deletionStatus.deletionScheduledFor ? new Date(deletionStatus.deletionScheduledFor).toLocaleDateString() : 'soon'}. Tap to cancel.
                            </Text>
                        </View>
                    </Pressable>
                )}

                {/* Platform Admin Section */}
                {user.role === 'ADMIN' && (
                    <MenuSection title="Platform Admin">
                        <MenuItem
                            icon={<Shield size={20} />}
                            title="Admin Dashboard"
                            subtitle="Platform overview & stats"
                            isActive={pathname === '/admin'}
                            onPress={() => router.push('/admin' as RelativePathString)}
                        />
                        <MenuItem
                            icon={<Users size={20} />}
                            title="Manage Sellers"
                            subtitle="Review applications & accounts"
                            isActive={pathname === '/admin/sellers'}
                            onPress={() => router.push('/admin/sellers' as RelativePathString)}
                        />
                    </MenuSection>
                )}

                {/* Seller Store Section */}
                {user.sellerStatus === 'ACTIVE' && (
                    <MenuSection title="My Store">
                        <View style={styles.healthWrapper}>
                            <StoreHealthItem
                                rating={user.sellerRating || 0}
                                sales={user.sellerTotalSales || 0}
                                orders={user.sellerTotalOrders || 0}
                            />
                        </View>

                        <MenuItem
                            icon={<LayoutDashboard size={20} />}
                            title="Seller Dashboard"
                            subtitle="Manage your business"
                            isActive={pathname.startsWith('/seller-dashboard')}
                            onPress={() => router.push('/seller-dashboard/orders' as RelativePathString)}
                        />
                        <MenuItem
                            icon={<ShoppingBag size={20} />}
                            title="My Store"
                            subtitle="View your storefront"
                            onPress={() => user.sellerSlug && router.push(`/seller/${user.sellerSlug}` as RelativePathString)}
                        />
                        <MenuItem
                            icon={<Package size={20} />}
                            title="Products"
                            subtitle="Manage inventory"
                            isActive={pathname === '/seller-dashboard/products'}
                            onPress={() => router.push('/seller-dashboard/products' as RelativePathString)}
                        />
                        <MenuItem
                            icon={<Wallet size={20} />}
                            title="Earnings & Payouts"
                            subtitle="Cash out your sales"
                            isActive={pathname === '/seller-dashboard/earnings'}
                            onPress={() => router.push('/seller-dashboard/earnings' as RelativePathString)}
                        />
                        <MenuItem
                            icon={<Settings size={20} />}
                            title="Seller Settings"
                            subtitle="AI tools & preferences"
                            isActive={pathname === '/seller-dashboard/settings'}
                            onPress={() => router.push('/seller-dashboard/settings' as RelativePathString)}
                        />
                    </MenuSection>
                )}

                {/* My Account Section */}
                <MenuSection title="My Account">
                    {(!user?.sellerStatus || user.sellerStatus === 'NONE') && user?.role !== 'ADMIN' && (
                        <MenuItem
                            icon={<Store size={20} />}
                            title="Be a Seller"
                            subtitle="Start your own store"
                            isActive={pathname === '/seller/apply'}
                            onPress={() => router.push('/seller/apply' as RelativePathString)}
                        />
                    )}
                    {(user?.sellerStatus === 'PENDING' || user?.sellerStatus === 'REJECTED') && (
                        <MenuItem
                            icon={<Store size={20} />}
                            title="Application Status"
                            subtitle={user.sellerStatus === 'PENDING' ? "Track your application" : "Update your application"}
                            isActive={pathname === '/seller/application-status'}
                            onPress={() => router.push('/seller/application-status' as RelativePathString)}
                        />
                    )}
                    <MenuItem
                        icon={<User size={20} />}
                        title="Profile"
                        subtitle="Personal information"
                        isActive={pathname === '/profile/account'}
                        onPress={() => router.push('/profile/account' as RelativePathString)}
                    />
                    <MenuItem
                        icon={<CreditCard size={20} />}
                        title="Payment Methods"
                        subtitle="GCash, PayMaya, Bank"
                        isActive={pathname === '/profile/account/payment-methods'}
                        onPress={() => router.push('/profile/account/payment-methods' as RelativePathString)}
                    />
                    <MenuItem
                        icon={<MapPin size={20} />}
                        title="Addresses"
                        subtitle="Saved shipping addresses"
                        isActive={pathname === '/profile/account/addresses'}
                        onPress={() => router.push('/profile/account/addresses' as RelativePathString)}
                    />
                    <MenuItem
                        icon={<Bell size={20} />}
                        title="Notification Settings"
                        isActive={pathname === '/profile/notifications/settings'}
                        onPress={() => router.push('/profile/notifications/settings' as RelativePathString)}
                    />
{/* Destructive actions hidden temporarily
                    <MenuItem
                        icon={<Trash2 size={20} color={theme.colors.error} />}
                        title="Request Account Deletion"
                        isActive={pathname === '/profile/account/delete-account'}
                        onPress={() => router.push('/profile/account/delete-account' as RelativePathString)}
                        danger
                    />
                    */}
                </MenuSection>

                {/* My Orders Section */}
                <MenuSection title="My Orders">
                    <MenuItem
                        icon={<Package size={20} />}
                        title="Order History"
                        subtitle="View all orders"
                        isActive={pathname === '/profile/orders'}
                        onPress={() => router.push('/profile/orders' as RelativePathString)}
                    />
                </MenuSection>

                {/* Notifications Section */}
                <MenuSection title="Notifications">
                    <MenuItem
                        icon={<Megaphone size={20} />}
                        title="Knot & Bloom Updates"
                        subtitle="News and promotions"
                        isActive={pathname === '/profile/notifications'}
                        onPress={() => router.push('/profile/notifications' as RelativePathString)}
                    />
                </MenuSection>



            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: Platform.OS === 'web' ? 'Quicksand' : 'System',
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    userCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    avatarImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    warningBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    warningIcon: {
        marginRight: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.warning,
        marginBottom: 2,
    },
    warningText: {
        fontSize: 12,
        color: theme.colors.warning,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        minHeight: 72,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    menuItemActive: {
        backgroundColor: theme.colors.background, // Subtle gray instead of pink
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
    },
    menuItemTextActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 12,
        width: 24,
        alignItems: 'center',
    },
    menuItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
    },
    menuSubtitle: {
        fontSize: 11,
        color: theme.colors.textLight,
        marginTop: 2,
    },
    dangerText: {
        color: theme.colors.error,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: theme.colors.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    healthWrapper: {
        padding: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    healthContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        padding: 12,
    },
    healthItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center content within the item
    },
    healthIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    healthValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    healthLabel: {
        fontSize: 10,
        color: theme.colors.textLight,
        fontWeight: '500',
    },
    healthDivider: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.border,
        marginHorizontal: 4,
    },
});
