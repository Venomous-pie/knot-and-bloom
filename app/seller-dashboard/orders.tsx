
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
    const [modalVisible, setModalVisible] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('');
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

    const handleShipOrder = async () => {
        if (!selectedOrder || !trackingNumber) {
            Alert.alert("Error", "Tracking number is required");
            return;
        }

        try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/orders/${selectedOrder.uid}/ship`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ trackingNumber, courierName })
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Update failed");
            }

            setOrders(prev => prev.map(o => o.uid === selectedOrder.uid ? { 
                ...o, 
                status: 'SHIPPED',
                trackingNumber,
                courierName
            } : o));
            
            Alert.alert("Success", "Order marked as shipped!");
            setModalVisible(false);
            setTrackingNumber('');
            setCourierName('');
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const openShipModal = (order: Order) => {
        setSelectedOrder(order);
        setTrackingNumber('');
        setCourierName('');
        setModalVisible(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'orange';
            case 'SHIPPED': return 'purple';
            case 'DELIVERED': return 'green';
            case 'CANCELLED': return 'red';
            default: return 'gray';
        }
    };

    const renderOrder = ({ item }: { item: Order }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.orderId}>Order #{item.uid}</Text>
                    <Text style={styles.date}>{new Date(item.uploaded).toLocaleDateString()}</Text>
                </View>
                <View style={styles.statusContainer}>
                    <Text style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>
            
            <View style={styles.customerInfo}>
                 <Text style={styles.customerConfig}>Customer: {item.customer.name}</Text>
                 <Text style={styles.totalAmount}>Total: ₱{Number(item.total).toFixed(2)}</Text>
            </View>

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

            {item.status === 'SHIPPED' && (
                <View style={styles.trackingInfo}>
                    <Text style={styles.trackingLabel}>Tracking Info:</Text>
                    <Text style={styles.trackingText}>{item.courierName ? `${item.courierName}: ` : ''}{item.trackingNumber}</Text>
                </View>
            )}

            <View style={styles.actions}>
                {item.status === 'CONFIRMED' && (
                    <TouchableOpacity style={styles.shipBtn} onPress={() => openShipModal(item)}>
                        <Text style={styles.shipBtnText}>Ship Order</Text>
                    </TouchableOpacity>
                )}
                {/* Add standard update Item status or View Details if needed */}
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

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
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

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]} 
                                onPress={handleShipOrder}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>{submitting ? "Processing..." : "Confirm Shipping"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    list: { padding: 16 },
    empty: { textAlign: 'center', marginTop: 20, color: '#666' },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    orderId: { fontWeight: 'bold', fontSize: 16 },
    date: { color: '#666', fontSize: 12 },
    statusContainer: { alignItems: 'flex-end' },
    statusBadge: { fontWeight: 'bold', fontSize: 14 },
    customerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    customerConfig: { color: '#444' },
    totalAmount: { fontWeight: 'bold' },
    itemsList: { marginBottom: 12 },
    itemRow: { flexDirection: 'row', marginBottom: 8 },
    image: { width: 50, height: 50, borderRadius: 4, marginRight: 12, backgroundColor: '#eee' },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontWeight: '600', fontSize: 14 },
    qtyText: { fontSize: 12, color: '#666' },
    actions: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, alignItems: 'flex-end' },
    shipBtn: { backgroundColor: '#5A4A42', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
    shipBtnText: { color: 'white', fontWeight: 'bold' },
    navRow: { flexDirection: 'row', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
    navBtn: { marginRight: 16 },
    navBtnText: { color: '#5A4A42', fontWeight: 'bold' },
    
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', width: '90%', padding: 20, borderRadius: 8, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    label: { fontWeight: '600', marginBottom: 4, color: '#444' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 10, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { padding: 10 },
    confirmBtn: { backgroundColor: '#5A4A42', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
    btnText: { color: '#333' },
    confirmBtnText: { color: 'white', fontWeight: 'bold' },
    
    trackingInfo: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 4, marginBottom: 12 },
    trackingLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
    trackingText: { fontWeight: '600', color: '#333' }
});
