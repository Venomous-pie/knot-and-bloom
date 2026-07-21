import { Stack } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Image,
    RefreshControl, StyleSheet, Text, TextInput,
    TouchableOpacity, View, Platform, Animated
} from 'react-native';
import { productAPI } from '../../api/api';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '../../types/products';
import {
    CheckCircle, XCircle, AlertTriangle, Search,
    Package, RotateCcw, List, LayoutGrid, AlignJustify
} from 'lucide-react-native';
import StatCard from '@/components/ui/StatCard';

/** Renders a button with a native tooltip on web hover */
function TooltipBtn({ label, style, onPress, children }: { label: string; style: any; onPress: () => void; children: React.ReactNode }) {
    if (Platform.OS === 'web') {
        return (
            <TouchableOpacity
                style={style}
                onPress={onPress}
                // @ts-ignore – web-only title prop for native browser tooltip
                title={label}
                accessibilityLabel={label}
            >
                {children}
            </TouchableOpacity>
        );
    }
    return (
        <TouchableOpacity style={style} onPress={onPress} accessibilityLabel={label}>
            {children}
        </TouchableOpacity>
    );
}

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

const STATUS_TABS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'];

export default function AdminProducts() {
    const { user, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
    const [total, setTotal] = useState(0);
    const [containerWidth, setContainerWidth] = useState(900);

    // Animation for skeleton
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (loading && !refreshing && products.length === 0) {
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            );
            anim.start();
        } else {
            pulseAnim.setValue(0.4);
        }
        return () => anim?.stop();
    }, [loading, refreshing, products.length]);

    useEffect(() => {
        if (!authLoading && user?.role === 'ADMIN') {
            fetchProducts();
        }
    }, [user, authLoading]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            // Fetch all products once, then filter client-side for instant switching
            const res = await productAPI.getAdminProducts();
            setProducts(res.data.products);
            setTotal(res.data.total);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load products");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    const updateStatus = async (id: number, status: string, reason?: string) => {
        if (status === 'SUSPENDED' && !reason) {
            setSelectedProductId(id);
            setRejectionReason('');
            setRejectModalVisible(true);
            return;
        }
        try {
            await productAPI.updateProductStatus(id, status, reason);
            setProducts(prev =>
                prev.map(p => p.uid === id ? { ...p, status: status as Product['status'] } : p)
            );
            const msg = status === 'ACTIVE' ? 'approved' : 'suspended';
            if (Platform.OS === 'web') {
                window.alert(`Product ${msg} successfully`);
            } else {
                Alert.alert("Success", `Product ${msg} successfully`);
            }
            if ((statusFilter === 'PENDING' || statusFilter === 'ACTIVE') && status !== statusFilter) {
                setProducts(prev => prev.filter(p => p.uid !== id));
            }
        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') {
                window.alert("Failed to update product status");
            } else {
                Alert.alert("Error", "Failed to update product status");
            }
        }
    };

    const confirmRejection = () => {
        if (!selectedProductId) return;
        if (!rejectionReason.trim()) {
            Alert.alert("Required", "Please provide a reason for suspension.");
            return;
        }
        updateStatus(selectedProductId, 'SUSPENDED', rejectionReason);
        setRejectModalVisible(false);
    };

    const getStatusColor = (status: string | null | undefined) => {
        switch (status) {
            case 'ACTIVE': return GREEN;
            case 'PENDING': return AMBER;
            case 'SUSPENDED': return RED;
            default: return SUB;
        }
    };

    const filteredProducts = products.filter(p => {
        if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
        
        const q = searchQuery.toLowerCase();
        if (q) {
            return (
                p.name?.toLowerCase().includes(q) ||
                p.seller?.name?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const stats = {
        total: products.length,
        pending: products.filter(p => p.status === 'PENDING').length,
        active: products.filter(p => p.status === 'ACTIVE').length,
    };

    const numCols = viewMode === 'grid' ? Math.max(2, Math.floor(containerWidth / 180)) : 1;
    const gridGap = 12;
    const cardWidth = viewMode === 'grid' ? (containerWidth - (numCols - 1) * gridGap) / numCols : '100%';

    const renderItem = ({ item }: { item: Product }) => {
        const statusColor = getStatusColor(item.status);

        if (viewMode === 'grid') {
            return (
                <View style={[s.gridCard, { width: cardWidth }]}>
                    <View style={s.gridImageContainer}>
                        <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={s.gridImage} />
                        <View style={[s.badgeAbs, { backgroundColor: statusColor }]}>
                            <Text style={s.badgeTextAbs}>{item.status || 'LEGACY'}</Text>
                        </View>
                    </View>
                    <View style={s.gridInfo}>
                        <Text style={s.gridName} numberOfLines={2}>{item.name}</Text>
                        <Text style={s.gridPrice}>₱{Number(item.basePrice).toFixed(2)}</Text>
                        {item.seller && <Text style={s.sellerText} numberOfLines={1}>by {item.seller.name}</Text>}
                    </View>
                    <View style={s.gridActions}>
                        {item.status === 'PENDING' && (
                            <>
                                <TooltipBtn label="Approve" style={s.gridBtnPrimary} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                    <CheckCircle size={14} color="#FFF" />
                                </TooltipBtn>
                                <TooltipBtn label="Reject" style={s.gridBtnRed} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                    <XCircle size={14} color={RED} />
                                </TooltipBtn>
                            </>
                        )}
                        {item.status === 'ACTIVE' && (
                            <TooltipBtn label="Suspend" style={s.gridBtnAmber} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                <AlertTriangle size={14} color={AMBER} />
                            </TooltipBtn>
                        )}
                        {item.status === 'SUSPENDED' && (
                            <TooltipBtn label="Reactivate" style={s.gridBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <RotateCcw size={14} color={GREEN} />
                            </TooltipBtn>
                        )}
                    </View>
                </View>
            );
        }

        if (viewMode === 'compact') {
            return (
                <View style={s.compactCard}>
                    <View style={s.compactInfo}>
                        <View style={s.compactColMain}>
                            <Text style={s.compactName} numberOfLines={1}>{item.name}</Text>
                            <Text style={s.compactPrice}>₱{Number(item.basePrice).toFixed(2)}</Text>
                        </View>
                        <View style={s.compactColStatus}>
                            <View style={[s.badge, { backgroundColor: `${statusColor}20`, alignSelf: 'flex-start' }]}>
                                <Text style={[s.badgeText, { color: statusColor }]}>{item.status || 'LEGACY'}</Text>
                            </View>
                        </View>
                        <View style={s.compactColSeller}>
                            {item.seller ? (
                                <Text style={s.sellerText} numberOfLines={1}>{item.seller.name}</Text>
                            ) : (
                                <Text style={s.sellerText} numberOfLines={1}>Unknown</Text>
                            )}
                        </View>
                    </View>
                    <View style={s.compactActions}>
                        {item.status === 'PENDING' && (
                            <>
                                <TooltipBtn label="Approve" style={s.compactOutlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                    <CheckCircle size={16} color={GREEN} />
                                </TooltipBtn>
                                <TooltipBtn label="Reject" style={s.compactOutlineBtnRed} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                    <XCircle size={16} color={RED} />
                                </TooltipBtn>
                            </>
                        )}
                        {item.status === 'ACTIVE' && (
                            <TooltipBtn label="Suspend" style={s.compactOutlineBtnAmber} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                <AlertTriangle size={16} color={AMBER} />
                            </TooltipBtn>
                        )}
                        {item.status === 'SUSPENDED' && (
                            <TooltipBtn label="Reactivate" style={s.compactOutlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <RotateCcw size={16} color={GREEN} />
                            </TooltipBtn>
                        )}
                    </View>
                </View>
            );
        }

        return (
            <View style={s.card}>
                <View style={s.imageContainer}>
                    <Image
                        source={{ uri: item.image || 'https://via.placeholder.com/80' }}
                        style={s.image}
                    />
                    <View style={[s.badgeAbs, { backgroundColor: statusColor }]}>
                        <Text style={s.badgeTextAbs}>
                            {item.status || 'LEGACY'}
                        </Text>
                    </View>
                </View>
                <View style={s.info}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.price}>₱{Number(item.basePrice).toFixed(2)}</Text>
                    {item.seller && (
                        <Text style={s.sellerText}>by {item.seller.name}</Text>
                    )}
                </View>
                <View style={s.actions}>
                    {item.status === 'PENDING' && (
                        <>
                            <TooltipBtn label="Approve" style={s.primaryBtn} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <CheckCircle size={14} color="#FFF" />
                                <Text style={s.primaryBtnText}>Approve</Text>
                            </TooltipBtn>
                            <TooltipBtn label="Reject" style={s.outlineBtnRed} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                <XCircle size={14} color={RED} />
                                <Text style={s.outlineBtnRedText}>Reject</Text>
                            </TooltipBtn>
                        </>
                    )}
                    {item.status === 'ACTIVE' && (
                        <TooltipBtn label="Suspend this product" style={s.outlineBtnAmber} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                            <AlertTriangle size={14} color={AMBER} />
                            <Text style={s.outlineBtnAmberText}>Suspend</Text>
                        </TooltipBtn>
                    )}
                    {item.status === 'SUSPENDED' && (
                        <TooltipBtn label="Reactivate product" style={s.outlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                            <RotateCcw size={14} color={GREEN} />
                            <Text style={s.outlineBtnGreenText}>Reactivate</Text>
                        </TooltipBtn>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Manage Products" }} />

            {/* Header Bar */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Manage Products</Text>
                        <Text style={s.subtitle}>Review, approve, and moderate product listings</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1 }} onLayout={e => setContainerWidth(e.nativeEvent.layout.width - 40)}>
            <FlatList
                data={filteredProducts}
                keyExtractor={item => String(item.uid)}
                renderItem={renderItem}
                contentContainerStyle={s.listContent}
                showsVerticalScrollIndicator={false}
                key={viewMode === 'grid' ? `grid-${numCols}` : 'list'}
                numColumns={viewMode === 'grid' ? numCols : 1}
                columnWrapperStyle={viewMode === 'grid' ? { gap: gridGap } : undefined}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[P]} tintColor={P} />
                }
                ListHeaderComponent={
                    <>
                        {/* Stats Row */}
                        <View style={s.statRow}>
                            <StatCard
                                label="Total Listed"
                                value={String(total)}
                                icon={<Package size={20} color={P} />}
                                color={P}
                                isLoading={loading}
                                tooltip="Total number of products across the entire platform"
                            />
                            <StatCard
                                label="Pending Review"
                                value={String(stats.pending)}
                                icon={<AlertTriangle size={20} color={AMBER} />}
                                color={AMBER}
                                isLoading={loading}
                                tooltip="Products awaiting your moderation and approval"
                            />
                            <StatCard
                                label="Active"
                                value={String(stats.active)}
                                icon={<CheckCircle size={20} color={GREEN} />}
                                color={GREEN}
                                isLoading={loading}
                                tooltip="Products currently live and visible to customers"
                            />
                        </View>

                        {/* Search Bar */}
                        <View style={s.searchContainer}>
                            <Search size={18} color={SUB} style={{ marginRight: 8 }} />
                            <TextInput
                                style={s.searchInput}
                                placeholder="Search products or sellers..."
                                placeholderTextColor={SUB}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        {/* Filter Tabs & View Toggle */}
                        <View style={s.filterBarContainer}>
                            <View style={s.tabsContainer}>
                                {STATUS_TABS.map(tab => (
                                    <TouchableOpacity
                                        key={tab}
                                        onPress={() => setStatusFilter(tab)}
                                        style={[s.tab, statusFilter === tab && s.tabActive]}
                                    >
                                        <Text style={[s.tabText, statusFilter === tab && s.tabTextActive]}>
                                            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                        </Text>
                                        {tab === 'PENDING' && stats.pending > 0 && (
                                            <View style={s.pendingBadge}>
                                                <Text style={s.pendingBadgeTxt}>!</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={s.viewToggle}>
                                <TouchableOpacity onPress={() => setViewMode('list')} style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}>
                                    <List size={16} color={viewMode === 'list' ? P : SUB} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setViewMode('grid')} style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]}>
                                    <LayoutGrid size={16} color={viewMode === 'grid' ? P : SUB} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setViewMode('compact')} style={[s.viewBtn, viewMode === 'compact' && s.viewBtnActive]}>
                                    <AlignJustify size={16} color={viewMode === 'compact' ? P : SUB} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* List Headers for Compact Mode */}
                        {viewMode === 'compact' && (
                            <View style={s.compactHeaderRow}>
                                <Text style={[s.compactHeaderTxt, s.compactColMain]}>Product</Text>
                                <Text style={[s.compactHeaderTxt, s.compactColStatus]}>Status</Text>
                                <Text style={[s.compactHeaderTxt, s.compactColSeller]}>Seller</Text>
                                <Text style={[s.compactHeaderTxt, s.compactColActions, { textAlign: 'right' }]}>Actions</Text>
                            </View>
                        )}



                        {loading && !refreshing && products.length === 0 && (
                            <Animated.View style={{ opacity: pulseAnim, width: '100%', marginTop: 8 }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <View key={i} style={s.skeletonCard}>
                                        <View style={s.skeletonImage} />
                                        <View style={s.skeletonInfo}>
                                            <View style={s.skeletonTextLine1} />
                                            <View style={s.skeletonTextLine2} />
                                            <View style={s.skeletonTextLine3} />
                                        </View>
                                        <View style={s.skeletonBtn} />
                                    </View>
                                ))}
                            </Animated.View>
                        )}
                    </>
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={s.emptyState}>
                            <Package size={40} color={SUB} style={{ opacity: 0.4, marginBottom: 12 }} />
                            <Text style={s.emptyText}>
                                {statusFilter === 'PENDING' ? 'No products awaiting approval!' : 'No products found.'}
                            </Text>
                        </View>
                    ) : null
                }
            />
            </View>

            {/* Suspension Modal */}
            {rejectModalVisible && (
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Suspend Product</Text>
                        <Text style={s.modalSubtitle}>Please provide a reason for this action. This may be communicated to the seller.</Text>
                        <TextInput
                            style={s.modalInput}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="e.g. Violation of policy, misleading details..."
                            placeholderTextColor={SUB}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={s.modalActions}>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectModalVisible(false)}>
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.confirmBtn} onPress={confirmRejection}>
                                <Text style={s.confirmBtnText}>Confirm Suspension</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    subtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },

    listContent: { padding: 20, paddingBottom: 80, maxWidth: 1280, width: '100%', alignSelf: 'center' },

    statRow: { flexDirection: 'row', gap: 16, marginBottom: 24, flexWrap: 'wrap' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER, height: 44, marginBottom: 16 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Quicksand', color: TEXT, outlineStyle: 'none' as any },

    filterBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
    tabsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, gap: 6 },
    tabActive: { backgroundColor: P_LIGHT, borderColor: P },
    tabText: { fontSize: 13, fontWeight: '700', fontFamily: 'Quicksand', color: SUB },
    tabTextActive: { color: P },
    pendingBadge: { backgroundColor: AMBER, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    pendingBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    viewToggle: { flexDirection: 'row', backgroundColor: BORDER, borderRadius: 12, padding: 4 },
    viewBtn: { padding: 6, borderRadius: 8 },
    viewBtnActive: { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

    countText: { fontSize: 12, color: SUB, fontFamily: 'Quicksand', fontWeight: '600' },

    // List View
    card: { backgroundColor: CARD, borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F9FAFB', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 20 },
    imageContainer: { position: 'relative', width: 80, height: 80 },
    image: { width: 80, height: 80, borderRadius: 16, backgroundColor: BG },
    badgeAbs: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    badgeTextAbs: { color: '#FFF', fontSize: 9, fontWeight: '800', fontFamily: 'Quicksand', letterSpacing: 0.5 },
    info: { flex: 1, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 6 },
    price: { fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand', marginBottom: 6 },
    sellerText: { fontSize: 12, color: SUB, fontFamily: 'Quicksand', fontWeight: '500' },

    actions: { flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
    primaryBtn: { backgroundColor: P, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 12, fontFamily: 'Quicksand' },
    outlineBtnRed: { borderWidth: 1, borderColor: RED, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD },
    outlineBtnRedText: { color: RED, fontWeight: '600', fontSize: 12, fontFamily: 'Quicksand' },
    outlineBtnAmber: { borderWidth: 1, borderColor: AMBER, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD },
    outlineBtnAmberText: { color: AMBER, fontWeight: '600', fontSize: 12, fontFamily: 'Quicksand' },
    outlineBtnGreen: { borderWidth: 1, borderColor: GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: CARD },
    outlineBtnGreenText: { color: GREEN, fontWeight: '600', fontSize: 12, fontFamily: 'Quicksand' },

    // Grid View
    gridCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F9FAFB' },
    gridImageContainer: { position: 'relative', width: '100%', aspectRatio: 1, marginBottom: 12 },
    gridImage: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: BG },
    gridInfo: { flex: 1, paddingBottom: 12 },
    gridName: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 6, fontFamily: 'Quicksand' },
    gridPrice: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 6, fontFamily: 'Quicksand' },
    gridActions: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
    gridBtnPrimary: { flex: 1, backgroundColor: P, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    gridBtnRed: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: RED, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    gridBtnAmber: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: AMBER, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    gridBtnGreen: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: GREEN, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },

    // Compact View
    compactHeaderRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 8, marginBottom: 8 },
    compactHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    compactCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
    compactInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    compactColMain: { flex: 2, paddingRight: 16 },
    compactName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    compactPrice: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    compactColStatus: { width: 100 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    badgeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Quicksand' },
    compactColSeller: { width: 140 },
    compactColActions: { width: 80 },
    compactActions: { flexDirection: 'row', gap: 8, width: 80, justifyContent: 'flex-end' },
    compactActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnGreen: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnRed: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: RED, alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnAmber: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: AMBER, alignItems: 'center', justifyContent: 'center' },

    emptyState: { paddingVertical: 60, alignItems: 'center' },
    emptyText: { fontSize: 14, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic' },

    // Modal
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
    modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    modalSubtitle: { fontSize: 13, color: SUB, marginBottom: 20, fontFamily: 'Quicksand' },
    modalInput: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, fontSize: 14, fontFamily: 'Quicksand', color: TEXT, minHeight: 100, textAlignVertical: 'top', marginBottom: 24, outlineStyle: 'none' as any },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: BG },
    cancelBtnText: { color: SUB, fontWeight: '600', fontFamily: 'Quicksand', fontSize: 14 },
    confirmBtn: { backgroundColor: RED, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    confirmBtnText: { color: 'white', fontWeight: '700', fontFamily: 'Quicksand', fontSize: 14 },

    // Skeletons
    skeletonCard: { backgroundColor: CARD, borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', gap: 20 },
    skeletonImage: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#E2E8F0' },
    skeletonInfo: { flex: 1, justifyContent: 'center', gap: 10 },
    skeletonTextLine1: { width: '70%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 8 },
    skeletonTextLine2: { width: '40%', height: 18, backgroundColor: '#E2E8F0', borderRadius: 8 },
    skeletonTextLine3: { width: '30%', height: 12, backgroundColor: '#E2E8F0', borderRadius: 8 },
    skeletonBtn: { width: 100, height: 32, borderRadius: 12, backgroundColor: '#E2E8F0' },
});
