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
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderSummary {
    uid: number;
    customerId: number;
    total: string;
    products: string; // JSON string
    uploaded: string;
    status: string;
}

export default function OrderHistoryPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>Order History</Text>
                    <View style={{ width: 40 }} />{/* Spacer for center alignment */}
                </View>

                {orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No orders found.</Text>
                        <Pressable
                            style={styles.shopButton}
                            onPress={() => router.push('/' as RelativePathString)}
                        >
                            <Text style={styles.shopButtonText}>Start Shopping</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {orders.map((order) => (
                            <Pressable
                                key={order.uid}
                                style={styles.orderCard}
                                onPress={() => router.push(`/profile/orders/${order.uid}` as RelativePathString)}
                            >
                                <View style={styles.orderHeader}>
                                    <Text style={styles.orderId}>Order #{order.uid}</Text>
                                    <Text style={styles.orderDate}>
                                        {new Date(order.uploaded).toLocaleDateString()}
                                    </Text>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.orderDetails}>
                                    <View>
                                        <Text style={styles.label}>Total</Text>
                                        <Text style={styles.totalPrice}>
                                            ₱{Number(order.total || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(order.status) }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                                            {order.status || 'PENDING'}
                                        </Text>
                                    </View>
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
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#888',
        marginBottom: 20,
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
        borderRadius: 12,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
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
        backgroundColor: '#E6F0E6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#4A7A4A',
        fontSize: 12,
        fontWeight: '600',
    }
});
