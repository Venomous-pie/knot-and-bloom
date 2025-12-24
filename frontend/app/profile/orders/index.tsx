import { orderAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import {
    ChevronRight,
    Package,
    ShoppingBag
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* Simple parsing helper for product JSON */
const getProductSummary = (jsonString: string) => {
    try {
        const items = JSON.parse(jsonString);
        if (Array.isArray(items) && items.length > 0) {
            const firstItem = items[0];
            const remainingCount = items.length - 1;
            const name = firstItem.name || 'Product';
            return remainingCount > 0 ? `${name} + ${remainingCount} more` : name;
        }
    } catch (e) {
        return 'Order Items';
    }
    return 'Order Items';
};

interface OrderSummary {
    uid: number;
    customerId: number;
    total: string;
    products: string; // JSON string
    uploaded: string;
    status: string;
}

type TabKey = 'all' | 'to_pay' | 'to_ship' | 'to_receive' | 'completed' | 'cancelled' | 'return_refund';

interface Tab {
    key: TabKey;
    label: string;
    statuses: string[];
}

const TABS: Tab[] = [
    { key: 'all', label: 'All', statuses: [] },
    { key: 'to_pay', label: 'To Pay', statuses: ['PENDING'] },
    { key: 'to_ship', label: 'To Ship', statuses: ['CONFIRMED', 'PROCESSING'] },
    { key: 'to_receive', label: 'To Receive', statuses: ['SHIPPED'] },
    { key: 'completed', label: 'Completed', statuses: ['DELIVERED'] },
    { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
    { key: 'return_refund', label: 'Return/Refund', statuses: ['REFUNDED'] },
];

export default function OrderHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('all');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchOrders();
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        try {
            const response = await orderAPI.getOrders();
            setOrders(response.data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            Alert.alert("Error", "Failed to load order history");
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const tab = TABS.find(t => t.key === activeTab);
        if (!tab || tab.statuses.length === 0) return true;
        return tab.statuses.includes(order.status);
    });

    const getTabCount = (tabKey: TabKey): number => {
        const tab = TABS.find(t => t.key === tabKey);
        if (!tab || tab.statuses.length === 0) return orders.length;
        return orders.filter(order => tab.statuses.includes(order.status)).length;
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#FFA500';
            case 'CONFIRMED': return '#2196F3';
            case 'PROCESSING': return '#2196F3';
            case 'SHIPPED': return '#9C27B0';
            case 'DELIVERED': return '#4CAF50';
            case 'CANCELLED': return '#F44336';
            case 'REFUNDED': return '#FF5722';
            default: return '#888';
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#FFF3E0';
            case 'CONFIRMED': return '#E3F2FD';
            case 'PROCESSING': return '#E3F2FD';
            case 'SHIPPED': return '#F3E5F5';
            case 'DELIVERED': return '#E8F5E9';
            case 'CANCELLED': return '#FFEBEE';
            case 'REFUNDED': return '#FBE9E7';
            default: return '#F5F5F5';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'To Pay';
            case 'CONFIRMED': return 'Confirmed';
            case 'PROCESSING': return 'Processing';
            case 'SHIPPED': return 'Shipped';
            case 'DELIVERED': return 'Delivered';
            case 'CANCELLED': return 'Cancelled';
            case 'REFUNDED': return 'Refunded';
            default: return status;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>My Orders</Text>
                <View style={{ width: 40 }} />{/* Spacer for center alignment */}
            </View>

            {/* Status Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={[styles.tabsContent, { flexGrow: 1, justifyContent: 'center' }]}
            >
                {TABS.map((tab) => {
                    const count = getTabCount(tab.key);
                    const isActive = activeTab === tab.key;
                    return (
                        <Pressable
                            key={tab.key}
                            style={[styles.tab, isActive && styles.tabActive]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {filteredOrders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Package size={64} color="#ddd" />
                        <Text style={styles.emptyStateText}>No orders found.</Text>
                        {activeTab !== 'all' && (
                            <Pressable onPress={() => setActiveTab('all')}>
                                <Text style={styles.viewAllLink}>View all orders</Text>
                            </Pressable>
                        )}
                        {activeTab === 'all' && (
                            <Pressable
                                style={styles.shopButton}
                                onPress={() => router.push('/' as RelativePathString)}
                            >
                                <Text style={styles.shopButtonText}>Start Shopping</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <View style={styles.list}>
                        {filteredOrders.map((order) => (
                            <Pressable
                                key={order.uid}
                                style={styles.orderCard}
                                onPress={() => router.push(`/profile/orders/${order.uid}` as RelativePathString)}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.orderIdRow}>
                                        <Text style={styles.orderId}>Order #{order.uid}</Text>
                                        <Text style={styles.orderDate}>
                                            {new Date(order.uploaded).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                            {getStatusLabel(order.status)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.productRow}>
                                    <View style={styles.iconBox}>
                                        <ShoppingBag size={20} color="#B36979" />
                                    </View>
                                    <Text style={styles.productText} numberOfLines={1}>
                                        {getProductSummary(order.products)}
                                    </Text>
                                    <ChevronRight size={20} color="#ccc" />
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.footer}>
                                    <Text style={styles.totalLabel}>Total Order:</Text>
                                    <Text style={styles.totalPrice}>
                                        ₱{Number(order.total || 0).toFixed(2)}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
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
    tabsContainer: {
        maxHeight: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#C88EA7',
    },
    tabText: {
        fontSize: 14,
        color: '#666',
    },
    tabTextActive: {
        color: '#C88EA7',
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
    tabBadge: {
        backgroundColor: '#eee',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    tabBadgeActive: {
        backgroundColor: '#C88EA7',
    },
    tabBadgeText: {
        fontSize: 10,
        color: '#666',
        fontWeight: '600',
    },
    tabBadgeTextActive: {
        color: 'white',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#888',
        marginTop: 16,
        marginBottom: 24,
        fontFamily: 'Quicksand',
    },
    viewAllLink: {
        color: '#C88EA7',
        fontSize: 14,
        fontWeight: '600',
    },
    shopButton: {
        backgroundColor: '#C88EA7',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    shopButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        gap: 16,
    },
    orderCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderIdRow: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
        fontFamily: 'Quicksand',
    },
    orderDate: {
        fontSize: 14,
        color: '#888',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 12,
    },
    orderDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#B36979',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#FFF0F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    productText: {
        fontSize: 15,
        color: '#444',
        flex: 1,
        fontFamily: 'Quicksand',
        marginRight: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
        fontFamily: 'Quicksand',
    },
});
