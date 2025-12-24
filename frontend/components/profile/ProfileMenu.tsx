import { accountAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ViewStyle
} from 'react-native';
import { CircleUserRound } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showBadge?: boolean;
    badgeText?: string;
    danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress, showBadge, badgeText, danger }) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <Text style={styles.menuIcon}>{icon}</Text>
            <View>
                <Text style={[styles.menuItemText, danger && styles.dangerText]}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
        </View>
        <View style={styles.menuItemRight}>
            {showBadge && badgeText && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
            )}
            <Text style={styles.chevron}>›</Text>
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

interface ProfileMenuProps {
    style?: ViewStyle;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ style }) => {
    const { user, logout, refreshUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const [deletionStatus, setDeletionStatus] = useState<{ hasPendingDeletion: boolean; deletionScheduledFor?: string | null }>({ hasPendingDeletion: false });

    useEffect(() => {
        refreshUser();
        fetchDeletionStatus();
    }, []);

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
                <ActivityIndicator size="large" color="#C88EA7" />
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
                        <Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userEmail}>{user.email || user.phone}</Text>
                        {user.sellerStatus && (
                            <View style={[styles.statusBadge, { backgroundColor: user.sellerStatus === 'ACTIVE' ? '#E8F5E9' : '#FFF3E0' }]}>
                                <Text style={[styles.statusText, { color: user.sellerStatus === 'ACTIVE' ? '#4CAF50' : '#FF9800' }]}>
                                    {user.sellerStatus === 'ACTIVE' ? '✓ Seller' : '⏳ Pending Seller'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Deletion Warning */}
                {deletionStatus.hasPendingDeletion && (
                    <Pressable
                        style={styles.warningBanner}
                        onPress={() => router.push('/profile/account/delete-account' as RelativePathString)}
                    >
                        <Text style={styles.warningIcon}>⚠️</Text>
                        <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>Account Deletion Scheduled</Text>
                            <Text style={styles.warningText}>
                                Your account will be deleted on {deletionStatus.deletionScheduledFor ? new Date(deletionStatus.deletionScheduledFor).toLocaleDateString() : 'soon'}. Tap to cancel.
                            </Text>
                        </View>
                    </Pressable>
                )}

                {/* My Account Section */}
                <MenuSection title="My Account">
                    <MenuItem
                        icon="👤"
                        title="Profile"
                        subtitle="Personal information"
                        onPress={() => router.push('/profile/account' as RelativePathString)}
                    />
                    <MenuItem
                        icon="💳"
                        title="Payment Methods"
                        subtitle="GCash, PayMaya, Bank"
                        onPress={() => router.push('/profile/account/payment-methods' as RelativePathString)}
                    />
                    <MenuItem
                        icon="📍"
                        title="Addresses"
                        subtitle="Saved shipping addresses"
                        onPress={() => router.push('/profile/account/addresses' as RelativePathString)}
                    />
                    <MenuItem
                        icon="🔔"
                        title="Notification Settings"
                        onPress={() => router.push('/profile/notifications/settings' as RelativePathString)}
                    />
                    <MenuItem
                        icon="🗑️"
                        title="Request Account Deletion"
                        onPress={() => router.push('/profile/account/delete-account' as RelativePathString)}
                        danger
                    />
                </MenuSection>

                {/* My Orders Section */}
                <MenuSection title="My Orders">
                    <MenuItem
                        icon="📦"
                        title="Order History"
                        subtitle="View all orders"
                        onPress={() => router.push('/profile/orders' as RelativePathString)}
                    />
                </MenuSection>

                {/* Notifications Section */}
                <MenuSection title="Notifications">
                    <MenuItem
                        icon="📢"
                        title="Knot & Bloom Updates"
                        subtitle="News and promotions"
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
        backgroundColor: '#F9F9F9',
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: '#B36979',
        fontWeight: '600',
    },
    userCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#C88EA7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
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
        fontSize: 24,
        marginRight: 12,
    },
    warningContent: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 2,
    },
    warningText: {
        fontSize: 12,
        color: '#F57C00',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    sectionContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: "#000",
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
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    menuSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    dangerText: {
        color: '#E53935',
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        backgroundColor: '#C88EA7',
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
    chevron: {
        fontSize: 20,
        color: '#ccc',
        fontWeight: 'bold',
    },
});
