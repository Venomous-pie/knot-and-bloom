import { orderAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { getStatusColor, getStatusBgColor, getStatusLabel } from '@/utils/orderStatus';
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
    View,
    Modal,
    TextInput
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
    // New fields for Guarantee
    autoConfirmAt?: string | null;
    extensionCount?: number;
    reminderStage?: number;
    disputeStartedAt?: string | null;
    shippingMethod?: string | null;
    proofPhotos?: string | null; // JSON string
    shippingAddressSnapshot?: string | null; // JSON string
    referenceNumber?: string;
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

import { useSocketContext } from '@/contexts/SocketContext';

export default function OrderDetailsPage() {
    const { id } = useLocalSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { socket } = useSocketContext(); // Access socket from context
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItemSnapshot[]>([]);
    const [shippingAddress, setShippingAddress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modals
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user && id) {
            fetchOrder();
        }
    }, [user, id, authLoading]);

    // Real-time Status Updates
    useEffect(() => {
        if (!socket || !order) return;

        const handleStatusUpdate = (data: any) => {
            if (data.orderId === order.uid) {
                console.log("Received real-time update for order:", data.orderId);
                // Refresh full order details to get latest timeline, status, etc.
                fetchOrder();
                // Optionally show a toast here
            }
        };

        socket.on('order:status:updated', handleStatusUpdate);

        return () => {
            socket.off('order:status:updated', handleStatusUpdate);
        };
    }, [socket, order?.uid]);

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

            // Parse Shipping Snapshot
            try {
                if (orderData.shippingAddressSnapshot) {
                    setShippingAddress(JSON.parse(orderData.shippingAddressSnapshot));
                }
            } catch (e) {
                console.error("Failed to parse shipping snapshot", e);
            }

        } catch (error) {
            console.error("Failed to fetch order details", error);
            Alert.alert("Error", "Failed to load order details");
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReceipt = () => {
        const title = "Confirm Receipt";
        const message = "Are you sure you have received this order and are satisfied? This will release payment to the seller.";

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                performConfirmReceipt();
            }
        } else {
            Alert.alert(title, message, [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm Received", onPress: performConfirmReceipt }
            ]);
        }
    };

    const performConfirmReceipt = async () => {
        try {
            setActionLoading(true);
            await orderAPI.updateStatus(order!.uid, 'COMPLETED');
            if (Platform.OS === 'web') {
                window.alert("Success: Order completed!");
            } else {
                Alert.alert("Success", "Order completed!");
            }
            fetchOrder();
        } catch (error: any) {
            const errMsg = error.response?.data?.error || "Failed to confirm receipt";
            if (Platform.OS === 'web') window.alert(`Error: ${errMsg}`);
            else Alert.alert("Error", errMsg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleExtendGuarantee = () => {
        const title = "Extend Guarantee";
        const message = "Need more time? You can extend the guarantee period by 7 days.";

        if (Platform.OS === 'web') {
            if (window.confirm(`${title}\n\n${message}`)) {
                performExtendGuarantee();
            }
        } else {
            Alert.alert(title, message, [
                { text: "Cancel", style: "cancel" },
                { text: "Extend (+7 Days)", onPress: performExtendGuarantee }
            ]);
        }
    };

    const performExtendGuarantee = async () => {
        try {
            setActionLoading(true);
            await orderAPI.extendOrderGuarantee(order!.uid);
            if (Platform.OS === 'web') {
                window.alert("Success: Guarantee extended!");
            } else {
                Alert.alert("Success", "Guarantee extended!");
            }
            fetchOrder();
        } catch (error: any) {
            const errMsg = error.response?.data?.error || "Failed to extend guarantee";
            if (Platform.OS === 'web') window.alert(`Error: ${errMsg}`);
            else Alert.alert("Error", errMsg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReportIssue = async () => {
        if (!disputeReason.trim()) {
            Alert.alert("Required", "Please provide a reason for the dispute.");
            return;
        }
        try {
            setActionLoading(true);
            await orderAPI.updateStatus(order!.uid, 'DISPUTED', { message: disputeReason });
            setReportModalVisible(false);
            if (Platform.OS === 'web') {
                window.alert("Dispute Filed: Timer Paused.");
            } else {
                Alert.alert("Dispute Filed", "The order timer has been paused while we resolve this.");
            }
            fetchOrder();
        } catch (error: any) {
            const errMsg = error.response?.data?.error || "Failed to file dispute";
            Alert.alert("Error", errMsg);
        } finally {
            setActionLoading(false);
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

    // Use shared status color utilities (imported at top)

    const canExtend = (order.status === 'SHIPPED' || order.status === 'DELIVERED') && order.autoConfirmAt;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back to Orders</Text>
                    </Pressable>
                </View>

                <View style={styles.titleSection}>
                    <Text style={styles.title}>Order #{order.referenceNumber || order.uid}</Text>
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

                    {/* Guarantee / Auto Validation Section */}
                    {(order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'DISPUTED') && order.autoConfirmAt && (
                        <View style={[styles.infoBanner, { backgroundColor: order.status === 'DISPUTED' ? '#FEE2E2' : '#F0F9FF', borderColor: order.status === 'DISPUTED' ? '#FECACA' : '#BAE6FD', marginBottom: 20 }]}>
                            {order.status === 'DISPUTED' ? (
                                <>
                                    <Text style={[styles.infoBannerTitle, { color: '#B91C1C' }]}>🛑 Timer Paused</Text>
                                    <Text style={{ color: '#7F1D1D', marginBottom: 4 }}>This order is currently under dispute. The auto-confirmation timer is paused.</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={[styles.infoBannerText, { color: '#0369A1', marginBottom: 6 }]}>
                                        🛡️ Knot & Bloom Guarantee
                                    </Text>
                                    <Text style={{ color: '#0C4A6E', marginBottom: 12 }}>
                                        Order will automatically complete on: <Text style={{ fontWeight: 'bold' }}>{new Date(order.autoConfirmAt).toLocaleDateString()} {new Date(order.autoConfirmAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </Text>

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <Pressable
                                            onPress={handleConfirmReceipt}
                                            disabled={actionLoading}
                                            style={[styles.actionButton, { backgroundColor: '#059669', flex: 2 }]}
                                        >
                                            {actionLoading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.actionButtonText}>Order Received</Text>}
                                        </Pressable>

                                        {canExtend && (
                                            <Pressable
                                                onPress={handleExtendGuarantee}
                                                disabled={actionLoading}
                                                style={[styles.actionButton, { backgroundColor: 'white', borderWidth: 1, borderColor: '#ccc', flex: 1 }]}
                                            >
                                                <Text style={[styles.actionButtonText, { color: '#444' }]}>Extend</Text>
                                            </Pressable>
                                        )}
                                    </View>

                                    {/* Dispute & Receipt Actions */}
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                        <Pressable
                                            onPress={() => setReportModalVisible(true)}
                                            style={[styles.textBtn]}
                                        >
                                            <Text style={styles.textBtnText}>Report Issue</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setReceiptModalVisible(true)}
                                            style={[styles.textBtn]}
                                        >
                                            <Text style={[styles.textBtnText, { color: '#3B82F6' }]}>View Receipt</Text>
                                        </Pressable>
                                    </View>

                                    <View style={{ marginTop: 8 }}>
                                        <Text style={{ fontSize: 12, color: '#666' }}>
                                            Extensions used: {order.extensionCount || 0} (Max: {order.status === 'SHIPPED' ? 2 : 1})
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

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
                            <Text style={styles.infoValue}>{order.trackingNumber || 'Un-tracked'}</Text>
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
                                <Pressable
                                    key={index}
                                    style={styles.itemCard}
                                    onPress={() => router.push(`/product/${item.product.uid}` as RelativePathString)}
                                >
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
                                </Pressable>
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
                    {shippingAddress ? (
                        <>
                            <Text style={[styles.addressText, { fontWeight: '600', color: '#333' }]}>{shippingAddress.fullName}</Text>
                            <Text style={styles.addressText}>{shippingAddress.address}</Text>
                            <Text style={styles.addressText}>{shippingAddress.city}, {shippingAddress.postalCode}</Text>
                            <Text style={styles.addressText}>{shippingAddress.phone}</Text>
                            {shippingAddress.notes && (
                                <View style={{ marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 6 }}>
                                    <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>Note: {shippingAddress.notes}</Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.addressText}>{user?.name}</Text>
                            <Text style={styles.addressText}>{user?.address || 'No address provided'}</Text>
                            <Text style={styles.addressText}>{user?.phone}</Text>
                            <Text style={styles.addressText}>{user?.email}</Text>
                            <Text style={{ fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' }}>(Current Profile Address)</Text>
                        </>
                    )}
                </View>

            </ScrollView>

            {/* Report Issue Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={reportModalVisible}
                onRequestClose={() => setReportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: '#B91C1C' }]}>Report an Issue</Text>
                        <Text style={styles.subTitle}>Please describe the problem. This will pause the auto-completion timer.</Text>

                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="e.g. Broken item, package not received..."
                            multiline
                            value={disputeReason}
                            onChangeText={setDisputeReason}
                        />

                        <View style={styles.modalButtons}>
                            <Pressable style={styles.cancelBtn} onPress={() => setReportModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.confirmBtn, { backgroundColor: '#B91C1C' }, actionLoading && { opacity: 0.7 }]}
                                onPress={handleReportIssue}
                                disabled={actionLoading}
                            >
                                <Text style={styles.confirmBtnText}>{actionLoading ? "Submitting..." : "Submit Dispute"}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Receipt Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={receiptModalVisible}
                onRequestClose={() => setReceiptModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Order Receipt</Text>

                            <View style={styles.qrContainer}>
                                <Image
                                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ORDER-${order.uid}` }}
                                    style={styles.qrCode}
                                />
                                <Text style={styles.qrText}>Scan to find order</Text>
                            </View>

                            <View style={styles.receiptLine}>
                                <Text style={styles.receiptLabel}>Order #:</Text>
                                <Text style={styles.receiptValue}>{order.uid}</Text>
                            </View>
                            <View style={styles.receiptLine}>
                                <Text style={styles.receiptLabel}>Date:</Text>
                                <Text style={styles.receiptValue}>{new Date(order.uploaded).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.receiptLine}>
                                <Text style={styles.receiptLabel}>Total:</Text>
                                <Text style={styles.receiptValue}>₱{parseFloat(order.total).toFixed(2)}</Text>
                            </View>

                            {/* Proof Photos */}
                            {(() => {
                                let photos: string[] = [];
                                try {
                                    photos = order.proofPhotos ? JSON.parse(order.proofPhotos) : [];
                                } catch (e) { }

                                if (photos.length > 0) {
                                    return (
                                        <View style={{ marginTop: 20 }}>
                                            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 10 }]}>Proof of Fulfillment</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                                                {photos.map((url, i) => (
                                                    <Image key={i} source={{ uri: url }} style={styles.proofPhoto} />
                                                ))}
                                            </ScrollView>
                                        </View>
                                    );
                                }
                                return null;
                            })()}

                            <Pressable style={[styles.confirmBtn, { marginTop: 20 }]} onPress={() => setReceiptModalVisible(false)}>
                                <Text style={styles.confirmBtnText}>Close</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    infoBannerTitle: { fontWeight: 'bold', marginBottom: 4 },

    // New Action Button Styles
    actionButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },

    // New Styles for Modals
    textBtn: { padding: 8 },
    textBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', width: '90%', maxWidth: 400, padding: 24, borderRadius: 16, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
    subTitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 15, backgroundColor: '#fff' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: 12, borderRadius: 8 },
    confirmBtn: { backgroundColor: '#5A4A42', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    btnText: { color: '#4b5563', fontWeight: '600' },
    confirmBtnText: { color: 'white', fontWeight: '600' },

    // Receipt Styles
    qrContainer: { alignItems: 'center', marginBottom: 24 },
    qrCode: { width: 150, height: 150, backgroundColor: '#f0f0f0' },
    qrText: { marginTop: 8, fontSize: 12, color: '#666' },
    receiptLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8 },
    receiptLabel: { color: '#666' },
    receiptValue: { fontWeight: '600', color: '#111' },
    proofPhoto: { width: 100, height: 100, marginRight: 8, borderRadius: 8, backgroundColor: '#f0f0f0' }
});
