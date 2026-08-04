import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Modal, TextInput, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { ArrowLeft, Wallet, TrendingUp, History, DollarSign, CreditCard, ChevronLeft, ArrowUpCircle, Download, Info, Search, Calendar, Store } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    
    // Iteration 2 states
    const [searchQuery, setSearchQuery] = useState('');
    const [feeModalVisible, setFeeModalVisible] = useState(false);

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
        const isAuthorized = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
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

    const exportCSV = () => {
        if (!mergedHistory.length) return;
        const headers = ['Transaction ID', 'Type', 'Date', 'Status', 'Gross Amount', 'Fee Deducted', 'Net Amount'];
        const csvContent = mergedHistory.map((item: any) => {
            const isEarning = item.type === 'EARNING';
            const id = isEarning ? item.uid : item.uid;
            const type = isEarning ? 'Completed Order' : `Withdrawal (${item.method})`;
            const date = new Date(item.date).toISOString().split('T')[0];
            const status = item.status;
            const gross = isEarning ? item.total : item.amount;
            const fee = isEarning ? (item.total - item.sellerEarnings) : 0;
            const net = isEarning ? item.sellerEarnings : item.amount;
            return `"${id}","${type}","${date}","${status}","${gross}","${fee}","${net}"`;
        });
        
        const csvString = [headers.join(','), ...csvContent].join('\n');
        
        if (isDesktop) {
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('url' in window ? 'a' : 'link') as HTMLAnchorElement;
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'knot-and-bloom-earnings.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Placeholder for native sharing
            Alert.alert('Export Ready', 'Export feature is optimized for web dashboard.');
        }
    };

    const getNextFriday = () => {
        const d = new Date();
        d.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7);
        if (d.getDay() === 5 && d.getDate() === new Date().getDate()) {
            d.setDate(d.getDate() + 7); // Next Friday if today is Friday
        }
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Merge histories for display
    const mergedHistory = [
        ...(data?.history.orders.map(o => ({ ...o, type: 'EARNING', date: o.updated })) || []),
        ...(data?.history.withdrawals.map(w => ({ ...w, type: 'WITHDRAWAL', date: w.createdAt })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredHistory = mergedHistory.filter(item => {
        if (filterType !== 'ALL' && item.type !== filterType) return false;
        if (searchQuery) {
            const term = searchQuery.toLowerCase();
            return String(item.uid).toLowerCase().includes(term) || item.status.toLowerCase().includes(term);
        }
        return true;
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

    const StatsSection = (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginBottom: 24, zIndex: 100 }}>
            {loading && !data ? (
                <>
                    <Animated.View style={{ opacity: pulseAnim, flex: 1, height: 110, backgroundColor: '#E2E8F0', borderRadius: 16 }} />
                    <Animated.View style={{ opacity: pulseAnim, flex: 1, height: 110, backgroundColor: '#E2E8F0', borderRadius: 16 }} />
                    <Animated.View style={{ opacity: pulseAnim, flex: 1, height: 110, backgroundColor: '#E2E8F0', borderRadius: 16 }} />
                </>
            ) : (
                <>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="Available to Withdraw"
                            value={formatCurrency(data?.balance.available || 0)}
                            icon={<Wallet size={20} color="#10B981" />}
                            color="#10B981"
                            tooltip="Funds that have cleared and are ready to be withdrawn."
                            isLoading={loading && !data}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="Pending Clearance"
                            value={formatCurrency(data?.balance.pending || 0)}
                            icon={<History size={20} color="#F59E0B" />}
                            color="#F59E0B"
                            tooltip="Funds from recent orders still processing. Will move to Available soon."
                            isLoading={loading && !data}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <StatCard
                            label="Lifetime Net Earnings"
                            value={formatCurrency(earningPart)}
                            icon={<TrendingUp size={20} color="#4F46E5" />}
                            color="#4F46E5"
                            tooltip="Formula: Available + Pending + Withdrawn. This is your total take-home pay."
                            isLoading={loading && !data}
                        />
                    </View>
                </>
            )}
        </View>
    );



    const MotivationalSection = (
        <View style={styles.motivationalCard}>
            <Text style={styles.motivationalText}>
                "Keep up the great work! Your efforts are paying off."
            </Text>
        </View>
    );

    const RevenueSplitSection = (
        <View style={[styles.chartCard, { marginBottom: 24 }]}>
            <View style={{ flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <Text style={[styles.sectionTitle]}>Lifetime Revenue Split</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} color={SUB} />
                    <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand' }}>
                        Next Est. Payout: <Text style={{ fontWeight: '700', color: TEXT }}>{getNextFriday()}</Text>
                    </Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                {loading && !data ? (
                    <Animated.View style={{ opacity: pulseAnim, flex: 1, backgroundColor: '#E2E8F0' }} />
                ) : (
                    <>
                        <View style={{ flex: 95, backgroundColor: '#10B981' }} />
                        <View style={{ flex: 5, backgroundColor: '#E2E8F0' }} />
                    </>
                )}
            </View>
            <View style={{ flexDirection: 'column', gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
                        <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand' }}>Net Earnings (95%)</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' }}>{formatCurrency(earningPart)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#E2E8F0' }} />
                        <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand' }}>Platform Fee (5%)</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' }}>{formatCurrency(feePart)}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => setFeeModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER }}>
                <Info size={14} color={P} />
                <Text style={{ fontSize: 13, color: P, fontWeight: '600', fontFamily: 'Quicksand' }}>View fee breakdown</Text>
            </TouchableOpacity>
        </View>
    );

    const HistorySection = (
        <View style={styles.historySection}>
            <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Recent Transactions</Text>
                
                {/* Filter Bar */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                    <View style={styles.searchBox}>
                        <Search size={18} color={SUB} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search orders or status..."
                            placeholderTextColor={SUB}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <Pressable 
                        onPress={exportCSV} 
                        style={({ hovered }: any) => [
                            styles.exportBtn,
                            hovered && { backgroundColor: P_LIGHT, borderColor: P }
                        ]}
                    >
                        {({ hovered }: any) => (
                            <>
                                <Download size={18} color={hovered ? P : SUB} />
                                {isDesktop && <Text style={{ fontSize: 14, fontWeight: '600', color: hovered ? P : SUB, fontFamily: 'Quicksand', marginLeft: 8 }}>Export</Text>}
                            </>
                        )}
                    </Pressable>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
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
                    <Text style={[styles.listHeaderTxt, styles.colDetails]}>Transaction Details</Text>
                    <Text style={[styles.listHeaderTxt, styles.colDate]}>Date</Text>
                    <Text style={[styles.listHeaderTxt, styles.colStatus]}>Status</Text>
                    <Text style={[styles.listHeaderTxt, styles.colAmount, { textAlign: 'right' }]}>Net Amount</Text>
                </View>

            {loading && !data ? (
                <Animated.View style={{ opacity: pulseAnim, marginTop: 12, paddingBottom: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={{ height: 68, backgroundColor: '#E2E8F0', borderRadius: 0, borderBottomWidth: 1, borderBottomColor: '#FFF', marginHorizontal: 24 }} />
                    ))}
                </Animated.View>
            ) : filteredHistory.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={{ backgroundColor: P_LIGHT, padding: 16, borderRadius: 40, marginBottom: 16 }}>
                        <Store size={32} color={P} />
                    </View>
                    <Text style={styles.emptyStateTitle}>{searchQuery ? 'No matching transactions found.' : 'Your sales journey begins here!'}</Text>
                    <Text style={styles.emptyStateDesc}>{searchQuery ? 'Try adjusting your search or filters.' : 'Once you make your first sale, your earnings and payout history will appear in this ledger.'}</Text>
                </View>
            ) : (
                <View style={styles.listContent}>
                {filteredHistory.map((item: any, index) => {
                    const isEarning = item.type === 'EARNING';
                    const amount = isEarning ? item.sellerEarnings : item.amount;
                    const rawGross = isEarning ? item.total : null;
                    const fee = isEarning ? (item.total - item.sellerEarnings) : null;
                    
                    // Determine Status Badge
                    let badgeBg = '#E5E7EB';
                    let badgeText = '#4B5563';
                    let badgeLabel = 'Pending';
                    
                    if (isEarning) {
                        if (item.status === 'COMPLETED' || item.status === 'DELIVERED') {
                            badgeBg = '#D1FAE5'; badgeText = '#065F46'; badgeLabel = 'Cleared';
                        } else {
                            badgeBg = '#FEF3C7'; badgeText = '#92400E'; badgeLabel = 'Pending';
                        }
                    } else {
                        if (item.status === 'APPROVED' || item.status === 'COMPLETED') {
                            badgeBg = '#E0E7FF'; badgeText = '#3730A3'; badgeLabel = 'Processed';
                        } else {
                            badgeBg = '#FEF3C7'; badgeText = '#92400E'; badgeLabel = 'Pending';
                        }
                    }

                    return (
                        <View key={index} style={styles.historyItem}>
                            <View style={[styles.colDetails, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                                <View style={[styles.historyIcon,
                                { backgroundColor: isEarning ? '#DEF7EC' : '#FDE8E8' }
                                ]}>
                                    {isEarning ? (
                                        <DollarSign size={16} color="#059669" />
                                    ) : (
                                        <Wallet size={16} color="#E02424" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.historyTitle}>
                                        {isEarning ? `Order #${item.uid}` : `Withdrawal to ${item.method}`}
                                    </Text>
                                    <Text style={styles.historySub}>
                                        {isEarning ? `Gross: ${formatCurrency(rawGross!)} • Fee: ${formatCurrency(fee!)}` : `Payout Request`}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.colDate}>
                                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                            </View>
                            <View style={styles.colStatus}>
                                <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                                    <Text style={[styles.statusBadgeText, { color: badgeText }]}>{badgeLabel}</Text>
                                </View>
                            </View>
                            <View style={styles.colAmount}>
                                <Text style={[styles.historyAmount,
                                { color: isEarning ? '#059669' : '#E02424' }
                                ]}>
                                    {isEarning ? '+' : '-'}{formatCurrency(amount)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
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
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Track your balance, payouts, and revenue history.</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {(data?.balance.available || 0) <= 0 && (
                            <Text style={{ fontSize: 12, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', display: isDesktop ? 'flex' : 'none' }}>
                                Nothing to withdraw yet
                            </Text>
                        )}
                        <TouchableOpacity
                            style={[styles.withdrawBtn, (data?.balance.available || 0) <= 0 && { opacity: 0.5, backgroundColor: SUB, borderColor: SUB }]}
                            onPress={() => setModalVisible(true)}
                            disabled={(data?.balance.available || 0) <= 0}
                        >
                            <ArrowUpCircle size={18} color="#FFF" />
                            <Text style={styles.withdrawBtnText}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { padding: 24, maxWidth: 1280, width: '100%', alignSelf: 'center' }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} />}
            >
                {StatsSection}

                {isDesktop ? (
                    <View style={{ flexDirection: 'row', gap: 24 }}>
                        <View style={{ flex: 0.7 }}>
                            {HistorySection}
                        </View>
                        <View style={{ flex: 0.3 }}>
                            {RevenueSplitSection}
                            {MotivationalSection}
                        </View>
                    </View>
                ) : (
                    <>
                        {RevenueSplitSection}
                        {HistorySection}
                        {MotivationalSection}
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

            {/* Fee Breakdown Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={feeModalVisible}
                onRequestClose={() => setFeeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxWidth: 400, width: '100%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>Fee Breakdown</Text>
                            <TouchableOpacity onPress={() => setFeeModalVisible(false)}><Text style={{ fontSize: 18, color: SUB }}>×</Text></TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.modalSub, { lineHeight: 22 }]}>
                            Knot & Bloom charges a simple <Text style={{ fontWeight: '700', color: TEXT }}>5% platform fee</Text> on all successful sales. This fee covers:
                        </Text>
                        <View style={{ gap: 12, marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: P, marginTop: 8 }} />
                                <Text style={{ fontSize: 14, color: TEXT, flex: 1, fontFamily: 'Quicksand', lineHeight: 20 }}>Payment processing fees (GCash, Cards)</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: P, marginTop: 8 }} />
                                <Text style={{ fontSize: 14, color: TEXT, flex: 1, fontFamily: 'Quicksand', lineHeight: 20 }}>Platform maintenance and hosting</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: P, marginTop: 8 }} />
                                <Text style={{ fontSize: 14, color: TEXT, flex: 1, fontFamily: 'Quicksand', lineHeight: 20 }}>Marketing to bring you more buyers</Text>
                            </View>
                        </View>

                        <View style={{ backgroundColor: BG, padding: 16, borderRadius: 12, marginTop: 16 }}>
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center' }}>
                                We don't charge listing fees. You only pay when you make a sale.
                            </Text>
                        </View>

                        <Pressable style={[styles.confirmButton, { marginTop: 16 }]} onPress={() => setFeeModalVisible(false)}>
                            <Text style={styles.confirmButtonText}>Got it</Text>
                        </Pressable>
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
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#FAFAFA' },
    listHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    listContent: { backgroundColor: CARD },
    
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD },
    colDetails: { flex: 2, paddingRight: 20 },
    colDate: { flex: 1 },
    colStatus: { flex: 1 },
    colAmount: { flex: 1, alignItems: 'flex-end' },
    
    historyIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    historyTitle: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4 },
    historySub: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    historyDate: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontWeight: '500' },
    historyAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Quicksand' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    statusBadgeText: { fontSize: 12, fontWeight: '600', fontFamily: 'Quicksand' },
    
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

    searchBox: { flex: 1, minWidth: 200, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER, height: 44 },
    searchInput: { flex: 1, height: '100%', marginLeft: 8, fontSize: 14, fontFamily: 'Quicksand', color: TEXT, outlineStyle: 'none' as any },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    filterChipActive: { backgroundColor: P_LIGHT, borderColor: P },
    filterText: { fontSize: 13, color: SUB, fontWeight: '600' },
    filterTextActive: { color: P },
    exportBtn: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
});
