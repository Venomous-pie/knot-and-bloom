import { orderAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderDetail {
    uid: number;
    customerId: number;
    total: string;
    products: string; // JSON string: { product: Product, quantity: number, variant?: string }[]
    uploaded: string;
    discount?: string;
    status: string;
    trackingNumber?: string | null;
    courierName?: string | null;
    shippedAt?: string | null;
    estimatedCompletionDate?: string | null;
    estimatedDeliveryDate?: string | null;
    rejectionReason?: string | null;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    timeline: {
        uid: number;
        status: string;
        title: string;
        message: string | null;
        createdAt: string;
    }[];
}

interface OrderItemSnapshot {
    product: {
        uid: number;
        name: string;
        image: string | null;
        // Legacy support
        basePrice?: string | number;
        discountedPrice?: string | number;
    };
    quantity: number;
    unitPrice?: number; // Snapshot price
    finalPrice?: number; // Snapshot final price
    discountPercentage?: number;
    variant?: string | { uid: number; name: string } | null;
}

export default function OrderDetailsPage() {
    const { id } = useLocalSearchParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItemSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user && id) {
            fetchOrder();
        }
    }, [user, id, authLoading]);

    const fetchOrder = async () => {
        try {
            const response = await orderAPI.getOrderById(id as string);
            const orderData = response.data;
            setOrder(orderData);

            // Parse products JSON
            try {
                const parsedProducts = JSON.parse(orderData.products);
                setOrderItems(Array.isArray(parsedProducts) ? parsedProducts : []);
            } catch (e) {
                console.error("Failed to parse order items", e);
                setOrderItems([]);
            }

        } catch (error) {
            console.error("Failed to fetch order details", error);
            Alert.alert("Error", "Failed to load order details");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    if (!order) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#F59E0B'; // Amber - Pending Seller Action
            case 'CONFIRMED': return '#0EA5E9'; // Sky Blue - Accepted
            case 'IN_PRODUCTION': return '#8B5CF6'; // Purple - Making it
            case 'READY_TO_SHIP': return '#EC4899'; // Pink - Packed
            case 'SHIPPED': return '#10B981'; // Emerald - On the way
            case 'DELIVERED': return '#059669'; // Green - Arrived
            case 'COMPLETED': return '#059669'; // Green - Verified
            case 'CANCELLED': return '#EF4444'; // Red
            case 'DISPUTED': return '#DC2626'; // Red
            default: return '#6B7280';
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#FEF3C7';
            case 'CONFIRMED': return '#E0F2FE';
            case 'IN_PRODUCTION': return '#F3E8FF';
            case 'READY_TO_SHIP': return '#FCE7F3';
            case 'SHIPPED': return '#D1FAE5';
            case 'DELIVERED': return '#D1FAE5';
            case 'COMPLETED': return '#D1FAE5';
            case 'CANCELLED': return '#FEE2E2';
            case 'DISPUTED': return '#FEE2E2';
            default: return '#F3F4F6';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back to Orders</Text>
                    </Pressable>
                </View>

                <View style={styles.titleSection}>
                    <Text style={styles.title}>Order #{order.uid}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                            {order.status.replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>
                <Text style={styles.date}>Placed on {new Date(order.uploaded).toLocaleDateString()} at {new Date(order.uploaded).toLocaleTimeString()}</Text>

                {/* Latest Status/Timeline Card */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Status</Text>

                    {/* Key Info Banner */}
                    {order.status === 'CONFIRMED' && order.estimatedCompletionDate && (
                        <View style={[styles.infoBanner, { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }]}>
                            <Text style={[styles.infoBannerText, { color: '#0369A1' }]}>
                                🗓️ Estimated Completion: {new Date(order.estimatedCompletionDate).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                    {order.status === 'CANCELLED' && order.rejectionReason && (
                        <View style={[styles.infoBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                            <Text style={[styles.infoBannerTitle, { color: '#B91C1C' }]}>Cancellation Reason:</Text>
                            <Text style={{ color: '#7F1D1D' }}>{order.rejectionReason}</Text>
                        </View>
                    )}

                    {/* Timeline */}
                    <View style={styles.timelineContainer}>
                        {order.timeline && order.timeline.length > 0 ? (
                            order.timeline.map((event, index) => (
                                <View key={event.uid} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[styles.dot, index === 0 ? { backgroundColor: getStatusColor(event.status), width: 12, height: 12 } : {}]} />
                                        {index !== order.timeline.length - 1 && <View style={styles.line} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={[styles.timelineTitle, index === 0 && { color: '#111', fontWeight: 'bold' }]}>{event.title}</Text>
                                        {event.message && <Text style={styles.timelineMessage}>{event.message}</Text>}
                                        <Text style={styles.timelineDate}>{new Date(event.createdAt).toLocaleDateString()} • {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: '#666', fontStyle: 'italic' }}>No timeline updates yet.</Text>
                        )}
                    </View>
                </View>

                {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Tracking Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Courier:</Text>
                            <Text style={styles.infoValue}>{order.courierName || 'Standard Shipping'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Tracking #:</Text>
                            <Text style={styles.infoValue}>{order.trackingNumber}</Text>
                        </View>
                        {order.status === 'SHIPPED' && (
                            <Text style={styles.helpText}>You can use this tracking number on the courier's website to track your package.</Text>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.itemsList}>
                        {orderItems.map((item, index) => {
                            // Determine price: prefer snapshot finalPrice, then unitPrice, then product current price fallback
                            const price = item.finalPrice ?? item.unitPrice ?? item.product.discountedPrice ?? item.product.basePrice ?? 0;

                            return (
                                <View key={index} style={styles.itemCard}>
                                    {item.product.image && (
                                        <Image source={{ uri: item.product.image }} style={styles.itemImage} />
                                    )}
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{item.product.name}</Text>
                                        <View style={styles.itemMeta}>
                                            {item.variant && <Text style={styles.variantText}>Variant: {typeof item.variant === 'string' ? item.variant : (item.variant as any).name || 'Default'}</Text>}
                                            <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                                        </View>
                                        <Text style={styles.itemPrice}>
                                            ₱{parseFloat(String(price)).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Order Summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>₱{parseFloat(order.total).toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Shipping</Text>
                        <Text style={styles.summaryValue}>Free</Text>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' }]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₱{parseFloat(order.total).toFixed(2)}</Text>
                    </View>

                    {/* Payment Status Info */}
                    <View style={{ marginTop: 12, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8 }}>
                        <View style={[styles.summaryRow, { marginBottom: 4 }]}>
                            <Text style={styles.summaryLabel}>Payment Method:</Text>
                            <Text style={[styles.summaryValue, { fontWeight: '600' }]}>{order.paymentMethod || 'N/A'}</Text>
                        </View>
                        <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                            <Text style={styles.summaryLabel}>Status:</Text>
                            <Text style={[styles.summaryValue, { color: order.paymentStatus === 'PARTIALLY_PAID' ? '#F59E0B' : '#059669' }]}>
                                {order.paymentStatus?.replace(/_/g, ' ') || 'PENDING'}
                            </Text>
                        </View>
                    </View>

                    {/* Split Breakdown for COD */}
                    {order.paymentStatus === 'PARTIALLY_PAID' && (
                        <View style={{ marginTop: 8, padding: 12, backgroundColor: '#F0F9FF', borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD' }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0369A1', marginBottom: 8 }}>Payment Plan (COD 20% Deposit)</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Deposited (20%):</Text>
                                <Text style={[styles.summaryValue, { color: '#059669' }]}>₱{(parseFloat(order.total) * 0.20).toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Due on Delivery (80%):</Text>
                                <Text style={[styles.summaryValue, { color: '#B91C1C', fontWeight: 'bold' }]}>₱{(parseFloat(order.total) * 0.80).toFixed(2)}</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shipping Details</Text>
                    <Text style={styles.addressText}>{user?.name}</Text>
                    <Text style={styles.addressText}>{user?.address || 'No address provided'}</Text>
                    <Text style={styles.addressText}>{user?.phone}</Text>
                    <Text style={styles.addressText}>{user?.email}</Text>
                </View>

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
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        marginBottom: 10,
    },
    backButton: {
        paddingVertical: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    date: {
        fontSize: 14,
        color: '#888',
        marginBottom: 30,
    },
    statusBadge: {
        backgroundColor: '#E6F0E6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#4A7A4A',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    itemsList: {
        gap: 16,
    },
    itemCard: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 4,
    },
    variantText: {
        fontSize: 12,
        color: '#888',
    },
    quantityText: {
        fontSize: 12,
        color: '#888',
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B36979',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#B36979',
    },
    addressText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoLabel: {
        fontWeight: '600',
        width: 100,
        color: '#444',
    },
    infoValue: {
        flex: 1,
        color: '#333',
        fontWeight: '500',
    },
    helpText: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // Timeline Styles
    timelineContainer: { marginTop: 8 },
    timelineItem: { flexDirection: 'row', marginBottom: 20 },
    timelineLeft: { alignItems: 'center', marginRight: 16, width: 20 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ccc', marginTop: 6 },
    line: { width: 2, flex: 1, backgroundColor: '#eee', marginTop: 4 },
    timelineContent: { flex: 1 },
    timelineTitle: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 2 },
    timelineMessage: { fontSize: 14, color: '#666', marginBottom: 4 },
    timelineDate: { fontSize: 12, color: '#999' },

    infoBanner: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
    infoBannerText: { fontWeight: '600', fontSize: 14 },
    infoBannerTitle: { fontWeight: 'bold', marginBottom: 4 }
});
