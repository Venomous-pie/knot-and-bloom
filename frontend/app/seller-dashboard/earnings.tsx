import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Wallet, TrendingUp, History, DollarSign, CreditCard } from 'lucide-react-native';
import Navbar from '@/shared/Navbar';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';

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
    const { token, user } = useAuth();
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
    }, [token]);

    const fetchEarnings = async () => {
        try {
            const response = await fetch(`${API_URL}/api/earnings/seller`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await response.json();
            if (response.ok) {
                setData(json);
            } else {
                Alert.alert("Error", json.error || "Failed to load earnings");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network connection failed");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || !withdrawDetails) {
            Alert.alert("Missing Info", "Please enter amount and account details");
            return;
        }
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid positive number");
            return;
        }
        if (amount > (data?.balance.available || 0)) {
            Alert.alert("Insufficient Funds", "You cannot withdraw more than your available balance");
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/earnings/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    method: withdrawMethod,
                    details: withdrawDetails
                })
            });
            const json = await response.json();
            if (response.ok) {
                Alert.alert("Success", "Withdrawal request submitted for approval.");
                setModalVisible(false);
                setWithdrawAmount('');
                setWithdrawDetails('');
                fetchEarnings(); // Refresh balance
            } else {
                Alert.alert("Error", json.error || "Withdrawal failed");
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed");
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
                <Navbar />
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color="#B36979" />
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
            <Navbar />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEarnings(); }} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#333" />
                    </Pressable>
                    <Text style={styles.title}>Earnings & Payouts</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Balance Cards */}
                <View style={styles.cardsContainer}>
                    {/* Available Balance - Main Card */}
                    <View style={styles.mainCard}>
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
                    </View>

                    {/* Pending & GMV Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <History size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.statValue}>{formatCurrency(data?.balance.pending || 0)}</Text>
                            <Text style={styles.statLabel}>Pending Clearance</Text>
                        </View>
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#E0E7FF' }]}>
                                <TrendingUp size={20} color="#4F46E5" />
                            </View>
                            <Text style={styles.statValue}>{formatCurrency(data?.balance.gmv || 0)}</Text>
                            <Text style={styles.statLabel}>Total Sales (GMV)</Text>
                        </View>
                    </View>
                </View>

                {/* Commission Breakdown Chart */}
                <View style={styles.chartSection}>
                    <Text style={styles.sectionTitle}>Revenue Breakdown</Text>
                    <View style={styles.chartCard}>
                        <View style={styles.barContainer}>
                            <View style={[styles.barPart, { flex: 95, backgroundColor: '#10B981', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]} />
                            <View style={[styles.barPart, { flex: 5, backgroundColor: '#EF4444', borderTopRightRadius: 8, borderBottomRightRadius: 8 }]} />
                        </View>
                        <View style={styles.legendContainer}>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                                <Text style={styles.legendText}>Net Earnings (95%)</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                <Text style={styles.legendText}>Platform Fee (5%)</Text>
                            </View>
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
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backButton: { padding: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Quicksand' },

    cardsContainer: { paddingHorizontal: 20, gap: 16 },
    mainCard: {
        backgroundColor: '#B36979',
        borderRadius: 16,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#B36979',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    mainCardLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4, fontFamily: 'Quicksand' },
    mainCardValue: { color: 'white', fontSize: 32, fontWeight: '700', fontFamily: 'Quicksand' },
    withdrawButton: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
    withdrawButtonText: { color: '#B36979', fontWeight: '600', fontSize: 14 },

    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
    statIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '700', color: '#111827', fontFamily: 'Quicksand' },
    statLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Quicksand' },

    historySection: { padding: 20, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, fontFamily: 'Quicksand' },
    historyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historyIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    historyTitle: { fontSize: 14, fontWeight: '600', color: '#374151', fontFamily: 'Quicksand' },
    historyDate: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Quicksand' },
    historyAmount: { fontSize: 16, fontWeight: '600', fontFamily: 'Quicksand' },
    emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24, gap: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', fontFamily: 'Quicksand' },
    modalSub: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, fontFamily: 'Quicksand' },
    methodRow: { flexDirection: 'row', gap: 12 },
    methodChip: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    methodChipActive: { borderColor: '#B36979', backgroundColor: '#FFF5F7' },
    methodText: { color: '#6B7280', fontWeight: '600' },
    methodTextActive: { color: '#B36979' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
    confirmButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#B36979', alignItems: 'center' },
    cancelButtonText: { color: '#374151', fontWeight: '600' },
    confirmButtonText: { color: 'white', fontWeight: '600' },

    // Chart & Filters
    chartSection: { paddingHorizontal: 20, marginTop: 10 },
    chartCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
    barContainer: { flexDirection: 'row', height: 24, width: '100%', marginBottom: 12 },
    barPart: { height: '100%' },
    legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 13, color: '#4B5563', fontFamily: 'Quicksand' },

    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 24, marginBottom: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    filterChipActive: { backgroundColor: '#FFF1F2', borderColor: '#B36979' },
    filterText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
    filterTextActive: { color: '#B36979' },
});
