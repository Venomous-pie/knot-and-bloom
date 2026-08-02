import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated, Pressable,
    useWindowDimensions, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { sellerAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart } from 'react-native-gifted-charts';
import {
    Package, ShoppingBag, DollarSign, Bell, RefreshCw,
    TrendingUp, TrendingDown, Star, CheckCircle, Clock, XCircle, Settings, Users, AlertCircle, ChevronRight, Truck
} from 'lucide-react-native';
import Tooltip from '../../components/ui/Tooltip';
import StatCard from '../../components/ui/StatCard';

// ─── Tokens ───────────────────────────────────────────────────────────────────
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

interface DashboardStats {
    performanceSnapshot: {
        todayRevenue: number;
        todayOrders: number;
        todayVisitors: number;
        pendingOrders: number;
        lowStockItems: number;
        unreadMessages: number;
        pendingOrdersSeverity: 'NEUTRAL' | 'AMBER' | 'RED';
        lifetimeTotalOrders: number;
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
    onboarding?: {
        hasProducts: boolean;
        hasPayouts: boolean;
        hasShipping: boolean;
    };
}



// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SellerDashboardHome() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    React.useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchStats = async () => {
        try { setStats(await sellerAPI.getDashboardStats()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); setRefreshing(false); }
    };
    useEffect(() => { 
        fetchStats(); 
        // Auto-refresh every 5 minutes (300000ms)
        const intervalId = setInterval(() => {
            fetchStats();
        }, 300000);
        return () => clearInterval(intervalId);
    }, []);

    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            ).start();
        }
    }, [loading]);

    const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtK = (n: number) => n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${n.toFixed(0)}`;

    const isDesktop = width >= 1024;

    const displayStats = stats || {
        performanceSnapshot: { todayRevenue: 0, todayOrders: 0, todayVisitors: 0, pendingOrders: 0, lowStockItems: 0, unreadMessages: 0, pendingOrdersSeverity: 'NEUTRAL', lifetimeTotalOrders: 0 },
        quickStats: { thisMonthSales: 0, thisMonthOrders: 0, thisMonthEarnings: 0, lastMonthSales: 0, totalOrders: { PENDING: 0, PROCESSING: 0, COMPLETED: 0, CANCELLED: 0 }, conversionRate: 0 },
        onboarding: { hasProducts: false, hasPayouts: false, hasShipping: false },
        performanceGraph: [],
        topProducts: [],
        recentReviews: []
    };

    let dashboardContent = null;

    const HeaderComponent = (
        <View style={s.header}>
            <View style={{ flex: 1 }}>
                <Text style={s.greeting} numberOfLines={1}>Good morning, {user?.name?.split(' ')[0] || 'Seller'}!</Text>
                <Text style={s.dateTxt}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {!stats && !loading && (
                    <TouchableOpacity style={s.smallRetryBtn} onPress={fetchStats}>
                        <RefreshCw size={14} color={P} />
                        <Text style={s.smallRetryTxt}>Retry</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/seller-dashboard/notifications' as any)}>
                    <Bell size={19} color={TEXT} />
                    {(displayStats.performanceSnapshot?.unreadMessages ?? 0) > 0 && <View style={s.bellDot} />}
                </TouchableOpacity>
            </View>
        </View>
    );

    const pendingOrdersCount = displayStats.performanceSnapshot?.pendingOrders || 0;
    const lowStock = displayStats.performanceSnapshot?.lowStockItems || 0;
    const unreadMsgs = displayStats.performanceSnapshot?.unreadMessages || 0;

    let totalAlerts = 0;
    let alertTypes = 0;
    let singleAlertTitle = '';
    let singleAlertDesc = '';
    let singleAlertPath = '/seller-dashboard';

    if (pendingOrdersCount > 0) { totalAlerts += pendingOrdersCount; alertTypes++; singleAlertTitle = 'Pending Orders'; singleAlertDesc = `You have ${pendingOrdersCount} order${pendingOrdersCount > 1 ? 's' : ''} waiting to be processed!`; singleAlertPath = '/seller-dashboard/orders'; }
    if (lowStock > 0) { totalAlerts += lowStock; alertTypes++; singleAlertTitle = 'Low Stock'; singleAlertDesc = `You have ${lowStock} item${lowStock > 1 ? 's' : ''} low on stock.`; singleAlertPath = '/seller-dashboard/products'; }
    if (unreadMsgs > 0) { totalAlerts += unreadMsgs; alertTypes++; singleAlertTitle = 'Unread Messages'; singleAlertDesc = `You have ${unreadMsgs} unread message${unreadMsgs > 1 ? 's' : ''}.`; singleAlertPath = '/seller-dashboard/notifications'; }

    let ActionBanner = null;
    if (alertTypes > 1) {
        ActionBanner = (
            <View style={s.actionBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={s.actionBannerIcon}>
                        <AlertCircle size={20} color="#B45309" />
                    </View>
                    <View>
                        <Text style={s.actionBannerTitle}>Requires Attention</Text>
                        <Text style={s.actionBannerTxt}>You have {totalAlerts} items needing your attention across {alertTypes} categories.</Text>
                    </View>
                </View>
                <TouchableOpacity style={s.actionBannerBtn} onPress={() => router.push('/seller-dashboard/orders' as any)}>
                    <Text style={s.actionBannerBtnTxt}>View Tasks</Text>
                </TouchableOpacity>
            </View>
        );
    } else if (alertTypes === 1) {
        ActionBanner = (
            <View style={s.actionBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={s.actionBannerIcon}>
                        <Clock size={20} color="#B45309" />
                    </View>
                    <View>
                        <Text style={s.actionBannerTitle}>{singleAlertTitle}</Text>
                        <Text style={s.actionBannerTxt}>{singleAlertDesc}</Text>
                    </View>
                </View>
                <TouchableOpacity style={s.actionBannerBtn} onPress={() => router.push(singleAlertPath as any)}>
                    <Text style={s.actionBannerBtnTxt}>View</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Calculate dynamic chart width.
    const CHART_W = isDesktop
        ? ((Math.min(width - 260, 1280) * 0.65) - 80)
        : Math.min(width - 80, 340);

    const lineData = displayStats.performanceGraph.map((d) => {
        return {
            value: d.sales,
            dataPointText: fmtK(d.sales),
            label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        };
    });

    const delta = displayStats.quickStats.thisMonthSales - displayStats.quickStats.lastMonthSales;
    const trend: 'up' | 'down' | null = delta > 0 ? 'up' : delta < 0 ? 'down' : null;
    const { PENDING, PROCESSING, COMPLETED, CANCELLED } = displayStats.quickStats.totalOrders;

    let pendingColor = AMBER;
    let pendingMicrocopy = "Action required";
    if (displayStats.performanceSnapshot?.pendingOrdersSeverity === 'RED') {
        pendingColor = RED;
        pendingMicrocopy = "1+ Urgent (>48h)";
    } else if (displayStats.performanceSnapshot?.pendingOrdersSeverity === 'NEUTRAL') {
        pendingColor = '#64748B'; // Slate gray
        pendingMicrocopy = "New (<24h)";
    }

    // --- Components ---

    const StatsBar = (
        <View style={[s.statRow, { flexDirection: isDesktop ? 'row' : 'row', flexWrap: isDesktop ? 'nowrap' : 'wrap', zIndex: 100, overflow: 'visible' }]}>
            <StatCard
                label="Today's Revenue" value={fmtK(displayStats.performanceSnapshot.todayRevenue)}
                icon={<DollarSign size={17} color={P} />} color={P}
                sub={`${fmtK(displayStats.quickStats.thisMonthSales)} this month`}
                trend={undefined}
                tooltip="Store-local time (PHT)."
                isLoading={loading}
            />
            <StatCard
                label="Pending Orders" value={String(PENDING)}
                icon={<Clock size={17} color={pendingColor} />} color={pendingColor}
                sub={pendingMicrocopy}
                tooltip="Orders awaiting your confirmation to process."
                isLoading={loading}
            />
            <StatCard
                label="Today's Visitors" value={String(displayStats.performanceSnapshot.todayVisitors || 0)}
                icon={<Users size={17} color={INDIGO} />} color={INDIGO}
                sub="Your store traffic today"
                tooltip="Unique visitors to your store today."
                isLoading={loading}
            />
            <StatCard
                label="Net Earnings" value={fmtK(displayStats.quickStats.thisMonthEarnings)}
                icon={<DollarSign size={17} color={TEAL} />} color={TEAL}
                sub="This month (Est.)"
                tooltip="Your net earnings this month after Knot & Bloom platform fees."
                isLoading={loading}
            />
        </View>
    );

    const ChartCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <View>
                    <Text style={s.cardTitle}>Revenue Trends</Text>
                    <Text style={s.cardSub}>Last 7 Days</Text>
                </View>
                <View style={[s.chip, { backgroundColor: P_LIGHT }]}>
                    <Text style={[s.chipTxt, { color: P }]}>Daily</Text>
                </View>
            </View>
            <View style={{ marginTop: 24, marginLeft: -8, alignItems: isDesktop ? 'center' : 'flex-start' }}>
                {loading && !stats ? (
                    <Animated.View style={{ opacity: pulseAnim, width: CHART_W, height: 180, backgroundColor: '#E2E8F0', borderRadius: 12, marginVertical: 12 }} />
                ) : (
                    <LineChart
                        data={lineData}
                        width={CHART_W}
                        height={180}
                        spacing={isDesktop ? Math.max(12, (CHART_W - (7 * 40)) / 6) : 40}
                        hideRules={false}
                        rulesColor={BORDER}
                        rulesType="solid"
                        noOfSections={4}
                        yAxisThickness={0}
                        xAxisThickness={1}
                        xAxisColor={BORDER}
                        yAxisTextStyle={{ color: SUB, fontSize: 10, fontFamily: 'Quicksand' }}
                        xAxisLabelTextStyle={{ color: SUB, fontSize: 10, fontFamily: 'Quicksand' }}
                        color={P}
                        thickness={3}
                        dataPointsColor={P}
                        dataPointsRadius={4}
                        startFillColor={P + '40'}
                        endFillColor={P + '00'}
                        startOpacity={0.9}
                        endOpacity={0.1}
                        isAnimated
                        animationDuration={1000}
                        areaChart
                        pointerConfig={{
                            pointerStripHeight: 160,
                            pointerStripColor: P,
                            pointerStripWidth: 2,
                            pointerColor: P,
                            radius: 6,
                            pointerLabelWidth: 80,
                            pointerLabelHeight: 30,
                            activatePointersOnLongPress: true,
                            autoAdjustPointerLabelPosition: true,
                            pointerLabelComponent: (items: any) => {
                                return (
                                    <View style={{ backgroundColor: TEXT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: -30, alignSelf: 'center' }}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold', fontFamily: 'Quicksand', textAlign: 'center' }}>
                                            {items[0].value ? fmtK(items[0].value) : '₱0'}
                                        </Text>
                                    </View>
                                );
                            },
                        }}
                    />
                )}
            </View>
        </View>
    );

    const PipelineSidebar = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Order Pipeline</Text>
                <TouchableOpacity onPress={() => router.push('/seller-dashboard/orders' as any)}>
                    <Text style={s.linkTxt}>View All</Text>
                </TouchableOpacity>
            </View>
            <View style={{ marginTop: 24, gap: 16 }}>
                {[
                    { label: 'Pending', count: PENDING, icon: Clock, color: AMBER, tip: 'Awaiting confirmation.' },
                    { label: 'Processing', count: PROCESSING, icon: Settings, color: INDIGO, tip: 'Being prepared.' },
                    { label: 'Completed', count: COMPLETED, icon: CheckCircle, color: GREEN, tip: 'Delivered.' },
                    { label: 'Cancelled', count: CANCELLED, icon: XCircle, color: RED, tip: 'Cancelled.' },
                ].map((step, idx, arr) => (
                    <React.Fragment key={step.label}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={[s.pipelineIconVertical, { backgroundColor: step.color + '15' }]}>
                                    <step.icon size={20} color={step.color} />
                                </View>
                                <View>
                                    <Text style={s.pipelineLabelVertical}>{step.label}</Text>
                                    <Text style={s.pipelineTipVertical}>{step.tip}</Text>
                                </View>
                            </View>
                            <Text style={s.pipelineCountVertical}>{step.count}</Text>
                        </View>
                        {idx < arr.length - 1 && <View style={s.pipelineDividerVertical} />}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

    const TopProductsCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <View>
                    <Text style={s.cardTitle}>Top Performing</Text>
                    <Text style={s.cardSub}>By revenue</Text>
                </View>
            </View>
            <View style={{ marginTop: 24, gap: 16 }}>
                {loading && !stats ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                        {[1, 2, 3].map(i => <View key={i} style={{ height: 56, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 16 }} />)}
                    </Animated.View>
                ) : displayStats.topProducts.length > 0 ? displayStats.topProducts.map((p, i) => (
                    <View key={p.id} style={s.productRow}>
                        {p.image ? (
                            <Image source={{ uri: p.image }} style={s.productImg} />
                        ) : (
                            <View style={s.productImgPlaceholder}><Package size={18} color={SUB} /></View>
                        )}
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                            <Text style={s.productRev}>Generated {fmt(p.revenue)}</Text>
                        </View>
                        <View style={[s.rankBadge, i === 0 && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                            <Text style={[s.rankTxt, i === 0 && { color: '#D97706' }]}>#{i + 1}</Text>
                        </View>
                    </View>
                )) : (
                    <View style={s.emptyState}>
                        <ShoppingBag size={24} color={SUB} style={{ marginBottom: 8 }} />
                        <Text style={s.emptyTxt}>No sales data yet.</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const RecentReviewsCard = (
        <View style={s.card}>
            <View style={s.cardHead}>
                <View>
                    <Text style={s.cardTitle}>Recent Reviews</Text>
                    <Text style={s.cardSub}>Last 30 days</Text>
                </View>
            </View>
            <View style={{ marginTop: 24, gap: 16 }}>
                {loading && !stats ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                        {[1, 2].map(i => <View key={i} style={{ height: 80, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 16 }} />)}
                    </Animated.View>
                ) : displayStats.recentReviews.length > 0 ? displayStats.recentReviews.map((r) => (
                    <View key={r.id} style={s.reviewRow}>
                        <View style={s.reviewHead}>
                            <Text style={s.reviewerName}>{r.customerName}</Text>
                            <Text style={s.reviewDate}>{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                        </View>
                        <View style={s.starsRow}>
                            {[1, 2, 3, 4, 5].map((sVal) => (
                                <Star key={sVal} size={14} fill={sVal <= r.rating ? '#F59E0B' : '#E5E7EB'} color={sVal <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                            ))}
                        </View>
                        <Text style={s.reviewComment}>{r.comment}</Text>
                    </View>
                )) : (
                    <View style={s.emptyState}>
                        <Star size={24} color={SUB} style={{ marginBottom: 8 }} />
                        <Text style={s.emptyTxt}>No reviews yet.</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const lifetimeTotalOrders = displayStats.performanceSnapshot?.lifetimeTotalOrders || 0;
    const showHybridOnboarding = lifetimeTotalOrders < 5;
    const ob = displayStats.onboarding || { hasProducts: false, hasPayouts: false, hasShipping: false };
    const completedSteps = [ob.hasProducts, ob.hasPayouts, ob.hasShipping, false].filter(Boolean).length;

    const OnboardingChecklist = showHybridOnboarding ? (
        <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 6 }}>Welcome to Knot & Bloom! 🎉</Text>
                    <Text style={{ fontSize: 14, color: SUB, fontFamily: 'Quicksand', lineHeight: 22 }}>Complete these essential steps to launch your store and start receiving orders from customers.</Text>
                </View>
                <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', fontFamily: 'Quicksand' }}>{completedSteps} / 4 Done</Text>
                </View>
            </View>

            <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 16, overflow: 'hidden' }}>
                <TouchableOpacity style={s.onboardingRow} onPress={() => router.push('/seller-dashboard/products/form' as any)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ob.hasProducts ? '#D1FAE5' : P_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
                            {ob.hasProducts ? <CheckCircle size={20} color={GREEN} /> : <Package size={20} color={P} />}
                        </View>
                        <View>
                            <Text style={[s.onboardingRowTxt, ob.hasProducts && { textDecorationLine: 'line-through', color: SUB }]}>Add your first product</Text>
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Upload photos and set your pricing.</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: BORDER }} />

                <TouchableOpacity style={s.onboardingRow} onPress={() => router.push('/seller-dashboard/settings' as any)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ob.hasPayouts ? '#D1FAE5' : '#E0E7FF', alignItems: 'center', justifyContent: 'center' }}>
                            {ob.hasPayouts ? <CheckCircle size={20} color={GREEN} /> : <DollarSign size={20} color={INDIGO} />}
                        </View>
                        <View>
                            <Text style={[s.onboardingRowTxt, ob.hasPayouts && { textDecorationLine: 'line-through', color: SUB }]}>Set up payouts</Text>
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Link your GCash or Bank account.</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: BORDER }} />

                <TouchableOpacity style={s.onboardingRow} onPress={() => router.push('/seller-dashboard/shipping' as any)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ob.hasShipping ? '#D1FAE5' : '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                            {ob.hasShipping ? <CheckCircle size={20} color={GREEN} /> : <Truck size={20} color={AMBER} />}
                        </View>
                        <View>
                            <Text style={[s.onboardingRowTxt, ob.hasShipping && { textDecorationLine: 'line-through', color: SUB }]}>Configure shipping</Text>
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Set your delivery vehicle and meetup points.</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: BORDER }} />

                <TouchableOpacity style={s.onboardingRow} onPress={() => router.push('/seller-dashboard/settings' as any)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} color={GREEN} />
                        </View>
                        <View>
                            <Text style={s.onboardingRowTxt}>Share your store link</Text>
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Let your network know you're open.</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </View>
        </View>
    ) : null;

    dashboardContent = (
        <>
            {ActionBanner}
            {showHybridOnboarding && OnboardingChecklist}
            {StatsBar}
            {isDesktop ? (
                <View style={s.desktopGrid}>
                    <View style={s.desktopLeft}>
                        {ChartCard}
                        {RecentReviewsCard}
                    </View>
                    <View style={s.desktopRight}>
                        {PipelineSidebar}
                        {TopProductsCard}
                    </View>
                </View>
            ) : (
                <>
                    {ChartCard}
                    {PipelineSidebar}
                    {TopProductsCard}
                    {RecentReviewsCard}
                </>
            )}
        </>
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
                    {dashboardContent}
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, maxWidth: 1280, width: '100%', alignSelf: 'center' },
    greeting: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    dateTxt: { fontSize: 13, color: SUB, marginTop: 4, fontFamily: 'Quicksand' },
    bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, position: 'relative' },
    bellDot: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: RED, borderWidth: 1.5, borderColor: CARD },

    actionBanner: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    actionBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
    actionBannerTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', fontFamily: 'Quicksand', marginBottom: 2 },
    actionBannerTxt: { fontSize: 13, color: '#92400E', fontFamily: 'Quicksand' },
    actionBannerBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A' },
    actionBannerBtnTxt: { fontSize: 13, fontWeight: '700', color: '#92400E', fontFamily: 'Quicksand' },

    onboardingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, paddingHorizontal: 20, paddingVertical: 16 },
    onboardingRowTxt: { fontSize: 15, color: TEXT, fontFamily: 'Quicksand', fontWeight: '700' },

    statRow: { gap: 16, marginBottom: 24 },

    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
    cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    cardTitle: { fontSize: 18, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    cardSub: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    chipTxt: { fontSize: 12, fontWeight: '700', fontFamily: 'Quicksand' },
    linkTxt: { fontSize: 13, fontWeight: '600', color: P, fontFamily: 'Quicksand' },

    pipelineIconVertical: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    pipelineLabelVertical: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    pipelineTipVertical: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    pipelineCountVertical: { fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    pipelineDividerVertical: { height: 1, backgroundColor: BORDER, marginVertical: 12, marginLeft: 56 },

    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
    productImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: BG },
    productImgPlaceholder: { width: 56, height: 56, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4 },
    productRev: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    rankBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    rankTxt: { fontSize: 13, fontWeight: '700', color: SUB, fontFamily: 'Quicksand' },

    reviewRow: { padding: 16, backgroundColor: BG, borderRadius: 16 },
    reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    reviewerName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    starsRow: { flexDirection: 'row', gap: 2, marginBottom: 12 },
    reviewComment: { fontSize: 14, color: TEXT, fontFamily: 'Quicksand', lineHeight: 22 },
    reviewDate: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },

    emptyState: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
    emptyTxt: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', textAlign: 'center' },

    smallRetryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P_LIGHT, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: P + '30' },
    smallRetryTxt: { color: P, fontWeight: '700', fontSize: 12, fontFamily: 'Quicksand' },
});
