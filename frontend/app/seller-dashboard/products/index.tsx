import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sellerProductsAPI } from '../../../api/api';
import InfoBox from '../../../shared/InfoBox';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

type Product = {
    uid: number;
    id: string;
    name: string;
    image: string | null;
    basePrice: number;
    status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' | null;
    stock?: number;
    variants?: any[];
    description?: string;
    views?: number;
};

const calculateOptimizationScore = (product: Product) => {
    let score = 0;
    if (product.image) score += 20;
    if (product.name && product.name.length >= 20) score += 20;
    if (product.description && product.description.length >= 50) score += 20;
    if ((product.variants && product.variants.some(v => v.stock > 0)) || (product.stock && product.stock > 0)) score += 20;
    // Placeholder 'competitiveness' check
    score += 20;
    return score;
};

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'SUSPENDED', label: 'Suspended' },
];

export default function SellerProducts() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    useEffect(() => {
        loadProducts();
    }, [statusFilter]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const params = statusFilter ? { status: statusFilter } : undefined;
            const data = await sellerProductsAPI.getMyProducts(params);
            setProducts(data.products);
            setError(null);
        } catch (err) {
            setError('Failed to load products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const performDelete = async (id: string | number) => {
        try {
            await sellerProductsAPI.deleteProduct(id);
            loadProducts();
        } catch (err: any) {
            const msg = err.response?.data?.error || "Failed to delete product";
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert("Error", msg);
            }
        }
    };

    const handleDelete = (id: string | number) => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete this product?")) {
                performDelete(id);
            }
        } else {
            Alert.alert(
                "Delete Product",
                "Are you sure you want to delete this product?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => performDelete(id)
                    }
                ]
            );
        }
    };

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
            if (newSelected.size === 0) setSelectionMode(false);
        } else {
            newSelected.add(id);
            setSelectionMode(true);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkAction = async (action: 'PUBLISH' | 'UNPUBLISH' | 'DELETE') => {
        if (selectedIds.size === 0) return;

        try {
            setLoading(true);
            const ids = Array.from(selectedIds);

            // Loop for MVP (Ideal: Bulk API endpoint)
            await Promise.all(ids.map(id => {
                if (action === 'DELETE') return sellerProductsAPI.deleteProduct(id);
                const status = action === 'PUBLISH' ? 'ACTIVE' : 'SUSPENDED';
                return sellerProductsAPI.updateProduct(id, { status });
            }));

            Alert.alert("Success", "Bulk action completed");
            setSelectedIds(new Set());
            setSelectionMode(false);
            loadProducts();
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to perform bulk action");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'ACTIVE': return '#10B981';
            case 'PENDING': return '#F59E0B';
            case 'SUSPENDED': return '#EF4444';
            case 'DRAFT': return '#6B7280';
            default: return '#6B7280';
        }
    };

    const getStatusInfo = (status: string | null) => {
        switch (status) {
            case 'ACTIVE': return 'Visible in shop';
            case 'PENDING': return 'Awaiting approval';
            case 'SUSPENDED': return 'Hidden from shop';
            default: return '';
        }
    };

    const renderItem = ({ item }: { item: Product }) => {
        const totalStock = item.variants && item.variants.length > 0
            ? item.variants.reduce((acc, v) => acc + (v.stock || 0), 0)
            : (item.stock || 0);

        const optScore = calculateOptimizationScore(item);
        const isSelected = selectedIds.has(item.uid);

        return (
            <Pressable
                onLongPress={() => toggleSelection(item.uid)}
                onPress={() => selectionMode ? toggleSelection(item.uid) : null}
                style={[styles.card, isSelected && styles.cardSelected]}
            >
                {selectionMode && (
                    <View style={styles.checkbox}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </View>
                )}
                <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                    style={styles.image}
                />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.price}>₱{Number(item.basePrice).toFixed(2)}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                                {item.status || 'LEGACY'}
                            </Text>
                        </View>
                        <Text style={styles.stock}>Stock: {totalStock}</Text>
                    </View>

                    {/* Optimization Score */}
                    <View style={styles.scoreRow}>
                        <Text style={styles.scoreLabel}>Optimization Score:</Text>
                        <View style={styles.scoreBarBg}>
                            <View style={[styles.scoreBarFill, { width: `${optScore}%`, backgroundColor: optScore > 80 ? '#10B981' : optScore > 50 ? '#F59E0B' : '#EF4444' }]} />
                        </View>
                        <Text style={styles.scoreValue}>{optScore}/100</Text>
                    </View>
                </View>

                {!selectionMode && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/seller-dashboard/products/form', params: { id: item.uid } })}
                            style={styles.actionBtn}
                        >
                            <Ionicons name="create-outline" size={20} color={SUB} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDelete(item.uid)}
                            style={[styles.actionBtn, styles.deleteBtn]}
                        >
                            <Ionicons name="trash-outline" size={20} color={RED} />
                        </TouchableOpacity>
                    </View>
                )}
            </Pressable>
        );
    };

    const hasPendingProducts = products.some(p => p.status === 'PENDING');

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Products</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => router.push('/seller-dashboard/products/form')}
                >
                    <Ionicons name="add" size={24} color="#FFF" />
                    <Text style={styles.addBtnText}>Add Product</Text>
                </TouchableOpacity>
            </View>

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

            {/* Info Banner for Pending Products */}
            {hasPendingProducts && statusFilter !== 'ACTIVE' && (
                <InfoBox 
                    message='Products with "Pending" status are awaiting admin approval and won&apos;t appear in the public shop yet.' 
                    type="info" 
                    style={{ marginBottom: 16 }} 
                />
            )}

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={loadProducts} style={styles.retryBtn}>
                        <Text>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.uid.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No products found.</Text>
                            <Text style={styles.emptySubtext}>
                                {statusFilter ? `No ${statusFilter.toLowerCase()} products.` : 'Start adding items to your store!'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Bulk Action Bar */}
            {selectionMode && (
                <View style={styles.bulkBar}>
                    <Text style={styles.bulkCount}>{selectedIds.size} Selected</Text>
                    <View style={styles.bulkActions}>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => handleBulkAction('PUBLISH')}>
                            <Ionicons name="eye" size={20} color={GREEN} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => handleBulkAction('UNPUBLISH')}>
                            <Ionicons name="eye-off" size={20} color={AMBER} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => handleBulkAction('DELETE')}>
                            <Ionicons name="trash" size={20} color={RED} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => {
                            setSelectionMode(false);
                            setSelectedIds(new Set());
                        }}>
                            <Ionicons name="close" size={20} color={SUB} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: BG,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: P,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    addBtnText: {
        color: '#FFF',
        fontWeight: '700',
        marginLeft: 4,
        fontFamily: 'Quicksand'
    },
    listContent: {
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: CARD,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: BG,
    },
    info: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: TEXT,
        marginBottom: 4,
        fontFamily: 'Quicksand'
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT,
        marginBottom: 8,
        fontFamily: 'Quicksand'
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Quicksand'
    },
    stock: {
        fontSize: 12,
        color: SUB,
        fontFamily: 'Quicksand'
    },
    actions: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 80, // Match image height roughly
    },
    actionBtn: {
        padding: 8,
    },
    deleteBtn: {
        // marginBottom: 0
    },
    errorText: {
        color: RED,
        marginBottom: 10,
        fontFamily: 'Quicksand',
    },
    retryBtn: {
        padding: 10,
        backgroundColor: BG,
        borderRadius: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: TEXT,
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    emptySubtext: {
        color: SUB,
        fontFamily: 'Quicksand',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: BORDER
    },
    tabActive: {
        backgroundColor: P_LIGHT,
        borderColor: P
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: SUB,
        fontFamily: 'Quicksand',
    },
    tabTextActive: {
        color: P,
    },
    statusInfo: {
        fontSize: 11,
        color: SUB,
        fontStyle: 'italic',
        fontFamily: 'Quicksand',
    },
    cardSelected: {
        borderColor: P,
        borderWidth: 2,
        backgroundColor: P_LIGHT
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: P,
        marginRight: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    scoreLabel: {
        fontSize: 10,
        color: SUB,
        marginRight: 4,
        fontFamily: 'Quicksand',
    },
    scoreBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: BORDER,
        borderRadius: 3,
        marginRight: 6,
    },
    scoreBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    scoreValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: SUB,
        fontFamily: 'Quicksand',
    },
    bulkBar: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    bulkCount: {
        fontWeight: 'bold',
        fontSize: 16,
        color: TEXT,
        marginLeft: 8,
        fontFamily: 'Quicksand',
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 16,
    },
    bulkBtn: {
        padding: 5,
    }
});
