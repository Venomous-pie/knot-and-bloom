import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/api/api';
import { ArrowLeft, Wallet, TrendingUp, History, DollarSign, CreditCard, ChevronLeft, ArrowUpCircle } from 'lucide-react-native';
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

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={P} />
                </View>
            </View>
        );
    }

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
            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} />}
                >

                    {/* Balance Cards */}
                <View style={styles.cardsContainer}>
                    {/* Available Balance - Main Card */}
                    <LinearGradient colors={['#B36979', '#8F4A5A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mainCard}>
                        <View>
                            <Text style={styles.mainCardLabel}>Available Balance</Text>
                            <Text style={styles.mainCardValue}>{formatCurrency(data?.balance.available || 0)}</Text>
                        </View>
                        <Pressable
                            style={styles.withdrawButton}
                            onPress={() => setModalVisible(true)}
                            disabled={(data?.balance.available || 0) <= 0}
                        >
                            <Text style={styles.withdrawButtonText}>Withdraw</Text>
                        </Pressable>
                    </LinearGradient>

                    {/* Pending & GMV Row */}
                    <View style={[styles.statsRow, { zIndex: 100, overflow: 'visible', marginTop: 16 }]}>
                        <StatCard
                            label="Pending Clearance"
                            value={formatCurrency(data?.balance.pending || 0)}
                            icon={<History size={20} color="#F59E0B" />}
                            color="#F59E0B"
                            tooltip="Funds from recent orders that are still processing or in transit."
                        />
                        <StatCard
                            label="Total Sales (GMV)"
                            value={formatCurrency(data?.balance.gmv || 0)}
                            icon={<TrendingUp size={20} color="#4F46E5" />}
                            color="#4F46E5"
                            tooltip="Gross Merchandise Value: the total value of all items you've sold."
                        />
                    </View>
                </View>

                {/* Explanation Box */}
                <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                    <View style={{ backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
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
                </View>

                {/* Filters */}
                <View style={styles.filterRow}>
                    {['ALL', 'EARNING', 'WITHDRAWAL'].map(type => (
                        <Pressable
                            key={type}
                            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                            onPress={() => setFilterType(type as any)}
                        >
                            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                                {type === 'ALL' ? 'All Transactions' : type === 'EARNING' ? 'Earnings' : 'Withdrawals'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Transaction History */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {filteredHistory.length === 0 ? (
                        <Text style={styles.emptyText}>No transactions found.</Text>
                    ) : (
                        filteredHistory.map((item: any, index) => (
                            <View key={index} style={styles.historyItem}>
                                <View style={styles.historyLeft}>
                                    <View style={[styles.historyIcon,
                                    { backgroundColor: item.type === 'EARNING' ? '#DEF7EC' : '#FDE8E8' }
                                    ]}>
                                        {item.type === 'EARNING' ? (
                                            <DollarSign size={16} color="#059669" />
                                        ) : (
                                            <Wallet size={16} color="#E02424" />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={styles.historyTitle}>
                                            {item.type === 'EARNING' ? `Order #${item.uid}` : `Withdrawal (${item.status})`}
                                        </Text>
                                        <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.historyAmount,
                                { color: item.type === 'EARNING' ? '#059669' : '#E02424' }
                                ]}>
                                    {item.type === 'EARNING' ? '+' : '-'}{formatCurrency(item.type === 'EARNING' ? item.sellerEarnings : item.amount)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
                </ScrollView>
            </View>

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
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    withdrawBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },

    cardsContainer: { paddingHorizontal: 20, gap: 16 },
    mainCard: {
        borderRadius: 24,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#B36979',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    mainCardLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4, fontFamily: 'Quicksand', fontWeight: '500' },
    mainCardValue: { color: 'white', fontSize: 34, fontWeight: '800', fontFamily: 'Quicksand' },
    withdrawButton: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
    withdrawButtonText: { color: P, fontWeight: '600', fontSize: 14 },

    statsRow: { flexDirection: 'row', gap: 16 },

    historySection: { padding: 20, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 16, fontFamily: 'Quicksand' },
    historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CARD, padding: 20, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    historyTitle: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    historyDate: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    historyAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'Quicksand' },
    emptyText: { textAlign: 'center', color: SUB, marginTop: 20 },

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
    chartSection: { paddingHorizontal: 20, marginTop: 10 },
    chartCard: { backgroundColor: CARD, padding: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER },
    barContainer: { flexDirection: 'row', height: 24, width: '100%', marginBottom: 16 },
    barPart: { height: '100%' },
    legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 24, marginBottom: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    filterChipActive: { backgroundColor: P_LIGHT, borderColor: P },
    filterText: { fontSize: 13, color: SUB, fontWeight: '600' },
    filterTextActive: { color: P },
});
