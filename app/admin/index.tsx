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

export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");

    const {
        products,
        loading,
        refresh: refetchProducts,
        updateParams
    } = useProducts({ limit: 50 });

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

    // Fetch Products on Focus (if admin)
    useFocusEffect(
        React.useCallback(() => {
            if (user?.role === 'ADMIN') {
                refetchProducts();
            }
        }, [user])
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
                <ActivityIndicator size="large" color="#B36979" />
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
                        onPress={() => router.push('/admin/create')}
                    >
                        <Text style={styles.addBtnText}>+ New Product</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#B36979" style={{ marginTop: 20 }} />
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
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    addBtn: {
        backgroundColor: '#B36979',
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
        backgroundColor: '#f0f0f0',
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
        shadowColor: "#000",
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
        color: '#333',
        marginBottom: 4,
    },
    productSku: {
        fontSize: 12,
        color: '#666',
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
        color: '#B36979',
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
        color: '#666',
        fontSize: 16,
    },
});
