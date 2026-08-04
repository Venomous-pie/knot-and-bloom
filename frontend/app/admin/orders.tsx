import { adminAPI } from "@/services/api";
import { Stack } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { Animated, RefreshControl, StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { Search, Filter, ShoppingBag, CheckCircle, Clock, AlertTriangle, Truck, Package, XCircle, DollarSign, Users } from 'lucide-react-native';
import StatCard from "@/components/ui/StatCard";

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
const TEAL = '#14B8A6';
const BLUE = '#3B82F6';
const PINK = '#EC4899';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PENDING': return AMBER;
        case 'CONFIRMED': return BLUE;
        case 'IN_PRODUCTION': return INDIGO;
        case 'READY_TO_SHIP': return PINK;
        case 'SHIPPED': return GREEN;
        case 'DELIVERED': return TEAL;
        case 'COMPLETED': return GREEN;
        case 'CANCELLED': return RED;
        case 'DISPUTED': return RED;
        default: return SUB;
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'PENDING': return <Clock size={14} color={AMBER} />;
        case 'CONFIRMED': return <CheckCircle size={14} color={BLUE} />;
        case 'IN_PRODUCTION': return <Package size={14} color={INDIGO} />;
        case 'READY_TO_SHIP': return <Package size={14} color={PINK} />;
        case 'SHIPPED': return <Truck size={14} color={GREEN} />;
        case 'DELIVERED': return <CheckCircle size={14} color={TEAL} />;
        case 'COMPLETED': return <CheckCircle size={14} color={GREEN} />;
        case 'CANCELLED': return <XCircle size={14} color={RED} />;
        case 'DISPUTED': return <AlertTriangle size={14} color={RED} />;
        default: return <Clock size={14} color={SUB} />;
    }
};

export default function AdminOrders() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const loadOrders = async () => {
        try {
            const res = await adminAPI.getOrders({ limit: 100 });
            setOrders(res.data.orders);
        } catch (error) {
            console.error("Failed to load admin orders:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    // Animation for skeleton
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (loading && !refreshing && orders.length === 0) {
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            );
            anim.start();
        } else {
            pulseAnim.setValue(1);
        }
        return () => anim?.stop();
    }, [loading, refreshing, orders.length]);

    const renderSkeletonRow = (key: number) => (
        <Animated.View key={key} style={[s.compactRow, { opacity: pulseAnim }]}>
            <View style={{ flex: 1 }}><View style={[s.skeletonBar, { width: '60%' }]} /></View>
            <View style={{ flex: 1 }}><View style={[s.skeletonBar, { width: '80%' }]} /></View>
            <View style={{ flex: 1, alignItems: 'center' }}><View style={[s.skeletonBar, { width: '70%' }]} /></View>
            <View style={{ flex: 1, alignItems: 'center' }}><View style={[s.skeletonBar, { width: '80%' }]} /></View>
            <View style={{ flex: 1, alignItems: 'center' }}><View style={[s.skeletonBar, { width: '90%' }]} /></View>
            <View style={{ flex: 1, alignItems: 'center' }}><View style={[s.skeletonBar, { width: '50%' }]} /></View>
        </Animated.View>
    );

    const renderCompactRow = (o: any) => {
        const orderDate = new Date(o.uploaded).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        const customerName = o.customer?.name || 'Unknown';
        const sellerName = o.seller?.storeName || 'Unknown';
        const total = Number(o.total || o.subtotal);
        const platformFee = Number(o.platformFee || (total * 0.12));

        return (
            <View style={s.compactRow} key={o.uid}>
                {/* ID & Date */}
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={s.compactTitle} numberOfLines={1}>#{o.referenceNumber || o.uid}</Text>
                    <Text style={s.compactSub}>{orderDate}</Text>
                </View>

                {/* Seller */}
                <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                    <Text style={[s.compactValue, { fontWeight: '400' }]} numberOfLines={1}>{sellerName}</Text>
                </View>

                {/* Customer */}
                <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[s.compactValue, { fontWeight: '400' }]} numberOfLines={1}>{customerName}</Text>
                </View>

                {/* Status */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={[s.compactBadge, { backgroundColor: getStatusColor(o.status) + '15' }]}>
                        {getStatusIcon(o.status)}
                        <Text style={[s.compactBadgeText, { color: getStatusColor(o.status) }]}>{o.status.replace(/_/g, ' ')}</Text>
                    </View>
                </View>

                {/* Platform Earnings */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[s.compactTitle, { color: GREEN }]}>+₱{platformFee.toFixed(2)}</Text>
                </View>
                
                {/* Total */}
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={s.compactTitle}>₱{total.toFixed(2)}</Text>
                </View>
            </View>
        );
    };

    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'IN_PRODUCTION' || o.status === 'READY_TO_SHIP').length;
    const totalEarnings = orders.reduce((sum, o) => {
        if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
            return sum + Number(o.platformFee || (Number(o.total || o.subtotal) * 0.12));
        }
        return sum;
    }, 0);
    const formatCurrency = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const filteredOrders = orders.filter(o => {
        let matchesStatus = true;
        if (statusFilter === 'PENDING') matchesStatus = o.status === 'PENDING';
        if (statusFilter === 'ACTIVE') matchesStatus = ['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(o.status);
        if (statusFilter === 'COMPLETED') matchesStatus = ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(o.status);
        
        let matchesSearch = true;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            matchesSearch = 
                String(o.uid).includes(q) || 
                String(o.referenceNumber || '').includes(q) ||
                (o.customer?.name || '').toLowerCase().includes(q) || 
                (o.seller?.storeName || '').toLowerCase().includes(q);
        }
        return matchesStatus && matchesSearch;
    });

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: 'Platform Orders', headerShown: false }} />
            
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Platform Orders</Text>
                        <Text style={s.subtitle}>Monitor transactions and platform earnings</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 52 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[P]} tintColor={P} />}
                >
                    {/* Stat Cards */}
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                        <StatCard
                            label="Total Orders" value={String(totalOrders)}
                            icon={<ShoppingBag size={20} color={INDIGO} />} color={INDIGO} isLoading={loading}
                            tooltip="Total number of orders across all sellers"
                        />
                        <StatCard
                            label="Active Orders" value={String(activeOrders)}
                            icon={<Clock size={20} color={AMBER} />} color={AMBER} isLoading={loading}
                            tooltip="Orders currently in progress (Pending, Confirmed, In Production, etc.)"
                        />
                        <StatCard
                            label="Platform Earnings" value={formatCurrency(totalEarnings)}
                            icon={<DollarSign size={20} color={GREEN} />} color={GREEN} isLoading={loading}
                            tooltip="Realized 12% commission from completed & delivered orders"
                        />
                    </View>

                    {/* Search and Filters */}
                    <View style={s.filterBar}>
                        <View style={s.searchContainer}>
                            <Search size={18} color={SUB} style={s.searchIcon} />
                            <TextInput
                                style={s.searchInput}
                                placeholder="Search orders..."
                                placeholderTextColor={SUB}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={s.filterBarContainer}>
                        <View style={s.tabsContainer}>
                            {['ALL', 'PENDING', 'ACTIVE', 'COMPLETED'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    onPress={() => setStatusFilter(tab)}
                                    style={[s.tab, statusFilter === tab && s.tabActive]}
                                >
                                    <Text style={[s.tabText, statusFilter === tab && s.tabTextActive]}>
                                        {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* List Items / Table */}
                    <View style={s.listWrapper}>
                        <View style={s.listHeaderRow}>
                            <View style={{ flex: 1 }}><Text style={s.listHeaderTxt}>Order ID</Text></View>
                            <View style={{ flex: 1 }}><Text style={s.listHeaderTxt}>Seller</Text></View>
                            <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.listHeaderTxt}>Customer</Text></View>
                            <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.listHeaderTxt}>Status</Text></View>
                            <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.listHeaderTxt}>Est. Earnings</Text></View>
                            <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.listHeaderTxt}>Total</Text></View>
                        </View>

                        {loading && !refreshing && orders.length === 0 ? (
                            <View>
                                {[1, 2, 3, 4, 5].map(renderSkeletonRow)}
                            </View>
                        ) : filteredOrders.length === 0 ? (
                            <View style={s.emptyState}>
                                <ShoppingBag size={48} color={BORDER} />
                                <Text style={s.emptyTitle}>No Orders Found</Text>
                                <Text style={s.emptySub}>No orders match your current filters or search query.</Text>
                            </View>
                        ) : (
                            <View style={{ paddingBottom: 8 }}>
                                {filteredOrders.map(renderCompactRow)}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    headerContainer: {
        backgroundColor: CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 13,
        color: SUB,
        fontFamily: 'Quicksand',
        marginTop: 4,
    },
    skeletonBar: {
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        height: 16,
    },
    // Filters & Search
    filterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: TEXT,
        fontFamily: 'Quicksand',
        outlineStyle: 'none',
    } as any,
    filterBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
    },
    tabActive: {
        backgroundColor: P_LIGHT,
        borderColor: P_LIGHT,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: SUB,
        fontFamily: 'Quicksand',
    },
    tabTextActive: {
        color: P,
    },
    // Table
    listWrapper: {
        backgroundColor: 'transparent',
    },
    listHeaderRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        backgroundColor: BG,
    },
    listHeaderTxt: {
        fontSize: 12,
        fontWeight: '700',
        color: SUB,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontFamily: 'Quicksand',
    },
    compactRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        alignItems: 'center',
    },
    compactTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    compactSub: {
        fontSize: 12,
        color: SUB,
        fontFamily: 'Quicksand',
        marginTop: 2,
    },
    compactValue: {
        fontSize: 13,
        fontWeight: '500',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    compactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'center',
        gap: 6,
    },
    compactBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        color: SUB,
        fontFamily: 'Quicksand',
        marginTop: 8,
        textAlign: 'center',
    },
});
