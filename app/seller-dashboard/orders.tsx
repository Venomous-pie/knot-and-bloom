
import { useAuth } from "@/app/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface OrderItem {
    uid: number;
    quantity: number;
    price: number; // or string if Decimal
    status: string;
    product: { name: string; image: string | null };
    order: {
        uid: number;
        createdAt: string;
        customer: { name: string; email: string };
    };
}

export default function SellerOrders() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Authorization Check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
                return;
            }

            // Check if user is Admin OR Active Seller
            const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');

            if (!isAuthorized) {
                Alert.alert("Unauthorized", "You must be an approved seller to access this dashboard.");
                router.replace('/profile');
            }
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        // If user is admin, allow them to see orders (demo: might need a way to select seller, but for now stick to user's sellerId logic or fail gracefully)
        // For actual seller:
        const targetSellerId = user?.sellerId;

        if (!targetSellerId && user?.role !== 'ADMIN') return;

        // If admin with no sellerId, maybe don't fetch or fetch specific? 
        // For strict seller dashboard:
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
            setItems(data);
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

    const updateStatus = async (itemId: number, status: string) => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/orders/items/${itemId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Update failed");

            setItems(prev => prev.map(i => i.uid === itemId ? { ...i, status } : i));
            Alert.alert("Success", `Status updated to ${status}`);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const renderItem = ({ item }: { item: OrderItem }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.orderId}>Order #{item.order.uid}</Text>
                <Text style={styles.date}>{new Date(item.order.createdAt).toLocaleDateString()}</Text>
            </View>

            <View style={styles.content}>
                {item.product.image && <Image source={{ uri: item.product.image }} style={styles.image} />}
                <View style={styles.details}>
                    <Text style={styles.productName}>{item.product.name}</Text>
                    <Text>Qty: {item.quantity} • ₱{Number(item.price).toFixed(2)}</Text>
                    <Text style={styles.customer}>Customer: {item.order.customer.name}</Text>
                    <Text style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <Text style={styles.actionLabel}>Update Status:</Text>
                <View style={styles.buttons}>
                    {['preparing', 'shipped', 'delivered'].map(s => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.btn, item.status === s && styles.activeBtn]}
                            onPress={() => updateStatus(item.uid, s)}
                            disabled={item.status === s}
                        >
                            <Text style={[styles.btnText, item.status === s && styles.activeBtnText]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'blue';
            case 'preparing': return 'orange';
            case 'shipped': return 'purple';
            case 'delivered': return 'green';
            default: return 'gray';
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Seller Dashboard" }} />

            <View style={styles.navRow}>
                <TouchableOpacity onPress={() => router.push('/seller-dashboard/products' as any)} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>Manage Products</Text>
                </TouchableOpacity>
            </View>



            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.empty}>No orders found for this seller.</Text>}
                />
            )}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    orderId: { fontWeight: 'bold' },
    date: { color: '#666' },
    content: { flexDirection: 'row', marginBottom: 12 },
    image: { width: 60, height: 60, borderRadius: 4, marginRight: 12, backgroundColor: '#eee' },
    details: { flex: 1 },
    productName: { fontWeight: 'bold', fontSize: 16 },
    customer: { fontSize: 12, color: '#666', marginTop: 2 },
    statusBadge: { fontWeight: 'bold', marginTop: 4 },
    actions: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
    actionLabel: { fontSize: 12, marginBottom: 4, color: '#666' },
    buttons: { flexDirection: 'row', gap: 8 },
    btn: { padding: 6, borderRadius: 4, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
    activeBtn: { backgroundColor: '#5A4A42', borderColor: '#5A4A42' },
    btnText: { fontSize: 12, color: '#333' },
    activeBtnText: { color: 'white' },
    navRow: { flexDirection: 'row', marginBottom: 16 },
    navBtn: { backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6 },
    navBtnText: { color: '#FFF', fontWeight: 'bold' }
});
