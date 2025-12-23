import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { productAPI } from '../../api/api';
import { useAuth } from '../auth';

interface Product {
    uid: number;
    name: string;
    image: string | null;
    basePrice: number;
    status: string | null;
    categories: string[];
    seller?: {
        uid: number;
        name: string;
        slug: string;
        email: string;
    };
    uploaded: string;
}

const STATUS_TABS = [
    { key: 'PENDING', label: 'Pending Approval' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'SUSPENDED', label: 'Suspended' },
    { key: '', label: 'All' },
];

export default function AdminProducts() {
    const { user, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [total, setTotal] = useState(0);

    useEffect(() => {
        if (!authLoading && user?.role === 'ADMIN') {
            fetchProducts();
        }
    }, [statusFilter, user, authLoading]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const params = statusFilter ? { status: statusFilter } : undefined;
            const res = await productAPI.getAdminProducts(params);
            setProducts(res.data.products);
            setTotal(res.data.total);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await productAPI.updateProductStatus(id, status);
            // Optimistic update
            setProducts(prev => prev.map(p =>
                p.uid === id ? { ...p, status } : p
            ));
            Alert.alert("Success", `Product ${status === 'ACTIVE' ? 'approved' : 'updated'} successfully`);

            // If we're filtering by PENDING, remove the approved/rejected item from list
            if (statusFilter === 'PENDING' && status !== 'PENDING') {
                setProducts(prev => prev.filter(p => p.uid !== id));
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update product status");
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'ACTIVE': return '#10B981';
            case 'PENDING': return '#F59E0B';
            case 'SUSPENDED': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const renderItem = ({ item }: { item: Product }) => (
        <View style={styles.card}>
            <Image
                source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                style={styles.image}
            />
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.price}>₱{Number(item.basePrice).toFixed(2)}</Text>
                {item.seller && (
                    <Text style={styles.seller}>by {item.seller.name}</Text>
                )}
                <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                            {item.status || 'LEGACY'}
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.actions}>
                {item.status === 'PENDING' && (
                    <>
                        <TouchableOpacity
                            style={[styles.btn, styles.approveBtn]}
                            onPress={() => updateStatus(item.uid, 'ACTIVE')}
                        >
                            <Text style={styles.btnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.rejectBtn]}
                            onPress={() => updateStatus(item.uid, 'SUSPENDED')}
                        >
                            <Text style={styles.btnText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
                {item.status === 'ACTIVE' && (
                    <TouchableOpacity
                        style={[styles.btn, styles.suspendBtn]}
                        onPress={() => updateStatus(item.uid, 'SUSPENDED')}
                    >
                        <Text style={styles.btnText}>Suspend</Text>
                    </TouchableOpacity>
                )}
                {item.status === 'SUSPENDED' && (
                    <TouchableOpacity
                        style={[styles.btn, styles.approveBtn]}
                        onPress={() => updateStatus(item.uid, 'ACTIVE')}
                    >
                        <Text style={styles.btnText}>Reactivate</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (authLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Manage Products" }} />

            {/* Status Filter Tabs */}
            <View style={styles.tabsContainer}>
                {STATUS_TABS.map(tab => (
                    <Pressable
                        key={tab.key}
                        style={[styles.tab, statusFilter === tab.key && styles.tabActive]}
                        onPress={() => setStatusFilter(tab.key)}
                    >
                        <Text style={[styles.tabText, statusFilter === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Count Badge */}
            <View style={styles.countBadge}>
                <Text style={styles.countText}>
                    {total} {statusFilter || 'total'} product{total !== 1 ? 's' : ''}
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#B36979" /></View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>
                                {statusFilter === 'PENDING'
                                    ? 'No products awaiting approval!'
                                    : 'No products found.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
    },
    tabActive: {
        backgroundColor: '#B36979',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
    },
    tabTextActive: {
        color: '#FFF',
    },
    countBadge: {
        marginBottom: 12,
    },
    countText: {
        fontSize: 14,
        color: '#6B7280',
    },
    list: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    image: {
        width: 70,
        height: 70,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontWeight: '600',
        fontSize: 15,
        color: '#1F2937',
        marginBottom: 4,
    },
    price: {
        fontWeight: '700',
        fontSize: 15,
        color: '#B36979',
        marginBottom: 2,
    },
    seller: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'column',
        gap: 6,
    },
    btn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignItems: 'center',
    },
    btnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    approveBtn: {
        backgroundColor: '#10B981',
    },
    rejectBtn: {
        backgroundColor: '#EF4444',
    },
    suspendBtn: {
        backgroundColor: '#F59E0B',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
});
