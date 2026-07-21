import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, Animated, useWindowDimensions, TextInput, ScrollView, RefreshControl } from 'react-native';
import { sellerProductsAPI } from '../../../api/api';
import InfoBox from '../../../components/ui/InfoBox';
import Tooltip from '../../../components/ui/Tooltip';
import DropdownMenu from '../../../components/ui/DropdownMenu';
import StatCard from '../../../components/ui/StatCard';
import { Package, Activity, AlertTriangle, ClipboardList, Download, Edit2, Trash2, Search, LayoutGrid, List, Filter, Clock, History, TrendingDown, TrendingUp, AlignJustify } from 'lucide-react-native';
import { calculateOptimizationScore } from '../../../utils/optimizationScore';
import { useDialog } from '../../../contexts/DialogContext';

const P = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const INDIGO = '#6366F1';

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
    tags?: string[];
    materials?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    views?: number;
};

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'SUSPENDED', label: 'Suspended' },
];

const SORT_OPTIONS = [
    { label: 'Newest', value: 'newest', icon: Clock },
    { label: 'Oldest', value: 'oldest', icon: History },
    { label: 'Price: High-Low', value: 'price_high', icon: TrendingDown },
    { label: 'Price: Low-High', value: 'price_low', icon: TrendingUp },
];



export default function SellerProducts() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const { confirm } = useDialog();

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (loading) {
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
    }, [loading]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Pagination
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
    const [showFilters, setShowFilters] = useState(false);

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch, sortBy]);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async (force: boolean = false) => {
        if (productsLoaded && !force) return;
        try {
            setLoading(true);
            const params = {
                limit: 1000,
                includeStats: 'true'
            };
            const data = await sellerProductsAPI.getMyProducts(params);

            setAllProducts(data.products);
            if (data.stats) setStats(data.stats);
            setProductsLoaded(true);
            setError(null);
        } catch (err) {
            setError('Failed to load products');
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const filteredProducts = React.useMemo(() => {
        let filtered = allProducts;
        
        if (statusFilter) {
            filtered = filtered.filter(p => p.status === statusFilter);
        }
        
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(p => 
                p.name?.toLowerCase().includes(query) || 
                (p as any).sku?.toLowerCase().includes(query)
            );
        }
        
        filtered = [...filtered].sort((a, b) => {
            if (sortBy === 'newest') return b.uid - a.uid;
            if (sortBy === 'oldest') return a.uid - b.uid;
            if (sortBy === 'price_high') return b.basePrice - a.basePrice;
            if (sortBy === 'price_low') return a.basePrice - b.basePrice;
            return 0;
        });

        return filtered;
    }, [allProducts, statusFilter, debouncedSearch, sortBy]);

    const products = filteredProducts.slice(0, page * 20);
    const hasMore = products.length < filteredProducts.length;

    const loadMore = () => {
        if (!hasMore || loading) return;
        setPage(prev => prev + 1);
    };

    const performDelete = async (id: string | number) => {
        try {
            await sellerProductsAPI.deleteProduct(id);
            setPage(1);
            loadProducts(true);
        } catch (err: any) {
            const msg = err.response?.data?.error || "Failed to delete product";
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert("Error", msg);
            }
        }
    };

    const handleDelete = async (id: string | number) => {
        const confirmed = await confirm({
            title: "Delete Product",
            message: "Are you sure you want to delete this product?",
            confirmText: "Delete",
            cancelText: "Cancel"
        });
        if (confirmed) {
            performDelete(id);
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

        if (action === 'DELETE') {
            const confirmed = await confirm({
                title: "Delete Products",
                message: `Are you sure you want to delete ${selectedIds.size} products?`,
                confirmText: "Delete",
                cancelText: "Cancel"
            });
            if (!confirmed) return;
        }

        try {
            setLoading(true);
            const ids = Array.from(selectedIds);
            await Promise.all(ids.map(id => {
                if (action === 'DELETE') return sellerProductsAPI.deleteProduct(id);
                const status = action === 'PUBLISH' ? 'ACTIVE' : 'SUSPENDED';
                return sellerProductsAPI.updateProduct(id, { status });
            }));
            Alert.alert("Success", "Bulk action completed");
            setSelectedIds(new Set());
            setSelectionMode(false);
            setPage(1);
            loadProducts(true);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to perform bulk action");
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (products.length === 0) {
            if (Platform.OS === 'web') window.alert("No products to export.");
            else Alert.alert("Export", "No products to export.");
            return;
        }

        const headers = ['ID', 'Name', 'Price', 'Status', 'Total Stock', 'Optimization Score'];
        const rows = products.map(p => {
            const totalStock = p.variants && p.variants.length > 0
                ? p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0;
            const score = calculateOptimizationScore(p).totalScore;
            return [
                p.uid, `"${p.name.replace(/"/g, '""')}"`, p.basePrice,
                p.status || 'LEGACY', totalStock, score
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        if (Platform.OS === 'web') {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `products_export_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            Alert.alert("Export CSV", "CSV export is fully supported on the web dashboard.");
        }
    };

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'ACTIVE': return GREEN;
            case 'PENDING': return AMBER;
            case 'SUSPENDED': return RED;
            case 'DRAFT': return SUB;
            default: return SUB;
        }
    };

    const numCols = viewMode === 'grid' ? Math.max(2, Math.floor((width - 40) / 160)) : 1;
    const gridGap = 12;
    const cardWidth = viewMode === 'grid' ? ((width - 40) - (numCols - 1) * gridGap) / numCols : '100%';

    const renderItem = ({ item }: { item: Product }) => {
        const totalStock = item.variants && item.variants.length > 0
            ? item.variants.reduce((acc, v) => acc + (v.stock || 0), 0) : 0;
        const hasLowStock = item.variants && item.variants.length > 0
            ? item.variants.some(v => v.stock <= 5) : false;
        const optScore = calculateOptimizationScore(item).totalScore;
        const isSelected = selectedIds.has(item.uid);

        if (viewMode === 'grid') {
            return (
                <Pressable
                    onLongPress={() => toggleSelection(item.uid)}
                    onPress={() => selectionMode ? toggleSelection(item.uid) : router.push({ pathname: '/seller-dashboard/products/form', params: { id: item.uid } })}
                    style={[styles.gridCard, { width: cardWidth }, isSelected && styles.cardSelected]}
                >
                    {selectionMode && (
                        <View style={styles.gridCheckbox}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </View>
                    )}
                    <View style={styles.gridImageContainer}>
                        <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.gridImage} />
                        <View style={[styles.badgeAbs, { backgroundColor: getStatusColor(item.status) }]}>
                            <Tooltip content={
                                item.status === 'PENDING' ? 'Awaiting admin approval' :
                                    item.status === 'SUSPENDED' ? 'Hidden from shop by admin' :
                                        item.status === 'ACTIVE' ? 'Visible to customers' : 'Currently a draft'
                            }>
                                <Text style={styles.badgeTextAbs}>{item.status || 'LEGACY'}</Text>
                            </Tooltip>
                        </View>
                    </View>
                    <View style={styles.gridInfo}>
                        <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.gridPrice}>₱{Number(item.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>

                        <View style={styles.stockRow}>
                            <View style={styles.stockChip}>
                                <Package size={12} color={SUB} />
                                <Text style={styles.stock}>{totalStock}</Text>
                            </View>
                            {hasLowStock && (
                                <Tooltip content="Low stock (5 or fewer items remaining)">
                                    <View style={styles.lowStockIndicator}>
                                        <AlertTriangle size={12} color="#D97706" />
                                    </View>
                                </Tooltip>
                            )}
                        </View>
                    </View>
                </Pressable>
            );
        }

        if (viewMode === 'compact') {
            return (
                <Pressable
                    onLongPress={() => toggleSelection(item.uid)}
                    onPress={() => selectionMode ? toggleSelection(item.uid) : router.push({ pathname: '/seller-dashboard/products/form', params: { id: item.uid } })}
                    style={[styles.card, { padding: 12, paddingHorizontal: 24, minHeight: 64, marginBottom: 8, borderRadius: 16, alignItems: 'center' }, isSelected && styles.cardSelected]}
                >
                    {selectionMode && (
                        <View style={styles.checkbox}>
                            {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                        </View>
                    )}
                    
                    <View style={[styles.info, { padding: 0, margin: 0, marginLeft: selectionMode ? 0 : 0, flexDirection: 'row', alignItems: 'center', flex: 1 }]}>
                        <View style={styles.colMain}>
                            <Text style={[styles.name, { fontSize: 14, marginBottom: 2 }]} numberOfLines={1}>{item.name}</Text>
                            <Text style={[styles.price, { fontSize: 13, marginBottom: 0 }]}>₱{Number(item.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </View>
                        
                        <View style={styles.colStatus}>
                            <View style={[styles.badgeAbs, { position: 'relative', top: 0, left: 0, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: getStatusColor(item.status), shadowOpacity: 0, elevation: 0, alignSelf: 'flex-start' }]}>
                                <Text style={styles.badgeTextAbs}>{item.status || 'LEGACY'}</Text>
                            </View>
                        </View>

                        <View style={styles.colStock}>
                            <View style={[styles.stockRow, { marginBottom: 0 }]}>
                                <Package size={12} color={SUB} />
                                <Text style={styles.stock}>{totalStock}</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.colOpt, { flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
                            <Activity size={12} color={SUB} />
                            <Text style={[styles.scoreValue, { fontSize: 12, color: optScore > 80 ? GREEN : optScore > 50 ? AMBER : RED }]}>{optScore}%</Text>
                        </View>
                    </View>

                    {!selectionMode && (
                        <View style={[styles.colActions, { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }]}>
                            <TouchableOpacity onPress={() => router.push({ pathname: '/seller-dashboard/products/form', params: { id: item.uid } })} style={[styles.actionBtn, { width: 32, height: 32, backgroundColor: BG }]}>
                                <Edit2 size={14} color={SUB} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.uid)} style={[styles.actionBtn, { width: 32, height: 32, backgroundColor: '#FEE2E2' }]}>
                                <Trash2 size={14} color={RED} />
                            </TouchableOpacity>
                        </View>
                    )}
                </Pressable>
            );
        }

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

                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.image || 'https://via.placeholder.com/150' }} style={styles.image} />
                    <View style={[styles.badgeAbs, { backgroundColor: getStatusColor(item.status) }]}>
                        <Tooltip content={
                            item.status === 'PENDING' ? 'Awaiting admin approval' :
                                item.status === 'SUSPENDED' ? 'Hidden from shop by admin' :
                                    item.status === 'ACTIVE' ? 'Visible to customers' : 'Currently a draft'
                        }>
                            <Text style={styles.badgeTextAbs}>{item.status || 'LEGACY'}</Text>
                        </Tooltip>
                    </View>
                </View>

                <View style={[styles.info, { zIndex: 99, overflow: 'visible' }]}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.price}>₱{Number(item.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>

                    <View style={[styles.stockRow, { zIndex: 99, overflow: 'visible' }]}>
                        <View style={styles.stockChip}>
                            <Package size={12} color={SUB} />
                            <Text style={styles.stock}>{totalStock} in stock</Text>
                        </View>
                        {hasLowStock && (
                            <Tooltip content="Low stock (5 or fewer items remaining)">
                                <View style={styles.lowStockIndicator}>
                                    <AlertTriangle size={12} color="#D97706" />
                                    <Text style={styles.lowStockTxt}>Low</Text>
                                </View>
                            </Tooltip>
                        )}
                    </View>

                    <View style={[styles.scoreRow, { zIndex: 1, overflow: 'visible' }]}>
                        <Tooltip content="Score based on details like image quality, description depth, and stock health.">
                            <Text style={styles.scoreLabel}>Optimization:</Text>
                        </Tooltip>
                        <View style={styles.scoreBarBg}>
                            <View style={[styles.scoreBarFill, { width: `${optScore}%`, backgroundColor: optScore > 80 ? GREEN : optScore > 50 ? AMBER : RED }]} />
                        </View>
                        <Text style={[styles.scoreValue, { color: optScore > 80 ? GREEN : optScore > 50 ? AMBER : RED }]}>{optScore}%</Text>
                    </View>
                </View>

                {!selectionMode && (
                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => router.push({ pathname: '/seller-dashboard/products/form', params: { id: item.uid } })} style={[styles.actionBtn, { backgroundColor: BG }]}>
                            <Edit2 size={16} color={SUB} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.uid)} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                            <Trash2 size={16} color={RED} />
                        </TouchableOpacity>
                    </View>
                )}
            </Pressable>
        );
    };

    const hasPendingProducts = products.some(p => p.status === 'PENDING');

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Products</Text>
                        <Text style={styles.dateTxt}>Manage your catalog, inventory, and product listings.</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.exportBtn} onPress={exportToCSV}>
                            <Download size={18} color={TEXT} />
                            {isDesktop && <Text style={styles.exportBtnText}>Export CSV</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/seller-dashboard/products/form')}>
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.addBtnText}>Add Product</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={{ paddingHorizontal: 24, paddingTop: 24, flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <FlatList
                    data={products}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.uid.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    key={viewMode === 'grid' ? `grid-${numCols}` : 'list'} // Force re-render on width change
                    numColumns={numCols}
                    columnWrapperStyle={viewMode === 'grid' ? { gap: gridGap } : undefined}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(true); }} tintColor={P} colors={[P]} />
                    }
                    ListHeaderComponent={
                        <>
                            {/* Stat Bar */}
                            <View style={[styles.statRow, { flexDirection: isDesktop ? 'row' : 'row', flexWrap: isDesktop ? 'nowrap' : 'wrap', zIndex: 10 }]}>
                                <StatCard
                                    label="Total Products" value={String(stats?.totalProducts ?? 0)}
                                    icon={<Package size={20} color={P} />} color={P} isLoading={!stats}
                                    tooltip="Total number of products in your catalog"
                                />
                                <StatCard
                                    label="Avg. Optimization" value={`${stats?.avgOptimizationScore ?? 0}%`}
                                    icon={<Activity size={20} color={GREEN} />} color={GREEN} isLoading={!stats}
                                    tooltip="Average optimization score across all your products"
                                />
                                <StatCard
                                    label="Low Stock Items" value={String(stats?.lowStockCount ?? 0)}
                                    icon={<AlertTriangle size={20} color={AMBER} />} color={AMBER} isLoading={!stats}
                                    tooltip="Products with 5 or fewer items remaining in stock"
                                />
                                <StatCard
                                    label="Pending Approval" value={String(stats?.pendingCount ?? 0)}
                                    icon={<ClipboardList size={20} color={INDIGO} />} color={INDIGO} isLoading={!stats}
                                    tooltip="Products currently under review by an administrator"
                                />
                            </View>

                            {/* Navigation & Filters Row */}
                            <View style={styles.filterBar}>
                                {/* Search */}
                                <View style={styles.searchContainer}>
                                    <Search size={18} color={SUB} style={styles.searchIcon} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Search products or SKUs..."
                                        placeholderTextColor={SUB}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>
                            </View>

                            {/* Status Tabs & Filters Dropdown */}
                            <View style={[styles.secondaryFilterBar, { justifyContent: 'space-between', zIndex: 100 }]}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
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
                                </ScrollView>

                                <View style={styles.controlsRight}>
                                    {/* Sort Dropdown */}
                                    <DropdownMenu
                                        isOpen={showFilters}
                                        onOpenChange={setShowFilters}
                                        style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
                                        items={SORT_OPTIONS.map(opt => ({
                                            title: opt.label,
                                            icon: <opt.icon size={16} color={sortBy === opt.value ? P : SUB} />,
                                            onPress: () => setSortBy(opt.value),
                                        }))}
                                    >
                                        <Filter size={18} color={showFilters ? P : SUB} />
                                    </DropdownMenu>

                                    {/* View Toggle */}
                                    <View style={styles.viewToggle}>
                                        <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}>
                                            <List size={18} color={viewMode === 'list' ? P : SUB} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setViewMode('grid')} style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}>
                                            <LayoutGrid size={18} color={viewMode === 'grid' ? P : SUB} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setViewMode('compact')} style={[styles.viewBtn, viewMode === 'compact' && styles.viewBtnActive]}>
                                            <AlignJustify size={18} color={viewMode === 'compact' ? P : SUB} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            {/* Info Banner for Pending Products */}
                            {hasPendingProducts && statusFilter !== 'ACTIVE' && (
                                <InfoBox
                                    message='Products with "Pending" status are awaiting admin approval and won&apos;t appear in the public shop yet.'
                                    type="info"
                                    style={{ marginBottom: 16 }}
                                />
                            )}

                            {viewMode === 'compact' && (
                                <View style={styles.listHeaderRow}>
                                    {selectionMode && <View style={{ width: 36 }} />}
                                    <Text style={[styles.listHeaderTxt, styles.colMain]}>Product</Text>
                                    <Text style={[styles.listHeaderTxt, styles.colStatus]}>Status</Text>
                                    <Text style={[styles.listHeaderTxt, styles.colStock]}>Stock</Text>
                                    <Text style={[styles.listHeaderTxt, styles.colOpt]}>Optimization</Text>
                                    {!selectionMode && <Text style={[styles.listHeaderTxt, styles.colActions, { textAlign: 'right' }]}>Actions</Text>}
                                </View>
                            )}

                            {loading && products.length === 0 && (
                                <Animated.View style={{ opacity: pulseAnim, width: '100%', marginTop: 12, flexDirection: viewMode === 'grid' ? 'row' : 'column', flexWrap: 'wrap', gap: viewMode === 'grid' ? gridGap : 0 }}>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <View key={i} style={{ 
                                            height: viewMode === 'grid' ? 250 : (viewMode === 'compact' ? 64 : 120), 
                                            width: viewMode === 'grid' ? cardWidth : '100%',
                                            backgroundColor: '#E2E8F0', 
                                            borderRadius: 12, 
                                            marginBottom: viewMode === 'grid' ? 0 : (viewMode === 'compact' ? 8 : 16) 
                                        }} />
                                    ))}
                                </Animated.View>
                            )}
                            
                            {error ? (
                                <View style={styles.center}>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity onPress={() => loadProducts(true)} style={styles.retryBtn}>
                                        <Text style={{ fontFamily: 'Quicksand', fontWeight: '600' }}>Retry</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : null}
                        </>
                    }
                    ListFooterComponent={
                        loadingMore ? <View style={{ padding: 20 }}><ActivityIndicator size="small" color={SUB} /></View> : null
                    }
                    ListEmptyComponent={
                        !loading && !error ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No products found.</Text>
                                <Text style={styles.emptySubtext}>
                                    Try adjusting your search or filters.
                                </Text>
                            </View>
                        ) : null
                    }
                />

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    dateTxt: { fontSize: 13, color: SUB, marginTop: 4, fontFamily: 'Quicksand' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    addBtnText: { color: '#FFF', fontWeight: '700', marginLeft: 6, fontFamily: 'Quicksand' },
    exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
    exportBtnText: { color: TEXT, fontWeight: '700', marginLeft: 6, fontFamily: 'Quicksand' },
    statRow: { gap: 16, marginBottom: 24, zIndex: 100, overflow: 'visible' },

    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
    searchContainer: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER, height: 44 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Quicksand', color: TEXT, outlineStyle: 'none' as any },
    controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    filterBtn: { padding: 8, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
    filterBtnActive: { backgroundColor: P_LIGHT, borderColor: P },
    viewToggle: { flexDirection: 'row', backgroundColor: BORDER, borderRadius: 12, padding: 4 },
    viewBtn: { padding: 6, borderRadius: 8 },
    viewBtnActive: { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

    secondaryFilterBar: { flexDirection: 'row', marginBottom: 16, alignItems: 'center' },
    tabsScroll: { flexGrow: 0 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    tabActive: { backgroundColor: P_LIGHT, borderColor: P },
    tabText: { fontSize: 13, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' },
    tabTextActive: { color: P },



    listContent: { paddingBottom: 80 },

    card: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 24, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, alignItems: 'center', borderWidth: 1, borderColor: '#F9FAFB', overflow: 'visible', zIndex: 99 },
    imageContainer: { position: 'relative', width: 100, height: 100 },
    image: { width: 100, height: 100, borderRadius: 16, backgroundColor: BG },
    badgeAbs: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    badgeTextAbs: { color: '#FFF', fontSize: 9, fontWeight: '800', fontFamily: 'Quicksand', letterSpacing: 0.5 },
    info: { flex: 1, marginLeft: 20, justifyContent: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6, fontFamily: 'Quicksand' },
    price: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 10, fontFamily: 'Quicksand' },
    stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    stockChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BG, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    stock: { fontSize: 11, color: SUB, fontWeight: '600', fontFamily: 'Quicksand' },
    lowStockIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, gap: 4 },
    lowStockTxt: { fontSize: 10, fontWeight: '700', color: '#D97706', fontFamily: 'Quicksand' },
    actions: { flexDirection: 'column', justifyContent: 'center', gap: 12, paddingLeft: 16, zIndex: 1 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    gridCard: { backgroundColor: CARD, borderRadius: 12, padding: 8, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: '#F9FAFB', overflow: 'visible', zIndex: 99 },
    gridImageContainer: { position: 'relative', width: '100%', aspectRatio: 1, marginBottom: 8, zIndex: 1, overflow: 'visible' },
    gridImage: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: BG },
    gridInfo: { flex: 1, overflow: 'visible', zIndex: 99 },
    gridName: { fontSize: 12, fontWeight: '700', color: TEXT, marginBottom: 2, fontFamily: 'Quicksand', height: 32 },
    gridPrice: { fontSize: 13, fontWeight: '800', color: TEXT, marginBottom: 6, fontFamily: 'Quicksand' },
    gridCheckbox: { position: 'absolute', top: 4, right: 4, zIndex: 10, width: 20, height: 20, borderRadius: 6, backgroundColor: P, alignItems: 'center', justifyContent: 'center' },

    errorText: { color: RED, marginBottom: 10, fontFamily: 'Quicksand' },
    retryBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: BORDER, borderRadius: 12 },
    emptyState: { alignItems: 'center', paddingTop: 50 },
    emptyText: { fontSize: 18, fontWeight: '600', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    emptySubtext: { color: SUB, fontFamily: 'Quicksand' },

    cardSelected: { borderColor: P, borderWidth: 2, backgroundColor: P_LIGHT },
    checkbox: { width: 20, height: 20, borderRadius: 6, backgroundColor: P, marginRight: 16, alignItems: 'center', justifyContent: 'center' },

    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    scoreLabel: { fontSize: 10, color: SUB, marginRight: 6, fontWeight: '600', fontFamily: 'Quicksand' },
    scoreBarBg: { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginRight: 8 },
    scoreBarFill: { height: '100%', borderRadius: 2 },
    scoreValue: { fontSize: 10, fontWeight: '800', fontFamily: 'Quicksand' },

    bulkBar: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10, borderWidth: 1, borderColor: BORDER },
    bulkCount: { fontWeight: 'bold', fontSize: 16, color: TEXT, marginLeft: 8, fontFamily: 'Quicksand' },
    bulkActions: { flexDirection: 'row', gap: 16 },
    bulkBtn: { padding: 5 },

    // Compact Table View
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, marginBottom: 8 },
    listHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    colMain: { flex: 2, paddingRight: 16 },
    colStatus: { width: 100 },
    colStock: { width: 80 },
    colOpt: { width: 100, alignItems: 'center' },
    colActions: { width: 80, alignItems: 'flex-end' }
});
