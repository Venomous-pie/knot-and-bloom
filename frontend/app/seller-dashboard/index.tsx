import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    ActivityIndicator, RefreshControl, Animated, Pressable,
    useWindowDimensions, Image, ImageBackground, Modal, TextInput, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { sellerAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';
import {
    Package, ShoppingBag, DollarSign, Bell, RefreshCw,
    TrendingUp, TrendingDown, Star, CheckCircle, Clock, XCircle, Settings, Users, AlertCircle, ChevronRight, Truck, Copy, Check
} from 'lucide-react-native';
import Tooltip from '../../components/ui/Tooltip';
import StatCard from '../../components/ui/StatCard';
import ModalPortal from '../../components/ui/ModalPortal';
import Button from '../../components/ui/Button';
import * as Clipboard from 'expo-clipboard';

const TouchableOpacity = React.forwardRef(({ style, activeOpacity = 0.5, onPress, ...props }: any, ref: any) => (
    <Pressable
        ref={ref}
        onPress={onPress}
        {...props}
        style={(state) => [
            Platform.OS === 'web' && { cursor: 'pointer' } as any,
            typeof style === 'function' ? style(state) : style,
            state.pressed && { opacity: activeOpacity }
        ]}
    />
));
TouchableOpacity.displayName = 'TouchableOpacity';

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

    const [refreshing, setRefreshing] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [hasShared, setHasShared] = useState(false);
    const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Animated values for the onboarding → celebration transition
    const checklistOpacity = useRef(new Animated.Value(1)).current;
    const celebrationOpacity = useRef(new Animated.Value(0)).current;
    const celebrationScale = useRef(new Animated.Value(0.92)).current;
    const cardHeight = useRef(new Animated.Value(1)).current; // 1 = full, 0 = collapsed

    useEffect(() => {
        AsyncStorage.getItem('onboarding_shared').then(res => {
            if (res === 'true') setHasShared(true);
        });
        AsyncStorage.getItem('onboarding_dismissed').then(res => {
            if (res === 'true') setDismissedOnboarding(true);
        });
    }, []);

    React.useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const { data: stats, isLoading: loading, refetch } = useQuery({
        queryKey: ['dashboardStats', user?.sellerProfile?.uid],
        queryFn: () => sellerAPI.getDashboardStats(),
        enabled: !!(user && (user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE'))),
        staleTime: 60 * 1000,
        refetchInterval: 300000, // Auto-refresh every 5 minutes
    });

    // Trigger celebration when all 4 steps are done — only once
    const prevCompletedRef = useRef(0);
    useEffect(() => {
        const completedNow = [stats?.onboarding?.hasProducts, stats?.onboarding?.hasPayouts, stats?.onboarding?.hasShipping, hasShared].filter(Boolean).length;
        if (completedNow === 4 && prevCompletedRef.current < 4 && !dismissedOnboarding) {
            setShowCelebration(true);
            // Fade out checklist, then reveal celebration
            Animated.sequence([
                Animated.timing(checklistOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
                Animated.parallel([
                    Animated.timing(celebrationOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.spring(celebrationScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
                ])
            ]).start();
        }
        prevCompletedRef.current = completedNow;
    }, [stats?.onboarding?.hasProducts, stats?.onboarding?.hasPayouts, stats?.onboarding?.hasShipping, hasShared]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
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
                    <Button
                        title="Retry"
                        variant="outline"
                        onPress={() => refetch()}
                        icon={<RefreshCw size={14} color={P} />}
                        style={{ height: 32, paddingHorizontal: 12, borderRadius: 16 }}
                        textStyle={{ fontSize: 13 }}
                    />
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
                <Button
                    title="View Tasks"
                    variant="outline"
                    onPress={() => router.push('/seller-dashboard/orders' as any)}
                    style={{ backgroundColor: CARD, borderColor: 'transparent', height: 36, paddingHorizontal: 16 }}
                    textStyle={{ color: TEXT }}
                />
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
                <Button
                    title="View"
                    variant="outline"
                    onPress={() => router.push(singleAlertPath as any)}
                    style={{ backgroundColor: CARD, borderColor: 'transparent', height: 36, paddingHorizontal: 16 }}
                    textStyle={{ color: TEXT }}
                />
            </View>
        );
    }

    // Calculate dynamic chart width.
    const CHART_W = isDesktop
        ? ((Math.min(width - 260, 1280) * 0.65) - 80)
        : Math.min(width - 80, 340);

    const lineData = displayStats.performanceGraph.map((d: any) => {
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
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            onPress={() => router.push({ pathname: '/seller-dashboard/orders', params: { filter: step.label.toUpperCase() } } as any)}
                        >
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
                        </TouchableOpacity>
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
                ) : displayStats.topProducts.length > 0 ? displayStats.topProducts.map((p: any, i: number) => (
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
                ) : displayStats.recentReviews.length > 0 ? displayStats.recentReviews.map((r: any) => (
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
    const ob = displayStats.onboarding || { hasProducts: false, hasPayouts: false, hasShipping: false };
    const completedSteps = [ob.hasProducts, ob.hasPayouts, ob.hasShipping, hasShared].filter(Boolean).length;
    // Show the card if: not dismissed AND (not all steps done yet OR we're showing the celebration)
    const showHybridOnboarding = !!stats && !dismissedOnboarding && lifetimeTotalOrders < 5 && (completedSteps < 4 || showCelebration);

    const handleDismissOnboarding = () => {
        setDismissedOnboarding(true);
        setShowCelebration(false);
        AsyncStorage.setItem('onboarding_dismissed', 'true');
    };

    const OnboardingChecklist = showHybridOnboarding ? (
        <View style={[s.card, showCelebration && { padding: 0, overflow: 'hidden' }]}>
            {/* Celebration view — shown after all 4 steps complete */}
            {showCelebration ? (
                <Animated.View style={{ opacity: celebrationOpacity, transform: [{ scale: celebrationScale }] }}>
                    {/* Background Elements (full bleed) */}
                    <View style={StyleSheet.absoluteFill}>
                        <View style={{ position: 'absolute', top: -20, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: P_LIGHT, opacity: 0.6 }} />
                        <View style={{ position: 'absolute', bottom: -50, right: -30, width: 220, height: 220, borderRadius: 110, backgroundColor: P_LIGHT, opacity: 0.4 }} />
                        <View style={{ position: 'absolute', top: '15%', right: '8%', width: 80, height: 80, borderRadius: 40, backgroundColor: P_LIGHT, opacity: 0.5 }} />
                        <View style={{ position: 'absolute', bottom: '20%', left: '5%', width: 60, height: 60, borderRadius: 30, backgroundColor: P_LIGHT, opacity: 0.6 }} />

                        <View style={{ position: 'absolute', top: '25%', left: '35%', width: 6, height: 6, borderRadius: 3, backgroundColor: P, opacity: 0.15 }} />
                        <View style={{ position: 'absolute', top: '55%', right: '25%', width: 8, height: 8, borderRadius: 4, backgroundColor: P, opacity: 0.15 }} />
                        <View style={{ position: 'absolute', bottom: '35%', left: '20%', width: 6, height: 6, borderRadius: 3, backgroundColor: P, opacity: 0.15 }} />
                        <View style={{ position: 'absolute', bottom: '15%', right: '40%', width: 8, height: 8, borderRadius: 4, backgroundColor: P, opacity: 0.15 }} />
                        <View style={{ position: 'absolute', top: '70%', left: '15%', width: 6, height: 6, borderRadius: 3, backgroundColor: P, opacity: 0.15 }} />

                        <Text style={{ position: 'absolute', top: '15%', left: '15%', fontSize: 32, opacity: 0.4 }}>🧶</Text>
                        <Text style={{ position: 'absolute', top: '25%', right: '15%', fontSize: 28, opacity: 0.4 }}>🌸</Text>
                        <Text style={{ position: 'absolute', bottom: '30%', left: '25%', fontSize: 36, opacity: 0.3 }}>✨</Text>
                        <Text style={{ position: 'absolute', bottom: '15%', right: '20%', fontSize: 32, opacity: 0.4 }}>🧶</Text>
                    </View>

                    <View style={{ alignItems: 'center', paddingHorizontal: 40, paddingVertical: 52, backgroundColor: 'transparent' }}>
                        {/* Animated heart SVG — web only */}
                        {Platform.OS === 'web' ? (
                            // @ts-ignore
                            <div
                                style={{ width: 145, height: 145, marginBottom: 16, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                dangerouslySetInnerHTML={{ __html: `<svg fill="none" height="100%" width="100%" viewBox="0 0 148 148" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg"><g id="i0"><g transform="translate(74,74)"><g transform="scale(1,1)"><animateTransform repeatCount="indefinite" type="scale" attributeName="transform" dur="2s" begin="0s" calcMode="spline" values="1 1; 0.6 0.6; 1.3 1.3; 1 1; 1.05 1.05; 1 1; 1 1; 1 1" keyTimes="0; 0.0454545; 0.159091; 0.25; 0.318182; 0.431818; 0.5; 1" keySplines="0.333 0.115 0.48 1; 0.264 0 0.516 1; 0.373 0 0.605 1; 0.32 0 0.663 0.978; 0.29 0.002 0.64 0.973; 0 0 1 1; 0 0 1 1" fill="freeze" /><g transform="translate(-25,-22.5)"><g id="i1" transform="matrix(1,0,0,1,25,22.5)"><path stroke-linejoin="round" stroke-linecap="round" stroke-width="3.6" stroke="#fb3144" fill="#ff3144" d="M11.176,-20.5C6.301,-20.5,2.068,-17.976,0,-14.302C-2.067,-17.976,-6.301,-20.5,-11.175,-20.5C-18.577,-20.5,-23,-14.04,-23,-7.795C-23,6.995,-1.588,19.778,-0.676,20.315C-0.467,20.439,-0.234,20.5,0,20.5C0.234,20.5,0.467,20.439,0.676,20.315C1.588,19.778,23,6.995,23,-7.795C23,-14.04,18.577,-20.5,11.176,-20.5Z" /></g></g></g></g></g><g id="i2"><g transform="translate(74,74)"><g transform="scale(0,0)"><animateTransform repeatCount="indefinite" type="scale" attributeName="transform" dur="2s" begin="0s" calcMode="spline" values="0 0; 0 0; 0.24 0.24; 0.24 0.24; 0.24 0.24" keyTimes="0; 0.0454545; 0.318182; 0.5; 1" keySplines="0 0 1 1; 1 0 0 1; 0 0 1 1; 0 0 1 1" fill="freeze" /><g transform="translate(120.395,-32.605)"><g id="i3" transform="matrix(1,0,0,1,-120.395,32.605)"><ellipse ry="183.606" rx="183.606" cy="0" cx="0" stroke-width="240" stroke="#ff3144"><animate repeatCount="indefinite" attributeName="stroke-width" dur="2s" begin="0s" fill="freeze" values="240; 240; 0; 0; 0" keyTimes="0; 0.0454545; 0.318182; 0.5; 1" keySplines="0 0 1 1; 0.588 0 0.297 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /></ellipse></g></g></g></g></g><g transform="matrix(0.25,0,0,0.25,74,74)" id="i4"><g id="i5"><g id="i6"><ellipse ry="0" rx="0" cy="0" cx="0" fill="#ff3144"><animate repeatCount="indefinite" attributeName="cy" dur="2s" begin="0s" fill="freeze" values="0; 0; 189; 240; 240; 240" keyTimes="0; 0.0227275; 0.1363635; 0.340909; 0.5; 1" keySplines="0 0 1 1; 0.6 0 0.52 1; 0.333 0 0.38 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="rx" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="ry" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /></ellipse></g><g transform="rotate(45, 0, 0)" id="i7"><ellipse ry="0" rx="0" cy="0" cx="0" fill="#ff3144"><animate repeatCount="indefinite" attributeName="cy" dur="2s" begin="0s" fill="freeze" values="0; 0; 189; 240; 240; 240" keyTimes="0; 0.0227275; 0.1363635; 0.340909; 0.5; 1" keySplines="0 0 1 1; 0.6 0 0.52 1; 0.333 0 0.38 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="rx" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="ry" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /></ellipse></g><g transform="rotate(90, 0, 0)" id="i8"><ellipse ry="0" rx="0" cy="0" cx="0" fill="#ff3144"><animate repeatCount="indefinite" attributeName="cy" dur="2s" begin="0s" fill="freeze" values="0; 0; 189; 240; 240; 240" keyTimes="0; 0.0227275; 0.1363635; 0.340909; 0.5; 1" keySplines="0 0 1 1; 0.6 0 0.52 1; 0.333 0 0.38 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="rx" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="ry" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /></ellipse></g><g transform="rotate(135, 0, 0)" id="i9"><ellipse ry="0" rx="0" cy="0" cx="0" fill="#ff3144"><animate repeatCount="indefinite" attributeName="cy" dur="2s" begin="0s" fill="freeze" values="0; 0; 189; 240; 240; 240" keyTimes="0; 0.0227275; 0.1363635; 0.340909; 0.5; 1" keySplines="0 0 1 1; 0.6 0 0.52 1; 0.333 0 0.38 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="rx" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="ry" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /></ellipse></g><g transform="rotate(180, 0, 0)" id="i10"><ellipse ry="0" rx="0" cy="0" cx="0" fill="#ff3144"><animate repeatCount="indefinite" attributeName="cy" dur="2s" begin="0s" fill="freeze" values="0; 0; 189; 240; 240; 240" keyTimes="0; 0.0227275; 0.1363635; 0.340909; 0.5; 1" keySplines="0 0 1 1; 0.6 0 0.52 1; 0.333 0 0.38 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="rx" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636365; 0.5; 1" keySplines="0 0 1 1; 0.333 0 0.667 1; 0.333 0 0.667 1; 0 0 1 1; 0 0 1 1" calcMode="spline" /><animate repeatCount="indefinite" attributeName="ry" dur="2s" begin="0s" fill="freeze" values="0; 0; 14.5; 0; 0; 0" keyTimes="0; 0.0454545; 0.159091; 0.3636` }}

                            />
                        ) : (
                            <Text style={{ fontSize: 56, marginBottom: 16 }}>❤️</Text>
                        )}
                        <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand', textAlign: 'center', marginBottom: 8 }}>
                            You're officially a Knot &amp; Bloom seller! 🌸
                        </Text>
                        <Text style={{ fontSize: 14, color: SUB, fontFamily: 'Quicksand', textAlign: 'center', lineHeight: 22, maxWidth: 360, marginBottom: 24 }}>
                            Your store is live and ready to bloom. Every great seller started with a single step — this is yours. We're rooting for you! 🌿
                        </Text>
                        <Pressable
                            onPress={handleDismissOnboarding}
                            // @ts-ignore
                            style={({ pressed, hovered }: any) => ({
                                backgroundColor: P,
                                paddingHorizontal: 28,
                                paddingVertical: 12,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                opacity: pressed ? 0.8 : hovered ? 0.9 : 1,
                                transform: [{ scale: pressed ? 0.96 : hovered ? 1.02 : 1 }],
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            })}
                        >
                            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Quicksand', fontWeight: '700' }}>Start selling →</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            ) : (
                /* Checklist view */
                <Animated.View style={{ opacity: checklistOpacity }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 6 }}>Welcome to Knot &amp; Bloom! 🎉</Text>
                            <Text style={{ fontSize: 14, color: SUB, fontFamily: 'Quicksand', lineHeight: 22 }}>Complete these essential steps to launch your store and start receiving orders from customers.</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563', fontFamily: 'Quicksand' }}>{completedSteps} / 4 Done</Text>
                            </View>
                            <TouchableOpacity onPress={handleDismissOnboarding} style={{ padding: 4 }}>
                                <XCircle size={20} color={SUB} />
                            </TouchableOpacity>
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

                        <TouchableOpacity style={s.onboardingRow} onPress={() => router.push('/seller-dashboard/payouts' as any)}>
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

                        <TouchableOpacity style={s.onboardingRow} onPress={() => setShareModalVisible(true)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: hasShared ? '#D1FAE5' : '#E0E7FF', alignItems: 'center', justifyContent: 'center' }}>
                                    {hasShared ? <CheckCircle size={20} color={GREEN} /> : <Users size={20} color={INDIGO} />}
                                </View>
                                <View>
                                    <Text style={[s.onboardingRowTxt, hasShared && { textDecorationLine: 'line-through', color: SUB }]}>Share your store link</Text>
                                    <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Let your network know you're open.</Text>
                                </View>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
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
                style={{ flex: 1 }}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P} />
                }
            >
                <View style={isDesktop ? s.desktopContainer : undefined}>
                    {dashboardContent}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            <ModalPortal>
                {shareModalVisible ? (
                    <View style={Platform.OS === 'web' ? {
                        position: 'fixed' as any,
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                        zIndex: 9999,
                    } : s.modalOverlay}>
                        <View style={s.modalContent}>
                            <View style={s.modalHeader}>
                                <Text style={s.modalTitle}>Share Your Store</Text>
                                <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                                    <XCircle size={24} color={SUB} />
                                </TouchableOpacity>
                            </View>

                            <Text style={{ fontSize: 14, color: SUB, fontFamily: 'Quicksand', marginBottom: 16, lineHeight: 22 }}>
                                Copy this link and share it on your social media, messaging apps, or anywhere you want to promote your handmade goods!
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TextInput
                                    style={{ flex: 1, height: 48, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, fontSize: 14, color: TEXT, fontFamily: 'Quicksand', outlineStyle: 'none' as any }}
                                    value={`knotandbloom.shop/shop/${user?.sellerProfile?.slug || ''}`}
                                    editable={false}
                                    selectTextOnFocus={true}
                                />
                                <TouchableOpacity
                                    style={{ width: 48, height: 48, backgroundColor: copied ? GREEN : P, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                                    onPress={async () => {
                                        const url = `knotandbloom.shop/shop/${user?.sellerProfile?.slug || ''}`;
                                        await Clipboard.setStringAsync(url);
                                        setCopied(true);
                                        setHasShared(true);
                                        AsyncStorage.setItem('onboarding_shared', 'true');
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                >
                                    {copied ? <Check size={20} color="#fff" /> : <Copy size={20} color="#fff" />}
                                </TouchableOpacity>
                            </View>
                            {copied && <Text style={{ color: GREEN, fontSize: 12, fontFamily: 'Quicksand', marginTop: 8, textAlign: 'center', fontWeight: '700' }}>Link copied to clipboard!</Text>}
                        </View>
                    </View>
                ) : null}
            </ModalPortal>
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

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand'
    }
});
