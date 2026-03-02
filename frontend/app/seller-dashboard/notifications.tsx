import { useAuth } from '@/app/auth';
import Navbar from '@/shared/Navbar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { Bell, Box, Info, ShoppingBag } from 'lucide-react-native';
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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';

interface Notification {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: string; // 'ORDER', 'SYSTEM', 'STOCK', etc.
    isRead: boolean;
    createdAt: string;
    data?: any;
}

export default function SellerNotifications() {
    const router = useRouter();
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    useEffect(() => {
        fetchNotifications();
    }, [token, filter]);

    const fetchNotifications = async () => {
        try {
            const query = filter === 'UNREAD' ? '?unreadOnly=true' : '';
            const res = await fetch(`${API_URL}/api/notifications${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                // Handle pagination struct if necessary, but assuming array or { items }
                // Controller returns result directly? Let's assume result is { notifications: [], total: ... } or just []
                // Based on standard controllers it's often paginated { rows, count }
                // I'll handle both just incase or inspect controller. 
                // Defaulting to array check
                if (Array.isArray(data)) {
                    setNotifications(data);
                } else if (data.notifications) {
                    setNotifications(data.notifications);
                } else if (data.rows) {
                    setNotifications(data.rows);
                } else {
                    setNotifications([]);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await fetch(`${API_URL}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark read");
        }
    };

    const markAllRead = async () => {
        try {
            await fetch(`${API_URL}/api/notifications/read-all`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            Alert.alert("Success", "All notifications marked as read.");
        } catch (error) {
            Alert.alert("Error", "Failed to update notifications");
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

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.card, !item.isRead && styles.unreadCard]}
            onPress={() => !item.isRead && markAsRead(item.id)}
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
            <Navbar />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Notifications</Text>
                </View>
                <TouchableOpacity onPress={markAllRead}>
                    <Text style={styles.linkText}>Mark all read</Text>
                </TouchableOpacity>
            </View>

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
                    <ActivityIndicator size="large" color="#B36979" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Bell size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No notifications here.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Quicksand' },
    linkText: { color: '#B36979', fontWeight: '600', fontSize: 14 },

    tabs: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'white' },
    tabActive: { backgroundColor: '#B36979', borderColor: '#B36979' },
    tabText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: 'white' },

    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    unreadCard: {
        borderColor: '#B36979',
        backgroundColor: '#FFF1F2'
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    content: { flex: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Quicksand' },
    cardBody: { fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand' },
    date: { fontSize: 11, color: '#9CA3AF' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B36979', marginLeft: 8 },

    emptyContainer: { alignItems: 'center', marginTop: 100, gap: 12 },
    emptyText: { color: '#9CA3AF', fontSize: 16, fontFamily: 'Quicksand' },
});
