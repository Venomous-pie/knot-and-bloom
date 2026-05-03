import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated, Pressable,
    useWindowDimensions, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { sellerAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart } from 'react-native-gifted-charts';
import {
    Package, ShoppingBag, DollarSign, Bell, RefreshCw,
    TrendingUp, TrendingDown, Star, CheckCircle, Clock, XCircle, Settings
} from 'lucide-react-native';
import Tooltip from '../../shared/Tooltip';

// ─── Tokens ───────────────────────────────────────────────────────────────────
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

interface DashboardStats {
    performanceSnapshot: {
        todayRevenue: number;
        todayOrders: number;
        todayVisitors: number;
        pendingActions: number;
    };
    quickStats: {
        thisMonthSales: number;
        thisMonthOrders: number;
        thisMonthEarnings: number;
        lastMonthSales: number;
        totalOrders: { PENDING: number; PROCESSING: number; COMPLETED: number; CANCELLED: number };
        conversionRate: number;
    };
    performanceGraph: Array<{ date: string; sales: number }>;
    topProducts: Array<{ id: number; name: string; image: string | null; revenue: number }>;
    recentReviews: Array<{ id: number; customerName: string; rating: number; comment: string; date: string }>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub, trend, tooltip }: {
    label: string; value: string; icon: React.ReactNode;
    color: string; sub?: string; trend?: 'up' | 'down' | null; tooltip?: string;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    return (
        <View style={{ flex: 1, minWidth: 140, zIndex: 99, overflow: 'visible' }}>
            <Pressable onPress={() => {
                Animated.sequence([
                    Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }),
                    Animated.timing(scale, { toValue: 1,    duration: 70, useNativeDriver: true }),
                ]).start();
            }} style={{ zIndex: 99, overflow: 'visible' }}>
                <View style={{ position: 'relative', zIndex: 99, overflow: 'visible' }}>
                    <Animated.View style={[s.statCard, { transform: [{ scale }] }]}>
                        <View style={s.statCardHeader}>
                            <View style={[s.statIcon, { backgroundColor: color + '18' }]}>{icon}</View>
                            {tooltip && <Tooltip content={tooltip} iconColor={P} iconSize={18} position="right" />}
                        </View>
                        <Text style={s.statVal}>{value}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'nowrap' }}>
                            <Text style={[s.statLbl, { marginTop: 0, lineHeight: 20 }]}>{label}</Text>
                            {trend && (
                                <View style={[s.trendBadge, { backgroundColor: trend === 'up' ? '#DCFCE7' : '#FEE2E2' }]}>
                                    {trend === 'up'   && <TrendingUp   size={10} color={GREEN} />}
                                    {trend === 'down' && <TrendingDown size={10} color={RED}   />}
                                </View>
                            )}
                        </View>
                        {sub && <Text style={[s.statSub, { marginTop: 4 }]}>{sub}</Text>}
                    </Animated.View>
                </View>
            </Pressable>
        </View>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SellerDashboardHome() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const [stats, setStats]         = useState<DashboardStats | null>(null);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    React.useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchStats = async () => {
        try { setStats(await sellerAPI.getDashboardStats()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { fetchStats(); }, []);

    const fmt  = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtK = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n.toFixed(0)}`;

    if (loading) return <View style={s.center}><ActivityIndicator size="large" color={P} /></View>;
    if (!stats) return (
        <View style={s.center}>
            <RefreshCw size={32} color={SUB} />
            <TouchableOpacity style={s.retryBtn} onPress={fetchStats}>
                <Text style={s.retryTxt}>Try again</Text>
            </TouchableOpacity>
        </View>
    );

    const isDesktop = width >= 1024;
    
    // Calculate dynamic chart width.
    const CHART_W = isDesktop 
        ? ((Math.min(width - 260, 1280) * 0.65) - 80)
        : Math.min(width - 80, 340);

    const barData = stats.performanceGraph.map((d, i) => {
        const isToday = i === stats.performanceGraph.length - 1;
        return {
            value: d.sales,
            label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
            frontColor:    isToday ? P : P + '70',
            gradientColor: isToday ? P + 'CC' : P + '30',
            topLabelComponent: d.sales > 0
                ? () => <Text style={{ color: P, fontSize: 8, fontWeight: '700', marginBottom: 2 }}>{fmtK(d.sales)}</Text>
                : undefined,
        };
    });

    const delta = stats.quickStats.thisMonthSales - stats.quickStats.lastMonthSales;
    const trend: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;
    const { PENDING, PROCESSING, COMPLETED, CANCELLED } = stats.quickStats.totalOrders;

    // --- Components ---

    const HeaderComponent = (
        <View style={s.header}>
            <View style={{ flex: 1 }}>
                <Text style={s.greeting} numberOfLines={1}>{user?.sellerStoreName ?? 'Seller Dashboard'}</Text>
                <Text style={s.dateTxt}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/seller-dashboard/notifications' as any)}>
                <Bell size={19} color={TEXT} />
                {stats.performanceSnapshot.pendingActions > 0 && <View style={s.bellDot} />}
            </TouchableOpacity>
        </View>
    );

    const StatsBar = (
        <View style={[s.statRow, { flexDirection: isDesktop ? 'row' : 'row', flexWrap: isDesktop ? 'nowrap' : 'wrap', zIndex: 100, overflow: 'visible' }]}>
            <StatCard
                label="Total Revenue" value={fmtK(stats.quickStats.thisMonthSales)}
                icon={<DollarSign size={17} color={P} />} color={P}
                sub={delta !== 0 ? `${delta >= 0 ? '+' : ''}${fmtK(Math.abs(delta))} vs last month` : 'Same as last month'}
                trend={trend}
                tooltip="Total sales revenue generated from your store this month."
            />
            <StatCard
                label="Orders" value={String(stats.quickStats.thisMonthOrders)}
                icon={<ShoppingBag size={17} color={INDIGO} />} color={INDIGO}
                sub="This month"
                tooltip="Total number of orders placed in your store this month."
            />
            <StatCard
                label="Completed" value={String(COMPLETED)}
                icon={<Package size={17} color={GREEN} />} color={GREEN}
                sub="All time"
                tooltip="Orders that have been fully delivered and confirmed by the customer."
            />
            <StatCard
                label="Earnings" value={fmtK(stats.quickStats.thisMonthEarnings)}
                icon={<DollarSign size={17} color={TEAL} />} color={TEAL}
                sub="After platform fees"
                tooltip="Your net earnings this month after Knot & Bloom platform fees are deducted."
            />
        </View>
    );

    const BarChartCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Revenue — Last 7 Days</Text>
                <View style={[s.chip, { backgroundColor: P_LIGHT }]}>
                    <Text style={[s.chipTxt, { color: P }]}>Daily</Text>
                </View>
            </View>
            <View style={{ marginTop: 12, marginLeft: -8, alignItems: isDesktop ? 'center' : 'flex-start' }}>
                <BarChart
                    data={barData}
                    width={CHART_W}
                    height={150}
                    barWidth={28}
                    spacing={isDesktop ? Math.max(12, (CHART_W - (7 * 28)) / 7) : 12}
                    roundedTop
                    hideRules={false}
                    rulesColor={BORDER}
                    rulesType="solid"
                    noOfSections={3}
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
            </View>
        </View>
    );

    const PipelineCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Order Pipeline</Text>
                <TouchableOpacity onPress={() => router.push('/seller-dashboard/orders' as any)}>
                    <Text style={s.linkTxt}>View All</Text>
                </TouchableOpacity>
            </View>
            <View style={s.pipelineContainer}>
                {[
                    { label: 'Pending', count: PENDING, icon: Clock, color: AMBER, tip: 'Orders awaiting your confirmation.' },
                    { label: 'Processing', count: PROCESSING, icon: Settings, color: INDIGO, tip: 'Orders currently being prepared or shipped.' },
                    { label: 'Completed', count: COMPLETED, icon: CheckCircle, color: GREEN, tip: 'Successfully delivered orders.' },
                    { label: 'Cancelled', count: CANCELLED, icon: XCircle, color: RED, tip: 'Orders cancelled by you or the customer.' },
                ].map((step, idx, arr) => (
                    <React.Fragment key={step.label}>
                        <View style={s.pipelineStep}>
                            <Tooltip content={step.tip}>
                                <View style={[s.pipelineIcon, { backgroundColor: step.color + '15' }]}>
                                    <step.icon size={20} color={step.color} />
                                </View>
                            </Tooltip>
                            <Text style={s.pipelineCount}>{step.count}</Text>
                            <Text style={s.pipelineLabel}>{step.label}</Text>
                        </View>
                        {idx < arr.length - 1 && (
                            <View style={s.pipelineDivider} />
                        )}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    const TopProductsCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Top Performing</Text>
                <Text style={s.cardSub}>By revenue</Text>
            </View>
            <View style={{ marginTop: 16, gap: 16 }}>
                {stats.topProducts.length > 0 ? stats.topProducts.map((p, i) => (
                    <View key={p.id} style={s.productRow}>
                        {p.image ? (
                            <Image source={{ uri: p.image }} style={s.productImg} />
                        ) : (
                            <View style={s.productImgPlaceholder}><Package size={16} color={SUB} /></View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                            <Text style={s.productRev}>Generated {fmt(p.revenue)}</Text>
                        </View>
                        <View style={[s.rankBadge, i === 0 && { backgroundColor: '#FEF3C7' }]}>
                            <Text style={[s.rankTxt, i === 0 && { color: '#D97706' }]}>#{i + 1}</Text>
                        </View>
                    </View>
                )) : (
                    <Text style={s.emptyTxt}>No sales data yet.</Text>
                )}
            </View>
        </View>
    );

    const RecentReviewsCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Recent Reviews</Text>
                <Text style={s.cardSub}>Last 30 days</Text>
            </View>
            <View style={{ marginTop: 16, gap: 16 }}>
                {stats.recentReviews.length > 0 ? stats.recentReviews.map((r) => (
                    <View key={r.id} style={s.reviewRow}>
                        <View style={s.reviewHead}>
                            <Text style={s.reviewerName}>{r.customerName}</Text>
                            <View style={s.starsRow}>
                                {[1, 2, 3, 4, 5].map((sVal) => (
                                    <Star key={sVal} size={12} fill={sVal <= r.rating ? '#F59E0B' : '#E5E7EB'} color={sVal <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                                ))}
                            </View>
                        </View>
                        <Text style={s.reviewComment}>{r.comment}</Text>
                        <Text style={s.reviewDate}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                )) : (
                    <Text style={s.emptyTxt}>No reviews yet.</Text>
                )}
            </View>
        </View>
    );

    return (
        <View style={s.root}>
            <View style={s.headerContainer}>
                {HeaderComponent}
            </View>
            <ScrollView
                style={s.root} contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} colors={[P]} tintColor={P} />
                }
            >
                <View style={isDesktop ? s.desktopContainer : undefined}>
                    
                    {StatsBar}

                {isDesktop ? (
                    <View style={s.desktopGrid}>
                        <View style={s.desktopLeft}>
                            {BarChartCard}
                            {TopProductsCard}
                        </View>
                        <View style={s.desktopRight}>
                            {PipelineCard}
                            {RecentReviewsCard}
                        </View>
                    </View>
                ) : (
                    <>
                        {BarChartCard}
                        {PipelineCard}
                        {TopProductsCard}
                        {RecentReviewsCard}
                    </>
                )}
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    scroll: { padding: 20, paddingBottom: 52 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

    desktopContainer: { maxWidth: 1280, width: '100%', alignSelf: 'center' },
    desktopGrid: { flexDirection: 'row', gap: 24 },
    desktopLeft: { flex: 0.65 },
    desktopRight: { flex: 0.35 },

    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, maxWidth: 1280, width: '100%', alignSelf: 'center' },
    greeting: { fontSize: 20, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    dateTxt:  { fontSize: 12, color: SUB, marginTop: 3, fontFamily: 'Quicksand' },
    bellBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, position: 'relative' },
    bellDot:  { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: RED, borderWidth: 1.5, borderColor: CARD },

    statRow:  { gap: 16, marginBottom: 24 },
    statCard: { backgroundColor: CARD, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER },
    statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, height: 20 },
    statVal:  { fontSize: 24, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    statLbl:  { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4, fontWeight: '500' },
    statSub:  { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },

    card:      { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
    cardHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    cardSub:   { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    chip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    chipTxt:   { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand' },
    linkTxt:   { fontSize: 13, fontWeight: '600', color: P, fontFamily: 'Quicksand' },

    pipelineContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 24, paddingHorizontal: 8 },
    pipelineStep: { alignItems: 'center', width: 60 },
    pipelineIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    pipelineCount: { fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    pipelineLabel: { fontSize: 11, color: SUB, fontFamily: 'Quicksand', textAlign: 'center' },
    pipelineDivider: { flex: 1, height: 1, backgroundColor: BORDER, marginTop: 22, marginHorizontal: 8 },

    productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    productImg: { width: 48, height: 48, borderRadius: 12, backgroundColor: BG },
    productImgPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4 },
    productRev: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    rankBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: BG },
    rankTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand' },

    reviewRow: { borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 16 },
    reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    reviewerName: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    starsRow: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 13, color: '#4B5563', fontFamily: 'Quicksand', lineHeight: 20, marginBottom: 8 },
    reviewDate: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },

    emptyTxt: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

    retryBtn: { backgroundColor: P, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
    retryTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
});
