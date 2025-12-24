import { notificationAPI, Notification } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    Bell,
    ChevronRight,
    Package,
    Settings,
    Tag,
    Trash2
} from 'lucide-react-native';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    order: <Package size={20} color="#1976D2" />,
    promo: <Tag size={20} color="#F57C00" />,
    system: <Bell size={20} color="#7B1FA2" />,
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    order: { bg: '#E3F2FD', text: '#1976D2', border: '#BBDEFB' },
    promo: { bg: '#FFF3E0', text: '#F57C00', border: '#FFE0B2' },
    system: { bg: '#F3E5F5', text: '#7B1FA2', border: '#E1BEE7' },
};

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchNotifications();
        }
    }, [user, authLoading]);

    const fetchNotifications = async () => {
        try {
            const response = await notificationAPI.getNotifications();
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, []);

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            await notificationAPI.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.uid === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;

        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('Error', 'Failed to mark all as read');
        }
    };

    const handleDelete = async (notificationId: number) => {
        try {
            await notificationAPI.deleteNotification(notificationId);
            const deleted = notifications.find(n => n.uid === notificationId);
            setNotifications(prev => prev.filter(n => n.uid !== notificationId));
            if (deleted && !deleted.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>Notifications</Text>
                {unreadCount > 0 ? (
                    <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </Pressable>
                ) : (
                    <View style={{ width: 80 }} />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C88EA7']} />
                }
            >
                {notifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Bell size={48} color="#ddd" />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptyText}>
                            You'll receive updates about orders, promotions, and more here.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {notifications.map((notification) => {
                            const typeStyle = TYPE_COLORS[notification.type] || TYPE_COLORS.system;
                            return (
                                <Pressable
                                    key={notification.uid}
                                    style={[
                                        styles.notificationCard,
                                        !notification.isRead && styles.unreadCard,
                                    ]}
                                    onPress={() => {
                                        if (!notification.isRead) {
                                            handleMarkAsRead(notification.uid);
                                        }
                                    }}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: typeStyle.bg }]}>
                                        {TYPE_ICONS[notification.type] || <Bell size={20} color="#555" />}
                                    </View>
                                    <View style={styles.content}>
                                        <View style={styles.titleRow}>
                                            <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
                                                {notification.title}
                                            </Text>
                                            <Pressable
                                                style={styles.deleteButton}
                                                onPress={() => handleDelete(notification.uid)}
                                                hitSlop={10}
                                            >
                                                <Trash2 size={16} color="#ccc" />
                                            </Pressable>
                                        </View>
                                        <Text style={styles.message} numberOfLines={2}>
                                            {notification.message}
                                        </Text>
                                        <View style={styles.footerRow}>
                                            <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
                                        </View>
                                    </View>
                                    {!notification.isRead && <View style={styles.unreadDot} />}
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* Settings Link */}
                <Pressable
                    style={styles.settingsLink}
                    onPress={() => router.push('/profile/notifications/settings' as RelativePathString)}
                >
                    <Settings size={20} color="#555" style={{ marginRight: 12 }} />
                    <Text style={styles.settingsText}>Notification Settings</Text>
                    <ChevronRight size={20} color="#ccc" />
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    markAllButton: {
        padding: 8,
    },
    markAllText: {
        color: '#C88EA7',
        fontSize: 14,
        fontWeight: '500',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    emptyState: {
        alignItems: 'center',
        padding: 60,
        marginTop: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'Quicksand',
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    list: {
        gap: 12,
    },
    notificationCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    unreadCard: {
        backgroundColor: 'white',
        borderLeftWidth: 3,
        borderLeftColor: '#C88EA7', // Pink indicator only
        borderColor: 'transparent',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8,
        fontFamily: 'Quicksand',
    },
    unreadTitle: {
        color: '#B36979',
        fontWeight: '700',
    },
    time: {
        fontSize: 11,
        color: '#999',
    },
    message: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 4,
    },
    deleteButton: {
        padding: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#C88EA7',
        position: 'absolute',
        top: 16,
        right: 16,
    },
    settingsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginTop: 24,
        marginBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    settingsText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
    },
});
