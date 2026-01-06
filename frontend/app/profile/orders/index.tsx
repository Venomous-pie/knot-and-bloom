import { orderAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import {
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Package,
    RefreshCw,
    ShoppingBag,
    Truck
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* Product item from JSON */
interface ProductItem {
    name: string;
    quantity: number;
    price: number;
    image?: string;
    variant?: string;
}

/* Parse products JSON and return structured data */
const parseProducts = (jsonString: string): ProductItem[] => {
    try {
        const items = JSON.parse(jsonString);
        if (Array.isArray(items)) {
            return items.map(item => ({
                name: item.name || 'Product',
                quantity: item.quantity || 1,
                price: item.price || 0,
                image: item.image || null,
                variant: item.variant || null
            }));
        }
    } catch (e) {
        console.error('Failed to parse products JSON', e);
    }
    return [];
};

/* Get product summary text with quantities */
const getProductSummaryText = (products: ProductItem[]): string => {
    if (products.length === 0) return 'Order Items';

    const firstItem = products[0];
    const firstItemText = `${firstItem.name}${firstItem.quantity > 1 ? ` × ${firstItem.quantity}` : ''}`;

    if (products.length === 1) return firstItemText;

    const remainingCount = products.length - 1;
    return `${firstItemText} + ${remainingCount} more`;
};

/* Get total item count */
const getTotalItemCount = (products: ProductItem[]): number => {
    return products.reduce((sum, item) => sum + item.quantity, 0);
};

interface OrderSummary {
    uid: number;
    customerId: number;
    total: string;
    products: string; // JSON string
    uploaded: string;
    status: string;
    referenceNumber?: string;
    trackingNumber?: string;
    courierName?: string;
    estimatedCompletionDate?: string;
    estimatedDeliveryDate?: string;
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
    { key: 'to_ship', label: 'To Ship', statuses: ['CONFIRMED', 'PROCESSING', 'IN_PRODUCTION', 'READY_TO_SHIP'] },
    { key: 'to_receive', label: 'To Receive', statuses: ['SHIPPED'] },
    { key: 'completed', label: 'Completed', statuses: ['DELIVERED', 'COMPLETED'] },
    { key: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
    { key: 'return_refund', label: 'Return/Refund', statuses: ['REFUNDED', 'DISPUTED'] },
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
            case 'IN_PRODUCTION': return '#9C27B0';
            case 'READY_TO_SHIP': return '#00BCD4';
            case 'SHIPPED': return '#9C27B0';
            case 'DELIVERED': return '#4CAF50';
            case 'COMPLETED': return '#2E7D32';
            case 'CANCELLED': return '#F44336';
            case 'REFUNDED': return '#FF5722';
            case 'DISPUTED': return '#FF9800';
            default: return '#888';
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#FFF3E0';
            case 'CONFIRMED': return '#E3F2FD';
            case 'PROCESSING': return '#E3F2FD';
            case 'IN_PRODUCTION': return '#F3E5F5';
            case 'READY_TO_SHIP': return '#E0F7FA';
            case 'SHIPPED': return '#F3E5F5';
            case 'DELIVERED': return '#E8F5E9';
            case 'COMPLETED': return '#E8F5E9';
            case 'CANCELLED': return '#FFEBEE';
            case 'REFUNDED': return '#FBE9E7';
            case 'DISPUTED': return '#FFF3E0';
            default: return '#F5F5F5';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'PENDING': return 'To Pay';
            case 'CONFIRMED': return 'Confirmed';
            case 'PROCESSING': return 'Processing';
            case 'IN_PRODUCTION': return 'In Production';
            case 'READY_TO_SHIP': return 'Ready to Ship';
            case 'SHIPPED': return 'Shipped';
            case 'DELIVERED': return 'Delivered';
            case 'COMPLETED': return 'Completed';
            case 'CANCELLED': return 'Cancelled';
            case 'REFUNDED': return 'Refunded';
            case 'DISPUTED': return 'Disputed';
            default: return status;
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (Platform.OS === 'web' && navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                Alert.alert('Copied', 'Tracking number copied to clipboard');
            } else {
                // Fallback for non-web platforms or if clipboard API not available
                Alert.alert('Tracking Number', text);
            }
        } catch (error) {
            console.error('Failed to copy:', error);
            Alert.alert('Tracking Number', text);
        }
    };

    /* Get tracking URL based on courier name */
    const getTrackingUrl = (courierName: string, trackingNumber: string): string | null => {
        const courier = courierName?.toLowerCase() || '';

        if (courier.includes('j&t') || courier.includes('jnt') || courier.includes('j and t')) {
            return `https://www.jtexpress.ph/trajectoryQuery?waybillNo=${trackingNumber}`;
        }
        if (courier.includes('flash')) {
            return `https://www.flashexpress.ph/fle/tracking?se=${trackingNumber}`;
        }
        if (courier.includes('ninja') || courier.includes('ninjavan')) {
            return `https://www.ninjavan.co/en-ph/tracking?id=${trackingNumber}`;
        }
        if (courier.includes('gogo') || courier.includes('gogoxpress')) {
            return `https://www.gogoxpress.com/track?tracking_no=${trackingNumber}`;
        }
        if (courier.includes('spx') || courier.includes('shopee')) {
            return `https://spx.ph/track?trackingNumber=${trackingNumber}`;
        }
        if (courier.includes('lex') || courier.includes('lazada')) {
            return `https://www.lazada.com.ph/order/tracking?tradeOrderId=${trackingNumber}`;
        }
        if (courier.includes('lbc')) {
            return `https://www.lbcexpress.com/tracking?tracking_no=${trackingNumber}`;
        }

        return null;
    };

    const handleQuickAction = (order: OrderSummary, action: string) => {
        switch (action) {
            case 'pay':
                router.push(`/profile/orders/${order.uid}` as RelativePathString);
                break;
            case 'track':
                if (order.trackingNumber && order.courierName) {
                    const trackingUrl = getTrackingUrl(order.courierName, order.trackingNumber);
                    if (trackingUrl) {
                        Linking.openURL(trackingUrl);
                    } else {
                        // Fallback to order detail if courier not recognized
                        router.push(`/profile/orders/${order.uid}` as RelativePathString);
                    }
                } else {
                    router.push(`/profile/orders/${order.uid}` as RelativePathString);
                }
                break;
            case 'confirm':
                router.push(`/profile/orders/${order.uid}` as RelativePathString);
                break;
            case 'buyAgain':
                router.push(`/profile/orders/${order.uid}` as RelativePathString);
                break;
        }
    };

    const renderQuickActions = (order: OrderSummary) => {
        switch (order.status) {
            case 'PENDING':
                return (
                    <Pressable
                        style={[styles.actionButton, styles.payAction]}
                        onPress={() => handleQuickAction(order, 'pay')}
                    >
                        <Text style={styles.payActionText}>Pay Now</Text>
                    </Pressable>
                );
            case 'SHIPPED':
                return (
                    <View style={styles.actionRow}>
                        <Pressable
                            style={[styles.actionButton, styles.trackAction]}
                            onPress={() => handleQuickAction(order, 'track')}
                        >
                            <Truck size={14} color="#333" />
                            <Text style={styles.trackActionText}>Track</Text>
                            <ExternalLink size={12} color="#333" />
                        </Pressable>
                    </View>
                );
            case 'DELIVERED':
                return (
                    <Pressable
                        style={[styles.actionButton, styles.confirmAction]}
                        onPress={() => handleQuickAction(order, 'confirm')}
                    >
                        <Text style={styles.confirmActionText}>Confirm Receipt</Text>
                    </Pressable>
                );
            case 'COMPLETED':
                return (
                    <Pressable
                        style={[styles.actionButton, styles.outlineAction]}
                        onPress={() => handleQuickAction(order, 'buyAgain')}
                    >
                        <RefreshCw size={14} color="#555" />
                        <Text style={styles.outlineActionText}>Buy Again</Text>
                    </Pressable>
                );
            default:
                return null;
        }
    };


    const renderProductThumbnails = (products: ProductItem[]) => {
        const displayProducts = products.slice(0, 3);
        const hasMore = products.length > 3;

        return (
            <View style={styles.thumbnailContainer}>
                {displayProducts.map((product, index) => (
                    <View
                        key={index}
                        style={[
                            styles.thumbnailWrapper,
                            { marginLeft: index > 0 ? -12 : 0, zIndex: 3 - index }
                        ]}
                    >
                        {product.image ? (
                            <Image source={{ uri: product.image }} style={styles.thumbnail} />
                        ) : (
                            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                                <Package size={16} color="#C88EA7" />
                            </View>
                        )}
                    </View>
                ))}
                {hasMore && (
                    <View style={[styles.thumbnailWrapper, styles.moreIndicator, { marginLeft: -12 }]}>
                        <Text style={styles.moreText}>+{products.length - 3}</Text>
                    </View>
                )}
            </View>
        );
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
                        <Text style={styles.emptyTitle}>No orders found.</Text>
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
                        {filteredOrders.map((order) => {
                            const products = parseProducts(order.products);
                            const totalItems = getTotalItemCount(products);
                            const productSummary = getProductSummaryText(products);

                            return (
                                <Pressable
                                    key={order.uid}
                                    style={styles.orderCard}
                                    onPress={() => router.push(`/profile/orders/${order.uid}` as RelativePathString)}
                                >
                                    {/* Header Row */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.orderIdRow}>
                                            <Text style={styles.orderId}>
                                                {order.referenceNumber || `Order #${order.uid}`}
                                            </Text>
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

                                    {/* Product Row with Thumbnails */}
                                    <View style={styles.productRow}>
                                        {renderProductThumbnails(products)}
                                        <View style={styles.productInfo}>
                                            <Text style={styles.productText} numberOfLines={2}>
                                                {productSummary}
                                            </Text>
                                            <Text style={styles.itemCount}>
                                                {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                            </Text>
                                        </View>
                                        <ChevronRight size={20} color="#ccc" />
                                    </View>

                                    {/* Tracking Info (for shipped orders) */}
                                    {order.status === 'SHIPPED' && order.trackingNumber && (
                                        <View style={styles.trackingRow}>
                                            <Truck size={14} color="#B36979" />
                                            <Text style={styles.trackingText}>
                                                {order.courierName || 'Courier'}: {order.trackingNumber}
                                            </Text>
                                            <Pressable onPress={() => copyToClipboard(order.trackingNumber!)}>
                                                <Copy size={14} color="#B36979" />
                                            </Pressable>
                                        </View>
                                    )}

                                    {/* Estimated Date (for processing orders) */}
                                    {(order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'IN_PRODUCTION') && order.estimatedCompletionDate && (
                                        <View style={styles.estimateRow}>
                                            <Clock size={14} color="#2196F3" />
                                            <Text style={styles.estimateText}>
                                                Est. Ready: {new Date(order.estimatedCompletionDate).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.divider} />

                                    {/* Footer with Total and Actions */}
                                    <View style={styles.footer}>
                                        <View style={styles.totalSection}>
                                            <Text style={styles.totalLabel}>Total:</Text>
                                            <Text style={styles.totalPrice}>
                                                ₱{Number(order.total || 0).toFixed(2)}
                                            </Text>
                                        </View>
                                        {renderQuickActions(order)}
                                    </View>
                                </Pressable>
                            );
                        })}
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
    emptyTitle: {
        marginVertical: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
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
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 4,
        fontFamily: 'Quicksand',
    },
    orderDate: {
        fontSize: 13,
        color: '#888',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 12,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    thumbnailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    thumbnailWrapper: {
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
    },
    placeholderThumbnail: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF0F5',
    },
    moreIndicator: {
        width: 44,
        height: 44,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productText: {
        fontSize: 14,
        color: '#444',
        fontFamily: 'Quicksand',
        fontWeight: '600',
        lineHeight: 20,
    },
    itemCount: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    trackingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    trackingText: {
        flex: 1,
        fontSize: 12,
        color: '#000000ff',
        fontWeight: '500',
    },
    estimateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
    },
    estimateText: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    totalSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
        fontFamily: 'Quicksand',
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
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    payAction: {
        backgroundColor: '#FF6B6B',
    },
    payActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    trackAction: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#333',
    },
    trackActionText: {
        color: '#333',
        fontSize: 13,
        fontWeight: '600',
    },
    confirmAction: {
        backgroundColor: '#43A047',
    },
    confirmActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    outlineAction: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    outlineActionText: {
        color: '#555',
        fontSize: 13,
        fontWeight: '600',
    },
});
