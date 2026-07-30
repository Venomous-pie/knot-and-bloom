import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    ActivityIndicator, useWindowDimensions, TouchableOpacity, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI } from '@/api/api';
import { BarChart } from 'react-native-gifted-charts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Calendar, Package } from 'lucide-react-native';
import StatCard from '../../components/ui/StatCard';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

interface DashStats {
    quickStats: {
        thisMonthSales: number;
        thisMonthOrders: number;
        thisMonthEarnings: number;
        lastMonthSales: number;
    };
    performanceGraph: Array<{ date: string; sales: number }>;
}

export default function SalesTrendsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const [stats, setStats] = useState<DashStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');

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

    useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchStats = async () => {
        try {
            const data = await sellerAPI.getDashboardStats();
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtK = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n.toFixed(0)}`;

    const graph = stats?.performanceGraph || [];
    const delta = (stats?.quickStats.thisMonthSales ?? 0) - (stats?.quickStats.lastMonthSales ?? 0);
    const trend: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;

    const CHART_W = isDesktop
        ? Math.min(width - 260, 1280) * 0.6 - 80
        : Math.min(width - 80, 340);

    const barData = graph.map((d, i) => {
        const isToday = i === graph.length - 1;
        return {
            value: d.sales,
            label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
            frontColor: isToday ? P : P + '70',
            gradientColor: isToday ? P + 'CC' : P + '30',
            topLabelComponent: d.sales > 0
                ? () => <Text style={{ color: P, fontSize: 8, fontWeight: '700', marginBottom: 2 }}>{fmtK(d.sales)}</Text>
                : undefined,
        };
    });

    const peakDay = graph.reduce((best, d) => d.sales > (best?.sales ?? 0) ? d : best, graph[0]);
    const totalWeek = graph.reduce((s, d) => s + d.sales, 0);

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Sales Trends</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Analyze your store's sales performance over time.</Text>
                    </View>
                    {/* Period Toggle */}
                    <View style={s.toggleRow}>
                        {(['7d', '30d'] as const).map(p => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => setPeriod(p)}
                                style={[s.toggleBtn, period === p && s.toggleBtnActive]}
                            >
                                <Text style={[s.toggleTxt, period === p && s.toggleTxtActive]}>
                                    {p === '7d' ? 'Last 7 Days' : 'This Month'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} colors={[P]} tintColor={P} />
                    }
                >
                    {/* Stat Cards */}
                    {/* Stat Cards */}
                    <View style={[s.statRow, isDesktop && { flexDirection: 'row', flexWrap: 'nowrap', zIndex: 100, overflow: 'visible' }]}>
                        <StatCard
                            label="This Month's Sales"
                            value={fmtK(stats?.quickStats.thisMonthSales ?? 0)}
                            icon={<DollarSign size={18} color={P} />}
                            color={P}
                            trend={trend}
                            sub={delta !== 0
                                ? `${delta >= 0 ? '+' : ''}${fmtK(Math.abs(delta))} vs last month`
                                : 'Same as last month'}
                            tooltip="Total gross sales revenue for this month."
                            isLoading={loading && !stats}
                        />
                        <StatCard
                            label="Orders This Month"
                            value={String(stats?.quickStats.thisMonthOrders ?? 0)}
                            icon={<ShoppingBag size={18} color={INDIGO} />}
                            color={INDIGO}
                            sub="Total placed"
                            tooltip="Number of orders placed this month."
                            isLoading={loading && !stats}
                        />
                        <StatCard
                            label="Net Earnings"
                            value={fmtK(stats?.quickStats.thisMonthEarnings ?? 0)}
                            icon={<TrendingUp size={18} color={TEAL} />}
                            color={TEAL}
                            sub="After platform fees"
                            tooltip="Your net earnings this month after Knot & Bloom platform fees are deducted."
                            isLoading={loading && !stats}
                        />
                    </View>

                    {/* Main Chart */}
                    <View style={s.card}>
                        <View style={s.cardHead}>
                            <Text style={s.cardTitle}>Daily Revenue</Text>
                            <View style={[s.chip, { backgroundColor: P_LIGHT }]}>
                                <Calendar size={11} color={P} />
                                <Text style={[s.chipTxt, { color: P }]}>Last 7 Days</Text>
                            </View>
                        </View>
                        <View style={{ marginTop: 16, marginLeft: -8 }}>
                            {loading && !stats ? (
                                <Animated.View style={{ opacity: pulseAnim, width: CHART_W, height: 180, backgroundColor: '#E2E8F0', borderRadius: 12, marginVertical: 12 }} />
                            ) : (
                                <BarChart
                                    data={barData}
                                    width={CHART_W}
                                    height={180}
                                    barWidth={28}
                                    spacing={isDesktop ? Math.max(12, (CHART_W - (7 * 28)) / 7) : 12}
                                    roundedTop
                                    hideRules={false}
                                    rulesColor={BORDER}
                                    rulesType="solid"
                                    noOfSections={4}
                                    yAxisThickness={0}
                                    xAxisThickness={1}
                                    xAxisColor={BORDER}
                                    yAxisTextStyle={{ color: SUB, fontSize: 9 }}
                                    xAxisLabelTextStyle={{ color: SUB, fontSize: 9 }}
                                    showGradient
                                    gradientColor={P + '30'}
                                    isAnimated
                                    animationDuration={600}
                                />
                            )}
                        </View>
                    </View>

                    {/* Insights Cards */}
                    <View style={[{ gap: 16 }, isDesktop && { flexDirection: 'row' }]}>
                        {/* Peak Day */}
                        <View style={[s.card, { marginBottom: 0, flex: isDesktop ? 1 : undefined }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={20} color={TEXT} />
                                <Text style={s.cardTitle}>Peak Day</Text>
                            </View>
                            {loading && !stats ? (
                                <Animated.View style={{ opacity: pulseAnim, width: 120, height: 40, backgroundColor: '#E2E8F0', borderRadius: 8, marginTop: 12 }} />
                            ) : peakDay && peakDay.sales > 0 ? (
                                <>
                                    <Text style={{ fontSize: 28, fontWeight: '800', color: P, fontFamily: 'Quicksand', marginTop: 12 }}>
                                        {fmtK(peakDay.sales)}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 }}>
                                        {new Date(peakDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </Text>
                                </>
                            ) : (
                                <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', marginTop: 12 }}>
                                    No sales data yet.
                                </Text>
                            )}
                        </View>

                        {/* Weekly Total */}
                        <View style={[s.card, { marginBottom: 0, flex: isDesktop ? 1 : undefined, marginTop: isDesktop ? 0 : 16 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Package size={20} color={TEXT} />
                                <Text style={s.cardTitle}>7-Day Total</Text>
                            </View>
                            {loading && !stats ? (
                                <Animated.View style={{ opacity: pulseAnim, width: 120, height: 40, backgroundColor: '#E2E8F0', borderRadius: 8, marginTop: 12 }} />
                            ) : (
                                <>
                                    <Text style={{ fontSize: 28, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand', marginTop: 12 }}>
                                        {fmtK(totalWeek)}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 }}>
                                        Combined revenue this week
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root:            { flex: 1, backgroundColor: BG },
    scroll:          { padding: 20, paddingBottom: 52 },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title:           { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    toggleRow:       { flexDirection: 'row', gap: 4, backgroundColor: BG, borderRadius: 20, padding: 4 },
    toggleBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    toggleBtnActive: { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    toggleTxt:       { fontSize: 12, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' },
    toggleTxtActive: { color: P },
    statRow:         { gap: 16, marginBottom: 24, zIndex: 100, overflow: 'visible' },
    card:            { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    cardHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle:       { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    chip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    chipTxt:         { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand' },
});
