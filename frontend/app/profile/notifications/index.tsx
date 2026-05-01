import { notificationAPI, Notification } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

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
            if (selectedNotification?.uid === notificationId) {
                setSelectedNotification(null);
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const handleOpenNotification = (notification: Notification) => {
        setSelectedNotification(notification);
        if (!notification.isRead) {
            handleMarkAsRead(notification.uid);
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

    const parsed = selectedNotification
        ? parseFormalMessage(selectedNotification.title, selectedNotification.message)
        : null;

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
                            return (
                                <Pressable
                                    key={notification.uid}
                                    style={[
                                        styles.notificationCard,
                                        !notification.isRead && styles.unreadCard,
                                    ]}
                                    onPress={() => handleOpenNotification(notification)}
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
                                            <Text style={[styles.typeLabel, { color: typeStyle.text }]}>
                                                {TYPE_LABELS[notification.type] || 'Notification'}
                                            </Text>
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

            {/* Formal Notification Detail Modal */}
            <Modal
                visible={!!selectedNotification}
                animationType="slide"
                transparent
                onRequestClose={() => setSelectedNotification(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedNotification(null)}>
                    <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                        {selectedNotification && parsed && (() => {
                            const typeStyle = TYPE_COLORS[selectedNotification.type] || TYPE_COLORS.system;
                            return (
                                <>
                                    {/* Modal Header */}
                                    <View style={styles.modalHeader}>
                                        <View style={[styles.modalTypeTag, { backgroundColor: typeStyle.bg }]}>
                                            {TYPE_ICONS[selectedNotification.type] || <Bell size={14} color="#555" />}
                                            <Text style={[styles.modalTypeText, { color: typeStyle.text }]}>
                                                {TYPE_LABELS[selectedNotification.type] || 'Notification'}
                                            </Text>
                                        </View>
                                        <Pressable onPress={() => setSelectedNotification(null)} hitSlop={8}>
                                            <X size={22} color={theme.colors.textLight} />
                                        </Pressable>
                                    </View>

                                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                        {/* Letter-style container */}
                                        <View style={styles.letterContainer}>
                                            {/* Date stamp */}
                                            <Text style={styles.letterDate}>
                                                {formatFullDate(selectedNotification.createdAt)}
                                            </Text>

                                            <View style={styles.letterDivider} />

                                            {/* Title / Subject line */}
                                            <Text style={styles.letterSubjectLabel}>Subject</Text>
                                            <Text style={styles.letterSubject}>{parsed.subject}</Text>

                                            <View style={styles.letterDivider} />

                                            {/* Greeting */}
                                            {parsed.greeting ? (
                                                <Text style={styles.letterGreeting}>{parsed.greeting}</Text>
                                            ) : (
                                                <Text style={styles.letterGreeting}>
                                                    {`Dear Valued Customer,`}
                                                </Text>
                                            )}

                                            {/* Body */}
                                            <Text style={styles.letterBody}>{parsed.body}</Text>

                                            {/* Closing */}
                                            <Text style={styles.letterClosing}>
                                                {parsed.closing || 'Warm regards,'}
                                            </Text>
                                            <Text style={styles.letterSignature}>Knot & Bloom Team</Text>
                                        </View>
                                    </ScrollView>

                                    {/* Actions */}
                                    <View style={styles.modalActions}>
                                        <Pressable
                                            style={styles.modalDeleteButton}
                                            onPress={() => handleDelete(selectedNotification.uid)}
                                        >
                                            <Trash2 size={16} color={theme.colors.error} />
                                            <Text style={styles.modalDeleteText}>Delete</Text>
                                        </Pressable>
                                        <Pressable
                                            style={styles.modalCloseButton}
                                            onPress={() => setSelectedNotification(null)}
                                        >
                                            <Text style={styles.modalCloseText}>Close</Text>
                                        </Pressable>
                                    </View>
                                </>
                            );
                        })()}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

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
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    markAllButton: {
        padding: 8,
    },
    markAllText: {
        color: theme.colors.primary,
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
        borderLeftColor: theme.colors.primaryLight,
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

    // ─── Modal styles ───────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        ...Platform.select({
            web: { boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' } as any,
            default: { elevation: 20 }
        })
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    modalTypeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    modalTypeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalBody: {
        maxHeight: '70%',
    },
    letterContainer: {
        padding: 24,
    },
    letterDate: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'right',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    letterDivider: {
        height: 1,
        backgroundColor: theme.colors.subtle,
        marginVertical: 14,
    },
    letterSubjectLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    letterSubject: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        lineHeight: 28,
    },
    letterGreeting: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 24,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    letterBody: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        marginBottom: 20,
    },
    letterClosing: {
        fontSize: 15,
        color: theme.colors.text,
        marginBottom: 4,
    },
    letterSignature: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: 'Quicksand',
        marginBottom: 8,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.subtle,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    },
    modalDeleteButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.errorLight || '#FFCDD2',
        backgroundColor: '#FFF5F5',
    },
    modalDeleteText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.error,
    },
    modalCloseButton: {
        flex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
    },
    modalCloseText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
});
