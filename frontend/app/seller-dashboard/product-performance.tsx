import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    ActivityIndicator, Image, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI, sellerProductsAPI } from '@/api/api';
import { Package, TrendingUp, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react-native';
import StatCard from '../../components/ui/StatCard';

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

interface ProductRow {
    id: number;
    name: string;
    image: string | null;
    status: string;
    stock: number;     // total stock across variants
    soldCount: number;
    revenue: number;
}

function StockBadge({ stock }: { stock: number }) {
    if (stock === 0) return (
        <View style={[s.badge, { backgroundColor: RED + '15' }]}>
            <AlertTriangle size={11} color={RED} />
            <Text style={[s.badgeTxt, { color: RED }]}>Out of Stock</Text>
        </View>
    );
    if (stock < 5) return (
        <View style={[s.badge, { backgroundColor: AMBER + '15' }]}>
            <AlertTriangle size={11} color={AMBER} />
            <Text style={[s.badgeTxt, { color: AMBER }]}>Low Stock ({stock})</Text>
        </View>
    );
    return (
        <View style={[s.badge, { backgroundColor: GREEN + '15' }]}>
            <CheckCircle size={11} color={GREEN} />
            <Text style={[s.badgeTxt, { color: GREEN }]}>{stock} in stock</Text>
        </View>
    );
}

function RevenueBar({ revenue, maxRevenue }: { revenue: number; maxRevenue: number }) {
    const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
    return (
        <View style={{ marginTop: 8 }}>
            <View style={{ height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: P, borderRadius: 3 }} />
            </View>
        </View>
    );
}

export default function ProductPerformancePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            const [productsRes, statsRes] = await Promise.all([
                sellerProductsAPI.getMyProducts({ limit: 50 }),
                sellerAPI.getDashboardStats(),
            ]);

            // Build revenue map from topProducts
            const revenueMap: Record<number, number> = {};
            (statsRes.topProducts || []).forEach((tp: { id: number; revenue: number }) => {
                revenueMap[tp.id] = tp.revenue;
            });

            const rows: ProductRow[] = (productsRes.products || []).map((p: any) => {
                const totalStock = (p.variants && p.variants.length > 0)
                    ? p.variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
                    : (p.stock || 0);
                return {
                    id: p.uid,
                    name: p.name,
                    image: p.image || null,
                    status: p.status,
                    stock: totalStock,
                    soldCount: p.soldCount || 0,
                    revenue: revenueMap[p.uid] || 0,
                };
            });

            // Sort by revenue desc, then sold count
            rows.sort((a, b) => b.revenue - a.revenue || b.soldCount - a.soldCount);
            setProducts(rows);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={P} />
        </View>
    );

    const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const maxRevenue = products.reduce((m, p) => Math.max(m, p.revenue), 0);
    const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
    const totalSold = products.reduce((s, p) => s + p.soldCount, 0);
    const lowStockCount = products.filter(p => p.stock < 5).length;

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Product Performance</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                    </View>
                    <View style={s.chip}>
                        <BarChart2 size={13} color={SUB} />
                        <Text style={s.chipTxt}>{products.length} products</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[P]} tintColor={P} />
                    }
                >
                    {/* Summary Stats */}
                    <View style={[s.statRow, isDesktop && { flexDirection: 'row', flexWrap: 'nowrap', zIndex: 100, overflow: 'visible' }]}>
                        <StatCard
                            label="Total Revenue"
                            value={fmt(totalRevenue)}
                            icon={<TrendingUp size={18} color={P} />}
                            color={P}
                            sub="All completed orders"
                        />
                        <StatCard
                            label="Units Sold"
                            value={String(totalSold)}
                            icon={<Package size={18} color={INDIGO} />}
                            color={INDIGO}
                            sub="All time"
                        />
                        <StatCard
                            label="Low Stock Items"
                            value={String(lowStockCount)}
                            icon={lowStockCount > 0 ? <AlertTriangle size={18} color={AMBER} /> : <CheckCircle size={18} color={GREEN} />}
                            color={lowStockCount > 0 ? AMBER : GREEN}
                            sub="Under 5 units remaining"
                        />
                    </View>

                    {/* Product Table */}
                    <View style={s.card}>
                        <View style={s.cardHead}>
                            <Text style={s.cardTitle}>Products by Revenue</Text>
                            <Text style={s.cardSub}>Sorted by earnings</Text>
                        </View>

                        {products.length === 0 ? (
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 }}>
                                No products yet.
                            </Text>
                        ) : (
                            products.map((p, i) => (
                                <View key={p.id} style={[s.productRow, i === products.length - 1 && { borderBottomWidth: 0 }]}>
                                    {/* Rank */}
                                    <View style={[s.rankBadge, i === 0 && { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={[s.rankTxt, i === 0 && { color: '#D97706' }]}>#{i + 1}</Text>
                                    </View>

                                    {/* Image */}
                                    {p.image ? (
                                        <Image source={{ uri: p.image }} style={s.productImg} />
                                    ) : (
                                        <View style={s.productImgPlaceholder}><Package size={18} color={SUB} /></View>
                                    )}

                                    {/* Info */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                            <StockBadge stock={p.stock} />
                                            <Text style={{ fontSize: 12, color: SUB, fontFamily: 'Quicksand' }}>
                                                {p.soldCount} sold
                                            </Text>
                                        </View>
                                        {p.revenue > 0 && (
                                            <RevenueBar revenue={p.revenue} maxRevenue={maxRevenue} />
                                        )}
                                    </View>

                                    {/* Revenue */}
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={s.revenueVal}>{p.revenue > 0 ? fmt(p.revenue) : '—'}</Text>
                                        <Text style={{ fontSize: 11, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>revenue</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root:               { flex: 1, backgroundColor: BG },
    scroll:             { padding: 20, paddingBottom: 52 },
    headerContainer:    { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title:              { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    chip:               { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: BG },
    chipTxt:            { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand', color: SUB },
    statRow:            { gap: 16, marginBottom: 24, zIndex: 100, overflow: 'visible' },
    card:               { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    cardHead:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    cardTitle:          { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    cardSub:            { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    productRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
    rankBadge:          { width: 28, height: 28, borderRadius: 8, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    rankTxt:            { fontSize: 11, fontWeight: '700', color: SUB, fontFamily: 'Quicksand' },
    productImg:         { width: 52, height: 52, borderRadius: 12, backgroundColor: BG },
    productImgPlaceholder: { width: 52, height: 52, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    productName:        { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    revenueVal:         { fontSize: 15, fontWeight: '700', color: P, fontFamily: 'Quicksand' },
    badge:              { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeTxt:           { fontSize: 11, fontWeight: '600', fontFamily: 'Quicksand' },
});
