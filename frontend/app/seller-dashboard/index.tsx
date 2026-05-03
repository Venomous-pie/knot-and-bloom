import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated, Pressable,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sellerAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import {
    TrendingUp, TrendingDown, Package, ShoppingBag,
    DollarSign, AlertTriangle, ChevronRight, Bell,
    BarChart2, RefreshCw,
} from 'lucide-react-native';

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
        lastMonthSales: number;
        totalOrders: { PENDING: number; TO_SHIP: number; COMPLETED: number };
        conversionRate: number;
    };
    performanceGraph: Array<{ date: string; sales: number }>;
}

// ─── Donut (react-native-svg, works everywhere) ───────────────────────────────
function Donut({ pending, toShip, completed }: { pending: number; toShip: number; completed: number }) {
    const total = pending + toShip + completed || 1;
    const S = 110, CX = 55, CY = 55, R = 40, SW = 14;
    const C = 2 * Math.PI * R;
    const segs = [
        { v: completed, color: GREEN },
        { v: toShip,    color: INDIGO },
        { v: pending,   color: AMBER },
    ];
    let cum = 0;
    return (
        <Svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
            <Circle cx={CX} cy={CY} r={R} fill="none" stroke={BORDER} strokeWidth={SW} />
            {segs.map((s, i) => {
                const pct = s.v / total;
                const rot = cum * 360 - 90;
                cum += pct;
                return s.v > 0 ? (
                    <Circle key={i} cx={CX} cy={CY} r={R} fill="none"
                        stroke={s.color} strokeWidth={SW}
                        strokeDasharray={`${pct * C} ${C - pct * C}`}
                        strokeLinecap="round"
                        transform={`rotate(${rot}, ${CX}, ${CY})`}
                    />
                ) : null;
            })}
            <SvgText x={CX} y={CY - 5} fontSize="20" fontWeight="bold" fill={TEXT} textAnchor="middle">{total}</SvgText>
            <SvgText x={CX} y={CY + 10} fontSize="9" fill={SUB} textAnchor="middle">orders</SvgText>
        </Svg>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub, trend }: {
    label: string; value: string; icon: React.ReactNode;
    color: string; sub?: string; trend?: 'up' | 'down' | null;
}) {
    const scale = useRef(new Animated.Value(1)).current;
    return (
        <Pressable style={{ flex: 1 }} onPress={() => {
            Animated.sequence([
                Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1,    duration: 70, useNativeDriver: true }),
            ]).start();
        }}>
            <Animated.View style={[s.statCard, { transform: [{ scale }] }]}>
                <View style={[s.statIcon, { backgroundColor: color + '18' }]}>{icon}</View>
                <Text style={s.statLbl}>{label}</Text>
                <Text style={s.statVal}>{value}</Text>
                {sub && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                        {trend === 'up'   && <TrendingUp   size={10} color={GREEN} />}
                        {trend === 'down' && <TrendingDown size={10} color={RED}   />}
                        <Text style={[s.statSub, { color: trend === 'up' ? GREEN : trend === 'down' ? RED : SUB }]}>{sub}</Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

// ─── Nav Pill ─────────────────────────────────────────────────────────────────
function NavPill({ label, icon, bg, onPress, badge }: {
    label: string; icon: React.ReactNode; bg: string; onPress: () => void; badge?: number;
}) {
    return (
        <TouchableOpacity style={s.pill} onPress={onPress} activeOpacity={0.75}>
            <View style={[s.pillIcon, { backgroundColor: bg }]}>{icon}</View>
            <Text style={s.pillLabel}>{label}</Text>
            {!!badge && badge > 0 && (
                <View style={s.pillBadge}><Text style={s.pillBadgeText}>{badge > 9 ? '9+' : badge}</Text></View>
            )}
            <ChevronRight size={15} color={SUB} />
        </TouchableOpacity>
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

    const CHART_W = Math.min(width - 80, 340);

    // gifted-charts bar data
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

    // gifted-charts line data (month comparison)
    const lineData = [
        { value: stats.quickStats.lastMonthSales },
        { value: stats.quickStats.thisMonthSales },
    ];

    const delta = stats.quickStats.thisMonthSales - stats.quickStats.lastMonthSales;
    const trend: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;
    const { PENDING, TO_SHIP, COMPLETED } = stats.quickStats.totalOrders;

    return (
        <ScrollView
            style={s.root} contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} colors={[P]} tintColor={P} />
            }
        >
            {/* ── Header ── */}
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

            {/* ── Hero Card ── */}
            <View style={s.hero}>
                <View style={s.heroRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.heroLbl}>Today's Revenue</Text>
                        <Text style={s.heroVal}>{fmt(stats.performanceSnapshot.todayRevenue)}</Text>
                    </View>
                    <View style={s.livePill}>
                        <BarChart2 size={12} color={P} />
                        <Text style={s.liveTxt}>Live</Text>
                    </View>
                </View>
                <View style={s.heroMeta}>
                    <View style={s.metaPill}>
                        <ShoppingBag size={12} color="rgba(255,255,255,0.75)" />
                        <Text style={s.metaTxt}>{stats.performanceSnapshot.todayOrders} orders today</Text>
                    </View>
                    {stats.performanceSnapshot.pendingActions > 0 && (
                        <View style={[s.metaPill, { backgroundColor: 'rgba(239,68,68,0.22)' }]}>
                            <AlertTriangle size={12} color={RED} />
                            <Text style={[s.metaTxt, { color: '#FCA5A5' }]}>
                                {stats.performanceSnapshot.pendingActions} action{stats.performanceSnapshot.pendingActions > 1 ? 's' : ''} needed
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Stat Cards ── */}
            <View style={s.statRow}>
                <StatCard
                    label="This Month" value={fmtK(stats.quickStats.thisMonthSales)}
                    icon={<DollarSign size={17} color={P} />} color={P}
                    sub={delta !== 0 ? `${delta >= 0 ? '+' : ''}${fmtK(Math.abs(delta))} vs last` : 'Same as last month'}
                    trend={trend}
                />
                <StatCard
                    label="Completed" value={String(COMPLETED)}
                    icon={<Package size={17} color={GREEN} />} color={GREEN}
                    sub="Fulfilled orders"
                />
            </View>

            {/* ── 7-Day Bar Chart ── */}
            <View style={s.card}>
                <View style={s.cardHead}>
                    <Text style={s.cardTitle}>Sales — Last 7 Days</Text>
                    <View style={[s.chip, { backgroundColor: P_LIGHT }]}>
                        <Text style={[s.chipTxt, { color: P }]}>Daily</Text>
                    </View>
                </View>
                <View style={{ marginTop: 12, marginLeft: -8 }}>
                    <BarChart
                        data={barData}
                        width={CHART_W}
                        height={150}
                        barWidth={28}
                        spacing={12}
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

            {/* ── Month Comparison Line Chart ── */}
            <View style={s.card}>
                <View style={s.cardHead}>
                    <Text style={s.cardTitle}>Month vs Last Month</Text>
                    <View style={[s.chip, { backgroundColor: trend === 'up' ? '#DCFCE7' : trend === 'down' ? '#FEE2E2' : '#F3F4F6' }]}>
                        {trend === 'up'   && <TrendingUp   size={11} color={GREEN} />}
                        {trend === 'down' && <TrendingDown size={11} color={RED}   />}
                        <Text style={[s.chipTxt, { color: trend === 'up' ? GREEN : trend === 'down' ? RED : SUB }]}>
                            {delta !== 0 ? `${delta >= 0 ? '+' : ''}${fmtK(Math.abs(delta))}` : 'No change'}
                        </Text>
                    </View>
                </View>
                <View style={{ marginTop: 12, alignItems: 'center' }}>
                    <LineChart
                        data={lineData}
                        width={CHART_W}
                        height={110}
                        spacing={CHART_W - 60}
                        hideRules
                        hideAxesAndRules
                        curved
                        color={P}
                        thickness={2.5}
                        dataPointsColor={P}
                        dataPointsRadius={5}
                        startFillColor={P}
                        endFillColor={P}
                        startOpacity={0.18}
                        endOpacity={0.01}
                        areaChart
                        isAnimated
                        animationDuration={700}
                    />
                    <View style={s.lineFooter}>
                        <Text style={s.lineLbl}>Last Month{'\n'}<Text style={s.lineVal}>{fmtK(stats.quickStats.lastMonthSales)}</Text></Text>
                        <Text style={[s.lineLbl, { textAlign: 'right' }]}>This Month{'\n'}<Text style={[s.lineVal, { color: P }]}>{fmtK(stats.quickStats.thisMonthSales)}</Text></Text>
                    </View>
                </View>
            </View>

            {/* ── Order Pipeline Donut ── */}
            <View style={s.card}>
                <View style={s.cardHead}>
                    <Text style={s.cardTitle}>Order Pipeline</Text>
                    <Text style={s.cardSub}>All time</Text>
                </View>
                <View style={s.donutRow}>
                    <Donut pending={PENDING} toShip={TO_SHIP} completed={COMPLETED} />
                    <View style={s.legend}>
                        {[
                            { label: 'Completed', v: COMPLETED, color: GREEN },
                            { label: 'To Ship',   v: TO_SHIP,   color: INDIGO },
                            { label: 'Pending',   v: PENDING,   color: AMBER },
                        ].map(r => (
                            <View key={r.label} style={s.legendRow}>
                                <View style={[s.legendDot, { backgroundColor: r.color }]} />
                                <Text style={s.legendLbl}>{r.label}</Text>
                                <Text style={[s.legendVal, { color: r.color }]}>{r.v}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* ── Quick Nav ── */}
            <Text style={s.sectionTitle}>Manage</Text>
            <View style={s.navStack}>
                <NavPill label="Products"          icon={<Package size={17} color={P}     />} bg={P_LIGHT}  onPress={() => router.push('/seller-dashboard/products' as any)} />
                <NavPill label="Orders"            icon={<ShoppingBag size={17} color={INDIGO} />} bg="#EEF2FF"  onPress={() => router.push('/seller-dashboard/orders' as any)} badge={PENDING} />
                <NavPill label="Earnings & Payouts" icon={<DollarSign size={17} color={TEAL}  />} bg="#CCFBF1"  onPress={() => router.push('/seller-dashboard/earnings' as any)} />
            </View>
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    scroll: { padding: 20, paddingBottom: 52 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
    greeting: { fontSize: 20, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    dateTxt:  { fontSize: 12, color: SUB, marginTop: 3, fontFamily: 'Quicksand' },
    bellBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, position: 'relative' },
    bellDot:  { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: RED, borderWidth: 1.5, borderColor: CARD },

    hero:      { backgroundColor: P, borderRadius: 22, padding: 22, marginBottom: 16, shadowColor: P, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
    heroRow:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
    heroLbl:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Quicksand' },
    heroVal:   { color: '#FFF', fontSize: 30, fontWeight: '800', fontFamily: 'Quicksand', marginTop: 3 },
    livePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    liveTxt:   { color: P, fontSize: 11, fontWeight: '700' },
    heroMeta:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    metaPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    metaTxt:   { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: 'Quicksand' },

    statRow:  { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: CARD, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: BORDER },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statLbl:  { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    statVal:  { fontSize: 18, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginTop: 2 },
    statSub:  { fontSize: 10, color: SUB, fontFamily: 'Quicksand' },

    card:      { backgroundColor: CARD, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
    cardHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    cardSub:   { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    chip:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    chipTxt:   { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand' },

    lineFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 4, width: '100%' },
    lineLbl:    { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    lineVal:    { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },

    donutRow:  { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 },
    legend:    { flex: 1, gap: 10 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendLbl: { flex: 1, fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    legendVal: { fontSize: 15, fontWeight: '700', fontFamily: 'Quicksand' },

    sectionTitle: { fontSize: 11, fontWeight: '700', color: SUB, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Quicksand' },
    navStack: { gap: 10 },
    pill:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: BORDER },
    pillIcon:     { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    pillLabel:    { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    pillBadge:    { backgroundColor: RED, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginRight: 4 },
    pillBadgeText:{ color: 'white', fontSize: 11, fontWeight: '700' },

    retryBtn: { backgroundColor: P, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
    retryTxt: { color: 'white', fontWeight: '700', fontSize: 14 },
});
