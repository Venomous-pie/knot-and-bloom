
import { useAuth } from "@/app/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface OrderItem {
    uid: number;
    quantity: number;
    price: number;
    product: { name: string; image: string | null };
}

interface Order {
    uid: number;
    status: string;
    total: number;
    uploaded: string;
    trackingNumber: string | null;
    courierName: string | null;
    customer: { name: string; email: string };
    items: OrderItem[];
}

export default function SellerOrders() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('');

    // Status Modals
    const [shipModalVisible, setShipModalVisible] = useState(false);
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);

    // Inputs
    const [estimatedDate, setEstimatedDate] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Authorization Check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
                return;
            }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!isAuthorized) {
                Alert.alert("Unauthorized", "You must be an approved seller to access this dashboard.");
                router.replace('/profile');
            }
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        const targetSellerId = user?.sellerId;
        if (!targetSellerId && user?.role !== 'ADMIN') return;
        if (!targetSellerId) return;

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/sellers/${targetSellerId}/orders`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setOrders(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.sellerId) {
            fetchOrders();
        }
    }, [user]);

    const handleUpdateStatus = async (status: string, extraData: any = {}) => {
        if (!selectedOrder) return;

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/orders/${selectedOrder.uid}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, message, ...extraData })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }

            // Refetch or local update
            const updated = await res.json();
            if (updated.success) {
                setOrders(prev => prev.map(o => o.uid === selectedOrder.uid ? { ...o, ...updated.order } : o));
                Alert.alert("Success", `Order updated to ${status}`);

                // Close all modals
                setShipModalVisible(false);
                setAcceptModalVisible(false);
                setRejectModalVisible(false);
                setSelectedOrder(null);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openModal = (order: Order, type: 'ship' | 'accept' | 'reject') => {
        setSelectedOrder(order);
        setMessage('');
        if (type === 'ship') {
            setTrackingNumber('');
            setCourierName('');
            setShipModalVisible(true);
        } else if (type === 'accept') {
            // Default 7 days from now
            const d = new Date();
            d.setDate(d.getDate() + 7);
            setEstimatedDate(d.toISOString().split('T')[0]);
            setAcceptModalVisible(true);
        } else if (type === 'reject') {
            setRejectionReason('');
            setRejectModalVisible(true);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#F59E0B'; // Amber
            case 'CONFIRMED': return '#3B82F6'; // Blue
            case 'IN_PRODUCTION': return '#8B5CF6'; // Purple
            case 'READY_TO_SHIP': return '#EC4899'; // Pink
            case 'SHIPPED': return '#10B981'; // Green
            case 'DELIVERED': return '#059669'; // Emerald
            case 'COMPLETED': return '#059669'; // Emerald
            case 'CANCELLED': return '#EF4444'; // Red
            case 'DISPUTED': return '#DC2626'; // Red
            default: return 'gray';
        }
    };

    const renderOrderActions = (item: Order) => {
        switch (item.status) {
            case 'PENDING':
                return (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => openModal(item, 'reject')}>
                            <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => openModal(item, 'accept')}>
                            <Text style={styles.primaryBtnText}>Accept Order</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'CONFIRMED':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => { setSelectedOrder(item); handleUpdateStatus('IN_PRODUCTION'); }}>
                        <Text style={styles.primaryBtnText}>Start Production</Text>
                    </TouchableOpacity>
                );
            case 'IN_PRODUCTION':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => { setSelectedOrder(item); handleUpdateStatus('READY_TO_SHIP'); }}>
                        <Text style={styles.primaryBtnText}>Mark Ready to Ship</Text>
                    </TouchableOpacity>
                );
            case 'READY_TO_SHIP':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => openModal(item, 'ship')}>
                        <Text style={styles.primaryBtnText}>Ship Order</Text>
                    </TouchableOpacity>
                );
            default:
                return null;
        }
    };

    const renderOrder = ({ item }: { item: Order }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.orderId}>Order #{item.uid}</Text>
                    <Text style={styles.date}>{new Date(item.uploaded).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.replace(/_/g, ' ')}</Text>
                </View>
            </View>

            <View style={styles.customerInfo}>
                <Text style={styles.customerConfig}>Customer: {item.customer.name}</Text>
                <Text style={styles.totalAmount}>Total: ₱{Number(item.total).toFixed(2)}</Text>
            </View>

            {/* Escrow Note for Pending/Confirmed */}
            {['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(item.status) && (
                <View style={styles.escrowNote}>
                    <Text style={styles.escrowText}>🔒 Payment held in Escrow</Text>
                </View>
            )}

            <View style={styles.itemsList}>
                {item.items.map(orderItem => (
                    <View key={orderItem.uid} style={styles.itemRow}>
                        {orderItem.product.image && <Image source={{ uri: orderItem.product.image }} style={styles.image} />}
                        <View style={styles.itemDetails}>
                            <Text style={styles.productName}>{orderItem.product.name}</Text>
                            <Text style={styles.qtyText}>Qty: {orderItem.quantity} x ₱{Number(orderItem.price).toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.actions}>
                {renderOrderActions(item)}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Seller Orders" }} />

            <View style={styles.navRow}>
                <TouchableOpacity onPress={() => router.push('/seller-dashboard/products' as any)} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>Manage Products</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderOrder}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
                />
            )}

            {/* Ship Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={shipModalVisible}
                onRequestClose={() => setShipModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Ship Order #{selectedOrder?.uid}</Text>

                        <Text style={styles.label}>Tracking Number *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Tracking ID"
                            value={trackingNumber}
                            onChangeText={setTrackingNumber}
                        />

                        <Text style={styles.label}>Courier Name (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Flash Express, J&T"
                            value={courierName}
                            onChangeText={setCourierName}
                        />

                        <Text style={styles.label}>Message to Buyer (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Any notes for the customer?"
                            value={message}
                            onChangeText={setMessage}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShipModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
                                onPress={() => handleUpdateStatus('SHIPPED', { trackingNumber, courierName })}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>{submitting ? "Processing..." : "Confirm Shipping"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Accept Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={acceptModalVisible}
                onRequestClose={() => setAcceptModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Accept Order #{selectedOrder?.uid}</Text>
                        <Text style={styles.subTitle}>When will this be ready?</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            value={estimatedDate}
                            onChangeText={setEstimatedDate}
                        />

                        <Text style={styles.label}>Message (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Thanks! Will start soon."
                            value={message}
                            onChangeText={setMessage}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAcceptModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
                                onPress={() => handleUpdateStatus('CONFIRMED', { estimatedCompletionDate: estimatedDate })}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>Confirm & Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={rejectModalVisible}
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Reject Order #{selectedOrder?.uid}</Text>

                        <Text style={styles.label}>Reason for rejection *</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="e.g. Out of stock, Cannot fulfill timeline..."
                            multiline
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: '#EF4444' }, submitting && { opacity: 0.7 }]}
                                onPress={() => handleUpdateStatus('CANCELLED', { rejectionReason })}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>Reject Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    list: { padding: 16 },
    empty: { textAlign: 'center', marginTop: 20, color: '#666' },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' },
    orderId: { fontWeight: '700', fontSize: 16, color: '#111' },
    date: { color: '#666', fontSize: 13, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontWeight: '700', fontSize: 12 },

    customerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 12 },
    customerConfig: { color: '#4b5563', fontSize: 14 },
    totalAmount: { fontWeight: '700', fontSize: 15, color: '#111' },

    escrowNote: { backgroundColor: '#FFFBEB', padding: 8, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FEF3C7' },
    escrowText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

    itemsList: { marginBottom: 16 },
    itemRow: { flexDirection: 'row', marginBottom: 12 },
    image: { width: 48, height: 48, borderRadius: 6, marginRight: 12, backgroundColor: '#f3f4f6' },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontWeight: '600', fontSize: 14, color: '#374151', marginBottom: 2 },
    qtyText: { fontSize: 13, color: '#6b7280' },

    actions: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16, alignItems: 'flex-end' },
    actionRow: { flexDirection: 'row', gap: 12 },
    btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    primaryBtn: { backgroundColor: '#5A4A42' },
    primaryBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
    rejectBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#EF4444' },
    rejectBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },

    navRow: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    navBtn: { marginRight: 16 },
    navBtnText: { color: '#5A4A42', fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', width: '90%', maxWidth: 400, padding: 24, borderRadius: 16, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
    subTitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    label: { fontWeight: '600', marginBottom: 6, color: '#374151', fontSize: 14 },
    input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 15, backgroundColor: '#fff' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: 12, borderRadius: 8 },
    confirmBtn: { backgroundColor: '#5A4A42', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    btnText: { color: '#4b5563', fontWeight: '600' },
    confirmBtnText: { color: 'white', fontWeight: '600' },

    // Legacy mapping (keep just to be safe if reused)
    trackingInfo: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 4, marginBottom: 12 },
    trackingLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
    trackingText: { fontWeight: '600', color: '#333' }
});
