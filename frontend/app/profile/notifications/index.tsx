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

const TYPE_ICONS: Record<string, string> = {
    order: '📦',
    promo: '🎉',
    system: '🔔',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    order: { bg: '#E3F2FD', text: '#1976D2' },
    promo: { bg: '#FFF3E0', text: '#F57C00' },
    system: { bg: '#F3E5F5', text: '#7B1FA2' },
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
                        <Text style={styles.emptyIcon}>🔔</Text>
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
                                        <Text style={styles.icon}>
                                            {TYPE_ICONS[notification.type] || '🔔'}
                                        </Text>
                                    </View>
                                    <View style={styles.content}>
                                        <View style={styles.titleRow}>
                                            <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
                                                {notification.title}
                                            </Text>
                                            <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
                                        </View>
                                        <Text style={styles.message} numberOfLines={2}>
                                            {notification.message}
                                        </Text>
                                        <View style={styles.actions}>
                                            <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg }]}>
                                                <Text style={[styles.typeText, { color: typeStyle.text }]}>
                                                    {notification.type}
                                                </Text>
                                            </View>
                                            <Pressable onPress={() => handleDelete(notification.uid)}>
                                                <Text style={styles.deleteText}>Delete</Text>
                                            </Pressable>
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
                    <Text style={styles.settingsIcon}>⚙️</Text>
                    <Text style={styles.settingsText}>Notification Settings</Text>
                    <Text style={styles.chevron}>›</Text>
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
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
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
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
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
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: '#FDFBFC',
        borderLeftWidth: 3,
        borderLeftColor: '#C88EA7',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
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
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
        color: '#888',
    },
    message: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 8,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    deleteText: {
        color: '#E53935',
        fontSize: 12,
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
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    settingsIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    settingsText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    chevron: {
        fontSize: 20,
        color: '#ccc',
    },
});
