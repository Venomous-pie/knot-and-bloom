import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/types/products";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from '@/constants/theme';

export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, token, loading: authLoading } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    const [stats, setStats] = useState<any>(null);

    const {
        products,
        loading,
        refresh: refetchProducts,
        updateParams
    } = useProducts({ limit: 50 });

    const fetchStats = async () => {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/earnings/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (e) {
            console.error("Failed to fetch admin stats", e);
        }
    };

    // Auth Check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
            } else if (user.role !== 'ADMIN') {
                Alert.alert("Unauthorized", "You do not have permission to access this page.");
                router.replace('/');
            }
        }
    }, [user, authLoading]);

    // Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Update params when debounced term changes
    useEffect(() => {
        updateParams({ searchTerm: debouncedTerm });
    }, [debouncedTerm]);

    // Fetch Products & Stats on Focus (if admin)
    useFocusEffect(
        React.useCallback(() => {
            if (user?.role === 'ADMIN') {
                refetchProducts();
                fetchStats();
            }
        }, [user, token])
    );

    const handleDelete = (id: number) => {
        Alert.alert(
            "Delete Product",
            "Are you sure you want to delete this product? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await productAPI.deleteProduct(id.toString());
                            await refetchProducts();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete product.");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: Product }) => (
        <View style={styles.productRow}>
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productSku}>{item.sku}</Text>
                <Text style={styles.productPrice}>₱{Number(item.basePrice).toFixed(2)}</Text>
            </View>
            <View style={styles.actions}>
                <Pressable
                    style={styles.editBtn}
                    onPress={() => router.push(`/admin/edit/${item.uid}`)}
                >
                    <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.uid)}
                >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                </Pressable>
            </View>
        </View>
    );

    if (authLoading || (user?.role !== 'ADMIN')) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Control Center</Text>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    <Pressable
                        style={[styles.addBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => router.push('/admin/products' as any)}
                    >
                        <Text style={styles.addBtnText}>📋 Review Products</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.addBtn, { backgroundColor: '#4CAF50' }]}
                        onPress={() => router.push('/admin/sellers')}
                    >
                        <Text style={styles.addBtnText}>Manage Sellers</Text>
                    </Pressable>
                    <Pressable
                        style={styles.addBtn}
                        onPress={() => router.push('/seller-dashboard/products/form' as any)}
                    >
                        <Text style={styles.addBtnText}>+ New Product</Text>
                    </Pressable>
                </View>
            </View>

            {/* Key Metrics */}
            {stats && (
                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Platform Revenue</Text>
                        <Text style={styles.metricValue}>₱{Number(stats.revenue || 0).toLocaleString()}</Text>
                        <Text style={styles.metricSub}>From 5% Fees</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Total GMV</Text>
                        <Text style={styles.metricValue}>₱{Number(stats.gmv || 0).toLocaleString()}</Text>
                        <Text style={styles.metricSub}>Gross Sales</Text>
                    </View>
                    <View style={[styles.metricCard, stats.pendingWithdrawals > 0 && { borderColor: '#F59E0B', borderWidth: 2 }]}>
                        <Text style={styles.metricLabel}>Pending Payouts</Text>
                        <Text style={[styles.metricValue, stats.pendingWithdrawals > 0 && { color: '#F59E0B' }]}>
                            {stats.pendingWithdrawals}
                        </Text>
                        <Text style={styles.metricSub}>Requests</Text>
                    </View>
                </View>
            )}

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.uid.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No products found.</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    header: {
        // flexDirection: 'row', // Removed to stack title and buttons
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        gap: 12
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    addBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    searchContainer: {
        padding: 16,
        backgroundColor: 'white',
    },
    searchInput: {
        backgroundColor: theme.colors.subtle,
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    listContent: {
        padding: 16,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    productSku: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#10b981',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editBtn: {
        backgroundColor: '#E8D5D9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
    },
    editBtnText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    deleteBtn: {
        padding: 8,
    },
    deleteBtnText: {
        fontSize: 18,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    metricsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    metricSub: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginTop: 2,
    },
});
