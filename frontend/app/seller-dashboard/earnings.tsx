import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Modal, TextInput, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/api/api';
import { ArrowLeft, Wallet, TrendingUp, History, DollarSign, CreditCard, ChevronLeft, ArrowUpCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-gifted-charts';
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
const TEAL    = '#14B8A6';

interface EarningsData {
    balance: {
        pending: number;
        available: number;
        withdrawn: number;
        gmv: number;
    };
    history: {
        orders: Array<{
            uid: number;
            referenceNumber: string;
            total: number;
            sellerEarnings: number;
            updated: string;
            status: string;
        }>;
        withdrawals: Array<{
            uid: number;
            amount: number;
            status: string;
            createdAt: string;
            method: string;
        }>;
    };
}

export default function SellerEarnings() {
    const router = useRouter();
    const { user } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<EarningsData | null>(null);
    const [filterType, setFilterType] = useState<'ALL' | 'EARNING' | 'WITHDRAWAL'>('ALL');

    // Withdrawal Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('GCASH'); // Default
    const [withdrawDetails, setWithdrawDetails] = useState(''); // Number/Account Name
    const [submitting, setSubmitting] = useState(false);
    const [chartMode, setChartMode] = useState<'GMV' | 'NET'>('GMV');

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

    // Auth guard: only ACTIVE sellers or admins can access
    useEffect(() => {
        if (!user) {
            router.replace('/auth/login' as any);
            return;
        }
        const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
        if (!isAuthorized) {
            router.replace('/' as any);
        }
    }, [user]);

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            const res = await apiClient.get('/earnings/seller');
            setData(res.data);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', error?.response?.data?.error || 'Failed to load earnings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || !withdrawDetails) {
            Alert.alert('Missing Info', 'Please enter amount and account details');
            return;
        }
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive number');
            return;
        }
        if (amount > (data?.balance.available || 0)) {
            Alert.alert('Insufficient Funds', 'You cannot withdraw more than your available balance');
            return;
        }
        setSubmitting(true);
        try {
            await apiClient.post('/earnings/withdraw', {
                amount,
                method: withdrawMethod,
                details: withdrawDetails,
            });
            Alert.alert('Success', 'Withdrawal request submitted for approval.');
            setModalVisible(false);
            setWithdrawAmount('');
            setWithdrawDetails('');
            fetchEarnings();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.error || 'Withdrawal failed');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Merge histories for display
    const mergedHistory = [
        ...(data?.history.orders.map(o => ({ ...o, type: 'EARNING', date: o.updated })) || []),
        ...(data?.history.withdrawals.map(w => ({ ...w, type: 'WITHDRAWAL', date: w.createdAt })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredHistory = mergedHistory.filter(item => {
        if (filterType === 'ALL') return true;
        return item.type === filterType;
    });

    // Commission Data
    const totalGmv = data?.balance.gmv || 0;
    // Assuming 5% fee roughly or calculated from orders if needed. 
    // For visualization let's use the actual sums from history actions if available, but 'data.balance' has totals.
    // We'll approximate visual based on loaded data or just Fixed 5% vs 95% if strictly platform rule.
    // Let's use strict logic: Fees = GMV - Earnings (Total). 
    // But data.balance might not have totalEarnings lifetime. 
    // We'll just show the breakdown of the "Pending + Available" roughly?
    // Actually, let's visualize the "Recent Transactions" split if meaningful, or just a static explanation of the spread.
    // Better: A generic "Revenue Split" bar showing the user's effective take rate.

    // Total Revenue Context
    const revenueDisplay = totalGmv > 0 ? totalGmv : 1;
    const feePart = revenueDisplay * 0.05; // 5% Platform Fee
    const earningPart = revenueDisplay * 0.95;

    // Chart processing
    
    const generateChartData = () => {
        if (!data?.history?.orders || data.history.orders.length === 0) {
            return { gmvData: [{ value: 0, label: '' }], netData: [{ value: 0, label: '' }] };
        }
        
        const grouped: Record<string, { gmv: number, net: number }> = {};
        const sortedOrders = [...data.history.orders].sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());
        
        sortedOrders.forEach(order => {
            const dateObj = new Date(order.updated);
            const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!grouped[dateLabel]) {
                grouped[dateLabel] = { gmv: 0, net: 0 };
            }
            grouped[dateLabel].gmv += order.total;
            grouped[dateLabel].net += order.sellerEarnings;
        });

        const gmvData = Object.keys(grouped).map(key => ({ value: grouped[key].gmv, label: key }));
        const netData = Object.keys(grouped).map(key => ({ value: grouped[key].net, label: key }));
        
        return { gmvData, netData };
    };
    
    const { gmvData, netData } = generateChartData();
    const chartWidth = isDesktop
        ? ((Math.min(width - 260, 1280) * 0.65) - 80)
        : width - 88;

    const StatsSection = (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 24, marginBottom: 24, zIndex: 100 }}>
            <LinearGradient colors={['#B36979', '#8F4A5A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mainCard, { flex: isDesktop ? 0.4 : 1 }]}>
                <View>
                    <Text style={styles.mainCardLabel}>Available Balance</Text>
                    {loading && !data ? (
                        <Animated.View style={{ opacity: pulseAnim, width: 120, height: 40, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, marginBottom: 24 }} />
                    ) : (
                        <Text style={styles.mainCardValue}>{formatCurrency(data?.balance.available || 0)}</Text>
                    )}
                </View>
                <Pressable
                    style={styles.withdrawButton}
                    onPress={() => setModalVisible(true)}
                    disabled={(data?.balance.available || 0) <= 0 || (loading && !data)}
                >
                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                </Pressable>
            </LinearGradient>

            <View style={{ flex: isDesktop ? 0.6 : 1, flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                <StatCard
                    label="Pending Clearance"
                    value={formatCurrency(data?.balance.pending || 0)}
                    icon={<History size={20} color="#F59E0B" />}
                    color="#F59E0B"
                    tooltip="Funds from recent orders that are still processing or in transit."
                    isLoading={loading && !data}
                />
                <StatCard
                    label="Total Sales (GMV)"
                    value={formatCurrency(data?.balance.gmv || 0)}
                    icon={<TrendingUp size={20} color="#4F46E5" />}
                    color="#4F46E5"
                    tooltip="Gross Merchandise Value: the total value of all items you've sold."
                    isLoading={loading && !data}
                />
            </View>
        </View>
    );

    const ExplanationSection = (
        <View style={{ backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <View style={{ backgroundColor: '#BAE6FD', padding: 8, borderRadius: 20 }}>
                <DollarSign size={16} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0369A1', marginBottom: 4, fontFamily: 'Quicksand' }}>How your earnings work</Text>
                <Text style={{ fontSize: 13, color: '#0C4A6E', fontFamily: 'Quicksand', lineHeight: 20 }}>
                    Knot & Bloom deducts a standard 5% platform fee from completed orders. Your Available and Pending balances reflect your net earnings after this fee is applied.
                </Text>
            </View>
        </View>
    );

    const MotivationalSection = (
        <View style={styles.motivationalCard}>
            <Text style={styles.motivationalText}>
                "Keep up the great work! Your efforts are paying off."
            </Text>
        </View>
    );

    const ChartsSection = (
        <View style={[styles.chartCard, { marginBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={{ flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 4 }}>
                    <Pressable onPress={() => setChartMode('GMV')} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }, chartMode === 'GMV' && { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}>
                        <Text style={[{ fontSize: 12, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' }, chartMode === 'GMV' && { color: P }]}>GMV</Text>
                    </Pressable>
                    <Pressable onPress={() => setChartMode('NET')} style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }, chartMode === 'NET' && { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}>
                        <Text style={[{ fontSize: 12, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' }, chartMode === 'NET' && { color: P }]}>Net</Text>
                    </Pressable>
                </View>
            </View>
            
            <View style={{ alignItems: isDesktop ? 'center' : 'flex-start', marginLeft: -8 }}>
                {loading && !data ? (
                    <Animated.View style={{ opacity: pulseAnim, width: chartWidth, height: 220, backgroundColor: '#E2E8F0', borderRadius: 12, marginVertical: 16 }} />
                ) : chartMode === 'GMV' ? (
                    <BarChart
                        data={gmvData}
                        width={chartWidth}
                        height={220}
                        barWidth={32}
                        spacing={24}
                        roundedTop
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: SUB, fontSize: 11, fontFamily: 'Quicksand' }}
                        xAxisLabelTextStyle={{ color: SUB, fontSize: 11, fontFamily: 'Quicksand' }}
                        noOfSections={4}
                        frontColor={INDIGO}
                        isAnimated
                    />
                ) : (
                    <LineChart
                        data={netData}
                        width={chartWidth}
                        height={220}
                        thickness={3}
                        color={TEAL}
                        dataPointsColor={TEAL}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: SUB, fontSize: 11, fontFamily: 'Quicksand' }}
                        xAxisLabelTextStyle={{ color: SUB, fontSize: 11, fontFamily: 'Quicksand' }}
                        noOfSections={4}
                        isAnimated
                        areaChart
                        startFillColor={`${TEAL}40`}
                        endFillColor={`${TEAL}00`}
                    />
                )}
            </View>
        </View>
    );

    const HistorySection = (
        <View style={styles.historySection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                
                {/* Filters */}
                <View style={styles.filterRow}>
                    {['ALL', 'EARNING', 'WITHDRAWAL'].map(type => (
                        <Pressable
                            key={type}
                            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                            onPress={() => setFilterType(type as any)}
                        >
                            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                                {type === 'ALL' ? 'All' : type === 'EARNING' ? 'Earnings' : 'Withdrawals'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
            
            <View style={styles.listWrapper}>
                <View style={styles.listHeaderRow}>
                    <Text style={[styles.listHeaderTxt, styles.colIcon]}></Text>
                    <Text style={[styles.listHeaderTxt, styles.colDetails]}>Transaction Details</Text>
                    <Text style={[styles.listHeaderTxt, styles.colDate]}>Date</Text>
                    <Text style={[styles.listHeaderTxt, styles.colAmount, { textAlign: 'right' }]}>Amount</Text>
                </View>

            {loading && !data ? (
                <Animated.View style={{ opacity: pulseAnim, marginTop: 12, paddingBottom: 16 }}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{ height: 60, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 12, marginHorizontal: 24 }} />
                    ))}
                </Animated.View>
            ) : filteredHistory.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No transactions yet.</Text>
                    <Text style={styles.emptyStateDesc}>Your earnings and payout history will appear here once you start making sales.</Text>
                </View>
            ) : (
                <View style={styles.listContent}>
                {filteredHistory.map((item: any, index) => (
                    <View key={index} style={styles.historyItem}>
                        <View style={styles.colIcon}>
                            <View style={[styles.historyIcon,
                            { backgroundColor: item.type === 'EARNING' ? '#DEF7EC' : '#FDE8E8' }
                            ]}>
                                {item.type === 'EARNING' ? (
                                    <DollarSign size={16} color="#059669" />
                                ) : (
                                    <Wallet size={16} color="#E02424" />
                                )}
                            </View>
                        </View>
                        <View style={styles.colDetails}>
                            <Text style={styles.historyTitle}>
                                {item.type === 'EARNING' ? `Order #${item.uid}` : `Withdrawal (${item.status})`}
                            </Text>
                            <Text style={styles.historySub}>
                                {item.type === 'EARNING' ? 'Completed Order' : 'Payout Request'}
                            </Text>
                        </View>
                        <View style={styles.colDate}>
                            <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                        </View>
                        <View style={styles.colAmount}>
                            <Text style={[styles.historyAmount,
                            { color: item.type === 'EARNING' ? '#059669' : '#E02424' }
                            ]}>
                                {item.type === 'EARNING' ? '+' : '-'}{formatCurrency(item.type === 'EARNING' ? item.sellerEarnings : item.amount)}
                            </Text>
                        </View>
                    </View>
                ))}
                </View>
            )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Page Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Earnings & Payouts</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.withdrawBtn}
                        onPress={() => setModalVisible(true)}
                    >
                        <ArrowUpCircle size={18} color="#FFF" />
                        <Text style={styles.withdrawBtnText}>Withdraw</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { padding: 24, maxWidth: 1280, width: '100%', alignSelf: 'center' }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} />}
            >
                {StatsSection}

                {isDesktop ? (
                    <View style={{ flexDirection: 'row', gap: 24 }}>
                        <View style={{ flex: 0.65 }}>
                            {ChartsSection}
                            {HistorySection}
                        </View>
                        <View style={{ flex: 0.35 }}>
                            {ExplanationSection}
                            {MotivationalSection}
                        </View>
                    </View>
                ) : (
                    <>
                        {ExplanationSection}
                        {MotivationalSection}
                        {ChartsSection}
                        {HistorySection}
                    </>
                )}
            </ScrollView>

            {/* Withdrawal Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Request Payout</Text>
                        <Text style={styles.modalSub}>Current Available: {formatCurrency(data?.balance.available || 0)}</Text>

                        {/* Amount */}
                        <Text style={styles.inputLabel}>Amount (₱)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            placeholder="0.00"
                            value={withdrawAmount}
                            onChangeText={setWithdrawAmount}
                        />

                        {/* Method Selection (Simple buttons for now) */}
                        <Text style={styles.inputLabel}>Payout Method</Text>
                        <View style={styles.methodRow}>
                            {['GCASH', 'BANK'].map(m => (
                                <Pressable
                                    key={m}
                                    style={[styles.methodChip, withdrawMethod === m && styles.methodChipActive]}
                                    onPress={() => setWithdrawMethod(m)}
                                >
                                    <Text style={[styles.methodText, withdrawMethod === m && styles.methodTextActive]}>{m}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Details */}
                        <Text style={styles.inputLabel}>Account Details</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            multiline
                            placeholder={withdrawMethod === 'GCASH' ? "e.g. 0917-XXX-XXXX (Juan Dela Cruz)" : "Bank Name, Account Name, Account Number"}
                            value={withdrawDetails}
                            onChangeText={setWithdrawDetails}
                        />

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.confirmButton, submitting && { opacity: 0.7 }]}
                                onPress={handleWithdraw}
                                disabled={submitting}
                            >
                                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    content: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
    withdrawBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },

    cardsContainer: { gap: 16 },
    mainCard: {
        borderRadius: 24,
        padding: 24,
        justifyContent: 'center',
        shadowColor: '#B36979',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    mainCardLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 8, fontFamily: 'Quicksand', fontWeight: '500' },
    mainCardValue: { color: 'white', fontSize: 36, fontWeight: '800', fontFamily: 'Quicksand', marginBottom: 24 },
    withdrawButton: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, alignItems: 'center' },
    withdrawButtonText: { color: P, fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },

    historySection: { marginTop: 0 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    
    listWrapper: { flex: 1, width: '100%', backgroundColor: CARD, borderRadius: 24, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
    listHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    listContent: { backgroundColor: CARD },
    
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD },
    colIcon: { width: 50 },
    colDetails: { flex: 1, paddingRight: 20 },
    colDate: { width: 120 },
    colAmount: { width: 120, alignItems: 'flex-end' },
    
    historyIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    historyTitle: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    historySub: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    historyDate: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    historyAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Quicksand' },
    
    emptyText: { textAlign: 'center', color: SUB, marginTop: 20 },
    emptyState: { paddingVertical: 40, alignItems: 'center', backgroundColor: CARD },
    emptyStateTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    emptyStateDesc: { fontSize: 14, color: SUB, textAlign: 'center', maxWidth: 300, fontFamily: 'Quicksand' },
    
    motivationalCard: { backgroundColor: '#FDF2F4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FCE7EB' },
    motivationalText: { fontSize: 14, fontWeight: '600', color: P, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 24, gap: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    modalSub: { fontSize: 14, color: SUB, marginBottom: 8 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
    input: { borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, fontSize: 16, fontFamily: 'Quicksand', backgroundColor: BG },
    methodRow: { flexDirection: 'row', gap: 12 },
    methodChip: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
    methodChipActive: { borderColor: P, backgroundColor: P_LIGHT },
    methodText: { color: SUB, fontWeight: '600' },
    methodTextActive: { color: P },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: BG, alignItems: 'center' },
    confirmButton: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: P, alignItems: 'center' },
    cancelButtonText: { color: TEXT, fontWeight: '600' },
    confirmButtonText: { color: 'white', fontWeight: '600' },

    // Chart & Filters
    chartSection: { marginTop: 10 },
    chartCard: { backgroundColor: CARD, padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: BORDER },
    barContainer: { flexDirection: 'row', height: 24, width: '100%', marginBottom: 16 },
    barPart: { height: '100%' },
    legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },

    filterRow: { flexDirection: 'row', gap: 10 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    filterChipActive: { backgroundColor: P_LIGHT, borderColor: P },
    filterText: { fontSize: 13, color: SUB, fontWeight: '600' },
    filterTextActive: { color: P },
});
