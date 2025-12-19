import { orderAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { Product } from '@/types/products'; // Assuming Product type is available
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
}

interface CartItem {
    product: Product;
    quantity: number;
    variant?: string; // variant name or object
}

export default function OrderDetailsPage() {
    const { id } = useLocalSearchParams();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [orderItems, setOrderItems] = useState<CartItem[]>([]);
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
                // Adjust parsing logic based on how cart items are stored. 
                // Assuming stored as array of objects similar to cart items
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
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>Completed</Text>
                    </View>
                </View>
                <Text style={styles.date}>Placed on {new Date(order.uploaded).toLocaleDateString()} at {new Date(order.uploaded).toLocaleTimeString()}</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.itemsList}>
                        {orderItems.map((item, index) => (
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
                                        ₱{parseFloat(String(item.product.discountedPrice || item.product.basePrice)).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        ))}
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
                    <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₱{parseFloat(order.total).toFixed(2)}</Text>
                    </View>
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
    }
});
