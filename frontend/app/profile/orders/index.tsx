import { orderAPI, cartAPI } from '@/services/api';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/ui/StatusBadge';
import * as Clipboard from 'expo-clipboard';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
    View,
    Animated,
    Easing
} from 'react-native';
import {
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Package,
    RefreshCw,
    RotateCcw,
    LoaderCircle,
    ShoppingBag,
    Truck
} from 'lucide-react-native';
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout';
import { theme } from '@/constants/theme';

/* Product item from JSON */
interface ProductItem {
    name: string;
    quantity: number;
    price: number;
    image?: string;
    variant?: string;
}

const parseProducts = (data: any): ProductItem[] => {
    try {
        const items = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(items)) {
            return items.map(item => {
                // Handle nested product object (item.product.name) or direct fields (item.name)
                const productData = item.product || item;
                return {
                    name: productData.name || 'Product',
                    quantity: item.quantity || 1,
                    price: item.unitPrice || item.finalPrice || item.price || productData.discountedPrice || productData.basePrice || 0,
                    image: productData.image || item.image || null,
                    variant: item.variant || null
                };
            });
        }
    } catch (e) {
        console.error('Failed to parse products JSON', e);
    }
    return [];
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
    paymentStatus?: string;
    paymentMethod?: string;
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
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
    const [buyAgainLoading, setBuyAgainLoading] = useState<number | null>(null);
    const { refreshCart } = useCart();

    // Animation Ref
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (refreshing) {
            Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            spinValue.setValue(0);
        }
    }, [refreshing]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    };

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
            // The backend returns { orders: [...], total: ... }
            setOrders(response.data.orders || response.data);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            Alert.alert("Error", "Failed to load order history");
        } finally {
            setLoading(false);
        }
    };

    const shouldShowInTab = (order: OrderSummary, tabKey: TabKey): boolean => {
        if (tabKey === 'all') return true;

        if (tabKey === 'to_pay') {
            // Include PENDING or Confirmed Partial Payments (COD)
            return order.status === 'PENDING' ||
                (order.status === 'CONFIRMED' && order.paymentStatus === 'PARTIALLY_PAID');
        }

        if (tabKey === 'to_ship') {
            // Standard To Ship statuses
            if (!['CONFIRMED', 'PROCESSING', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(order.status)) {
                return false;
            }
            // Exclude Confirmed Partial Payments (they go to To Pay)
            if (order.status === 'CONFIRMED' && order.paymentStatus === 'PARTIALLY_PAID') {
                return false;
            }
            return true;
        }

        // For other tabs, use the standard status list
        const tab = TABS.find(t => t.key === tabKey);
        return tab ? tab.statuses.includes(order.status) : false;
    };

    const filteredOrders = orders.filter(order => shouldShowInTab(order, activeTab));

    const getTabCount = (tabKey: TabKey): number => {
        return orders.filter(order => shouldShowInTab(order, tabKey)).length;
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            </View>
        );
    }

    // Status color/label functions imported from @/utils/orderStatus


    const copyToClipboard = async (text: string) => {
        let success = false;
        try {
            success = await Clipboard.setStringAsync(text);
        } catch (error) {
            console.warn('Clipboard.setStringAsync failed, trying fallback:', error);
        }

        if (success) {
            setCopiedTracking(text);
            setTimeout(() => setCopiedTracking(null), 2000);
        } else {
            // Fallback for web if standard API fails or returns false
            if (Platform.OS === 'web') {
                try {
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    // Ensure it's not visible but part of DOM
                    textArea.style.position = "fixed";
                    textArea.style.left = "-9999px";
                    textArea.style.top = "0";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();

                    const fallbackSuccess = document.execCommand('copy');
                    document.body.removeChild(textArea);

                    if (fallbackSuccess) {
                        setCopiedTracking(text);
                        setTimeout(() => setCopiedTracking(null), 2000);
                        return;
                    }
                } catch (err) {
                    console.error('Fallback copy failed', err);
                }
            }

            // If all else fails
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
                handleBuyAgain(order);
                break;
        }
    };

    const handleBuyAgain = async (order: OrderSummary) => {
        if (!user) return;

        setBuyAgainLoading(order.uid);
        try {
            const products = parseProducts(order.products);

            // Add each product to cart
            for (const item of products) {
                // The products field could be a JSON string or already parsed object
                const productData = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
                const matchingItem = productData.find((p: any) =>
                    (p.product?.name || p.name) === item.name
                );

                if (matchingItem) {
                    const productId = matchingItem.product?.uid || matchingItem.productId;
                    const variant = matchingItem.variant?.name || matchingItem.variant || null;

                    if (productId) {
                        await cartAPI.addToCart(user.uid, productId, item.quantity, variant);
                    }
                }
            }

            // Refresh cart count and navigate
            await refreshCart();
            router.push('/cart' as RelativePathString);
        } catch (error) {
            console.error('Failed to add items to cart:', error);
            Alert.alert('Error', 'Failed to add items to cart. Some products may no longer be available.');
        } finally {
            setBuyAgainLoading(null);
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
                            <Truck size={14} color={theme.colors.text} />
                            <Text style={styles.trackActionText}>Track</Text>
                            <ExternalLink size={12} color={theme.colors.text} />
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
                const isLoading = buyAgainLoading === order.uid;
                return (
                    <Pressable
                        style={[styles.actionButton, styles.outlineAction, isLoading && { opacity: 0.6 }]}
                        onPress={() => handleQuickAction(order, 'buyAgain')}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        ) : (
                            <>
                                <RefreshCw size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.outlineActionText}>Buy Again</Text>
                            </>
                        )}
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
                                <Package size={16} color={theme.colors.primaryLight} />
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
        <ProfilePageLayout
            title="My Orders"
            scrollable={false}
            contentStyle={{ padding: 0 }}
            rightAction={
                <Pressable
                    onPress={() => {
                        setLoading(true);
                        fetchOrders();
                    }}
                    style={{ width: 40, alignItems: 'flex-end', justifyContent: 'center' }}
                >
                    <RotateCcw size={20} color={theme.colors.text} />
                </Pressable>
            }
        >
            {/* Status Filter Tabs */}
            <View style={styles.tabsWrapper}>
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
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {filteredOrders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Package size={64} color={theme.colors.border} />
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'all'
                                ? "No orders found."
                                : `No orders in ${TABS.find(t => t.key === activeTab)?.label || 'this category'}`}
                        </Text>
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
                                        <View style={styles.statusRow}>
                                            {order.paymentMethod && order.paymentMethod.toUpperCase() !== 'COD' && (
                                                <View style={styles.paidBadge}>
                                                    <Text style={styles.paidBadgeText}>PAID</Text>
                                                </View>
                                            )}
                                            <StatusBadge status={order.status} style={{ marginLeft: 8 }} />
                                        </View>
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Product Row with Thumbnails */}
                                    <View style={styles.productRow}>
                                        {renderProductThumbnails(products)}
                                        <View style={styles.productInfo}>
                                            <Text style={styles.productText} numberOfLines={2}>
                                                {products.length > 0 ? (
                                                    <>
                                                        {products[0].name}
                                                        {products[0].quantity > 1 && (
                                                            <Text style={{ color: theme.colors.textLight }}> × {products[0].quantity}</Text>
                                                        )}
                                                        {products.length > 1 && ` + ${products.length - 1} more`}
                                                    </>
                                                ) : (
                                                    'Order Items'
                                                )}
                                            </Text>
                                            <Text style={styles.itemCount}>
                                                {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                            </Text>
                                        </View>
                                        <ChevronRight size={20} color={theme.colors.border} />
                                    </View>

                                    {order.status === 'SHIPPED' && order.trackingNumber && (
                                        <View style={styles.trackingRow}>
                                            <Truck size={14} color={theme.colors.primary} />
                                            <Text style={styles.trackingText}>
                                                {order.courierName || 'Courier'}: {order.trackingNumber}
                                            </Text>
                                            <Pressable
                                                onPress={() => copyToClipboard(order.trackingNumber!)}
                                                style={{ position: 'relative' }}
                                                hitSlop={8}
                                            >
                                                <Copy size={14} color={theme.colors.primary} />
                                                {copiedTracking === order.trackingNumber && (
                                                    <View style={styles.tooltip}>
                                                        <Text style={styles.tooltipText}>Copied!</Text>
                                                    </View>
                                                )}
                                            </Pressable>
                                        </View>
                                    )}

                                    {/* Estimated Date (for processing orders) */}
                                    {(order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'IN_PRODUCTION') && order.estimatedCompletionDate && (
                                        <View style={styles.estimateRow}>
                                            <Clock size={14} color={theme.colors.textSecondary} />
                                            <Text style={styles.estimateText}>
                                                Est. Ready: {new Date(order.estimatedCompletionDate).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.divider} />

                                    {/* Footer with Total and Actions */}
                                    <View style={styles.footer}>
                                        <View style={styles.totalSection}>
                                            <Text style={styles.totalLabel}>
                                                {order.paymentStatus === 'PARTIALLY_PAID' ? 'Balance:' : 'Total:'}
                                            </Text>
                                            <Text style={styles.totalPrice}>
                                                ₱{(Number(order.total || 0) * (order.paymentStatus === 'PARTIALLY_PAID' ? 0.8 : 1)).toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={styles.footerRight}>
                                            {renderQuickActions(order)}
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </ProfilePageLayout>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsWrapper: {
        width: '100%',
        maxWidth: 800,
        alignSelf: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tabsContainer: {
        maxHeight: 50,
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
        borderBottomColor: theme.colors.primaryLight,
    },
    tabText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    tabBadge: {
        backgroundColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    tabBadgeActive: {
        backgroundColor: theme.colors.primaryLight,
    },
    tabBadgeText: {
        fontSize: 10,
        color: theme.colors.textSecondary,
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
        minHeight: 600,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
    },
    emptyTitle: {
        marginVertical: 16,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    viewAllLink: {
        color: theme.colors.primaryLight,
        fontSize: 14,
        fontWeight: '600',
    },
    shopButton: {
        backgroundColor: theme.colors.primaryLight,
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
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: theme.colors.shadow,
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
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontFamily: theme.typography.fontFamily,
    },
    orderDate: {
        fontSize: 13,
        color: theme.colors.textLight,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
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
        backgroundColor: theme.colors.backgroundAlt,
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
        backgroundColor: theme.colors.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    productInfo: {
        flex: 1,
        marginRight: 8,
    },
    productText: {
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
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
        color: theme.colors.text,
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
        color: theme.colors.textSecondary,
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
        color: theme.colors.textSecondary,
        marginRight: 8,
        fontFamily: theme.typography.fontFamily,
    },
    totalPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paidBadge: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    paidBadgeText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontFamily: theme.typography.fontFamily,
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
        backgroundColor: theme.colors.text,
    },
    payActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    trackAction: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.text,
    },
    trackActionText: {
        color: theme.colors.text,
        fontSize: 13,
        fontWeight: '600',
    },
    confirmAction: {
        backgroundColor: theme.colors.text,
    },
    confirmActionText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    outlineAction: {
        backgroundColor: theme.colors.backgroundAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    outlineActionText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    tooltip: {
        position: 'absolute',
        bottom: 25,
        right: -10,
        backgroundColor: theme.colors.text,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        zIndex: 10,
    },
    tooltipText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
});
