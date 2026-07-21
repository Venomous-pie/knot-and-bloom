import { notificationAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';
import { Bell, Box, Info, ShoppingBag, ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

interface SellerNotification {
    uid: number;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export default function SellerNotifications() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<SellerNotification[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    useEffect(() => {
        fetchNotifications();
    }, [filter]);

    const fetchNotifications = async () => {
        try {
            const res = await notificationAPI.getNotifications(
                filter === 'UNREAD' ? { unreadOnly: true } : {}
            );
            setNotifications(res.data.notifications as SellerNotification[]);
        } catch (error) {
            console.error('Failed to fetch seller notifications', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (uid: number) => {
        try {
            await notificationAPI.markAsRead(uid);
            setNotifications(prev => prev.map(n => n.uid === uid ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationAPI.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            Alert.alert('Error', 'Failed to update notifications');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'ORDER_CREATED':
            case 'ORDER_PAID':
                return <ShoppingBag size={20} color="#10B981" />;
            case 'LOW_STOCK':
            case 'OUT_OF_STOCK':
                return <Box size={20} color="#F59E0B" />;
            case 'SYSTEM':
            default:
                return <Info size={20} color="#3B82F6" />;
        }
    };

    const renderItem = ({ item }: { item: SellerNotification }) => (
        <TouchableOpacity
            style={[styles.card, !item.isRead && styles.unreadCard]}
            onPress={() => !item.isRead && markAsRead(item.uid)}
            activeOpacity={0.7}
        >
            <View style={styles.iconBox}>
                {getIcon(item.type)}
            </View>
            <View style={styles.content}>
                <View style={styles.row}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.cardBody} numberOfLines={2}>{item.message}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Notifications</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Stay updated on recent shop activities and alerts.</Text>
                    </View>
                    <TouchableOpacity onPress={markAllRead}>
                        <Text style={styles.linkText}>Mark all read</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, filter === 'ALL' && styles.tabActive]}
                    onPress={() => setFilter('ALL')}
                >
                    <Text style={[styles.tabText, filter === 'ALL' && styles.tabTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, filter === 'UNREAD' && styles.tabActive]}
                    onPress={() => setFilter('UNREAD')}
                >
                    <Text style={[styles.tabText, filter === 'UNREAD' && styles.tabTextActive]}>Unread</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={P} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={P} colors={[P]} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Bell size={48} color={SUB} />
                            <Text style={styles.emptyText}>No notifications here.</Text>
                        </View>
                    }
                />
            )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    linkText: { color: P, fontWeight: '600', fontFamily: 'Quicksand' },

    tabs: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
    tabActive: { backgroundColor: P, borderColor: P },
    tabText: { color: SUB, fontSize: 13, fontWeight: '600', fontFamily: 'Quicksand' },
    tabTextActive: { color: 'white' },

    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: CARD,
        borderRadius: 24,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: BORDER
    },
    unreadCard: {
        borderColor: P,
        backgroundColor: P_LIGHT
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: BG,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    content: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    cardBody: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    date: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P, marginLeft: 8 },

    emptyContainer: { alignItems: 'center', marginTop: 100, gap: 12 },
    emptyText: { color: SUB, fontSize: 16, fontFamily: 'Quicksand' },
});
