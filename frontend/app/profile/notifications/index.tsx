import { notificationAPI, Notification } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout';
import { theme } from '@/constants/theme';

import {
    Bell,
    ChevronRight,
    Package,
    Settings,
    Tag,
    Trash2,
    X
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

const TYPE_LABELS: Record<string, string> = {
    order: 'Order Update',
    promo: 'Promotion',
    system: 'System Message',
};

// Parse message into formal sections: greeting, subject, body, closing
function parseFormalMessage(title: string, message: string) {
    const lines = message.split('\n').filter(l => l.trim().length > 0);
    
    // Try to detect a greeting line (starts with Hi, Hello, Dear, Good, Greetings)
    const greetingRegex = /^(hi|hello|dear|good\s(morning|afternoon|evening)|greetings|salutations)/i;
    // Try to detect a closing line (ends with regards, sincerely, warm, thank, best)
    const closingRegex = /(regards|sincerely|warmly|warm regards|thank you|best wishes|respectfully|yours truly)/i;

    let greeting: string | null = null;
    let closing: string | null = null;
    let bodyLines: string[] = [...lines];

    if (lines.length > 0 && greetingRegex.test(lines[0])) {
        greeting = lines[0];
        bodyLines = bodyLines.slice(1);
    }
    if (bodyLines.length > 0 && closingRegex.test(bodyLines[bodyLines.length - 1])) {
        closing = bodyLines[bodyLines.length - 1];
        bodyLines = bodyLines.slice(0, -1);
    }

    // If body is empty but there were no greeting/closing detected, use full message
    const body = bodyLines.join('\n').trim() || message.trim();

    return { greeting, subject: title, body, closing };
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [expandedId, setExpandedId] = useState<number | null>(null);

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
            if (expandedId === notificationId) {
                setExpandedId(null);
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const handleToggleExpand = (notification: Notification) => {
        if (expandedId === notification.uid) {
            setExpandedId(null);
        } else {
            setExpandedId(notification.uid);
            if (!notification.isRead) {
                handleMarkAsRead(notification.uid);
            }
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
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatFullDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-PH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <ProfilePageLayout
            title="Notifications"
            rightAction={
                unreadCount > 0 ? (
                    <Pressable onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </Pressable>
                ) : null
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primaryLight]} />
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
                            const isExpanded = expandedId === notification.uid;
                            const parsed = isExpanded ? parseFormalMessage(notification.title, notification.message) : null;

                            return (
                                <Pressable
                                    key={notification.uid}
                                    style={[
                                        styles.notificationCard,
                                        !notification.isRead && styles.unreadCard,
                                        isExpanded && styles.expandedCard
                                    ]}
                                    onPress={() => handleToggleExpand(notification)}
                                >
                                    <View style={styles.cardHeader}>
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
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(notification.uid);
                                                    }}
                                                    hitSlop={10}
                                                >
                                                    <Trash2 size={16} color={theme.colors.error} />
                                                </Pressable>
                                            </View>
                                            
                                            {!isExpanded && (
                                                <Text style={styles.message} numberOfLines={2}>
                                                    {notification.message}
                                                </Text>
                                            )}

                                            <View style={styles.footerRow}>
                                                <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
                                                <Text style={[styles.typeLabel, { color: typeStyle.text }]}>
                                                    {TYPE_LABELS[notification.type] || 'Notification'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {isExpanded && parsed && (
                                        <View style={styles.expandedContent}>
                                            <View style={styles.letterDivider} />
                                            <Text style={styles.letterDate}>
                                                {formatFullDate(notification.createdAt)}
                                            </Text>

                                            {parsed.greeting ? (
                                                <Text style={styles.letterGreeting}>{parsed.greeting}</Text>
                                            ) : (
                                                <Text style={styles.letterGreeting}>
                                                    {`Dear Valued Customer,`}
                                                </Text>
                                            )}

                                            <Text style={styles.letterBody}>{parsed.body}</Text>

                                            <Text style={styles.letterClosing}>
                                                {parsed.closing || 'Warm regards,'}
                                            </Text>
                                            <Text style={styles.letterSignature}>Knot & Bloom Team</Text>

                                            {user?.role === 'ADMIN' && notification.title === 'New Seller Application' && (
                                                <Pressable
                                                    style={styles.adminCtaBtn}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        router.push('/admin/sellers' as RelativePathString);
                                                    }}
                                                >
                                                    <Text style={styles.adminCtaText}>Review Application</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                    )}
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
        </ProfilePageLayout>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markAllButton: {
        padding: 8,
    },
    markAllText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
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
        color: theme.colors.text,
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'Quicksand',
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    list: {
        gap: 12,
    },
    notificationCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primaryLight,
    },
    expandedCard: {
        backgroundColor: 'white',
        borderColor: theme.colors.primaryLight,
    },
    cardHeader: {
        flexDirection: 'row',
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
        color: theme.colors.text,
        flex: 1,
        marginRight: 8,
        fontFamily: 'Quicksand',
    },
    unreadTitle: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    message: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    time: {
        fontSize: 11,
        color: theme.colors.textLight,
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 4,
        marginTop: -4,
        marginRight: -4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primaryLight,
        position: 'absolute',
        top: 16,
        right: 16,
    },
    expandedContent: {
        marginTop: 16,
        paddingLeft: 56, // Align with text content (40 icon + 16 margin)
    },
    letterDivider: {
        height: 1,
        backgroundColor: theme.colors.subtle,
        marginBottom: 16,
    },
    letterDate: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    letterGreeting: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 22,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    letterBody: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        marginBottom: 16,
    },
    letterClosing: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 4,
    },
    letterSignature: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: 'Quicksand',
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
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    adminCtaBtn: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-end',
    },
    adminCtaText: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'Quicksand',
        fontSize: 14,
    }
});
