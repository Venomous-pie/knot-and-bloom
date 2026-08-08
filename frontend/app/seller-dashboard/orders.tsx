import { useAuth } from "@/contexts/AuthContext";
import { sellerOrdersAPI } from "@/services/api";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, Modal, Pressable, ScrollView, Animated } from "react-native";
import { ChevronRight, Search, Filter, ArrowDownUp, CheckSquare, Square, ChevronLeft, AlertTriangle, Clock, TrendingUp, Package, X, RefreshCw } from 'lucide-react-native';
import * as Print from 'expo-print';
import { uploadToImageKit } from '@/lib/imagekit';

import type { Order } from '@/types/order';
import OrderCard from '@/components/seller/orders/OrderCard';
import ShipOrderModal, { ShipFormData } from '@/components/seller/orders/ShipOrderModal';
import AcceptOrderModal, { AcceptFormData } from '@/components/seller/orders/AcceptOrderModal';
import RejectOrderModal, { RejectFormData } from '@/components/seller/orders/RejectOrderModal';
import BulkActionBar from '@/components/seller/orders/BulkActionBar';
import Tooltip from '@/components/ui/Tooltip';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import { toastEvents } from "@/utils/toastEvents";

const P = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const INDIGO = '#6366F1';
const TEAL = '#14B8A6';
const BLUE = '#3B82F6';
const PINK = '#EC4899';

const LATE_THRESHOLD_DAYS = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getStatusColor = (status: string) => {
    switch (status) {
        case 'PENDING': return AMBER;
        case 'CONFIRMED': return '#0EA5E9'; // Sky blue to contrast with indigo
        case 'IN_PRODUCTION': return INDIGO;
        case 'READY_TO_SHIP': return PINK;
        case 'SHIPPED': return GREEN;
        case 'DELIVERED': return TEAL;
        case 'COMPLETED': return GREEN;
        case 'CANCELLED': return RED;
        case 'DISPUTED': return RED;
        default: return SUB;
    }
};

const getOrderProcessingDays = (order: Order): number => {
    let maxDays = LATE_THRESHOLD_DAYS;

    order.items?.forEach(item => {
        const pt = (item.product as any)?.processingTime;
        if (!pt) return;

        let days = 0;
        const nums = pt.match(/\d+/g);
        if (nums && nums.length > 0) {
            days = Math.max(...nums.map(Number));
        }

        if (pt.toLowerCase().includes('week')) {
            days *= 7;
        } else if (pt.toLowerCase().includes('month')) {
            days *= 30;
        }

        if (days > maxDays) {
            maxDays = days;
        }
    });

    return maxDays;
};

export default function SellerOrders() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ filter?: string }>();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

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

    // Filters and Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(params.filter || 'ALL');
    const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'MOST_OVERDUE'>('NEWEST');

    useEffect(() => {
        if (params.filter) {
            setStatusFilter(params.filter);
        }
    }, [params.filter]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    // Modal State
    const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<Order | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [shipModalVisible, setShipModalVisible] = useState(false);
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Safeguard queue for quick actions
    const pendingUpdates = useRef<{ [uid: number]: ReturnType<typeof setTimeout> }>({});

    // Bulk Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!isAuthorized) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        const targetSellerId = user?.sellerProfile?.uid;
        if (!targetSellerId && user?.role !== 'ADMIN') return;
        if (!targetSellerId) return;

        try {
            setLoading(true);
            const res = await sellerOrdersAPI.getSellerOrders(targetSellerId);
            setOrders(res.data.orders || (Array.isArray(res.data) ? res.data : []));
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.sellerProfile?.uid) fetchOrders();
    }, [user]);

    // Data Processing (Stats, Filter, Sort)
    const processedData = useMemo(() => {
        const now = Date.now();
        const startOfWeek = now - 7 * ONE_DAY_MS;

        let overdueCount = 0;
        let pendingCount = 0;
        let processingCount = 0;
        let weeklyEarnings = 0;

        orders.forEach(o => {
            const isCompleted = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status);
            const dueDate = new Date(o.uploaded).getTime() + (getOrderProcessingDays(o) * ONE_DAY_MS);
            if (!isCompleted && now > dueDate) overdueCount++;

            if (o.status === 'PENDING') pendingCount++;
            if (['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(o.status)) processingCount++;

            if (isCompleted && o.status !== 'CANCELLED' && o.status !== 'REFUNDED') {
                if (new Date(o.uploaded).getTime() >= startOfWeek) {
                    weeklyEarnings += Number(o.sellerEarnings || o.total);
                }
            }
        });

        // Filter
        let filtered = orders.filter(o => {
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'PROCESSING') {
                    if (!['CONFIRMED', 'IN_PRODUCTION', 'READY_TO_SHIP'].includes(o.status)) return false;
                } else if (statusFilter === 'OVERDUE') {
                    const isCompleted = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status);
                    const dueDate = new Date(o.uploaded).getTime() + (getOrderProcessingDays(o) * ONE_DAY_MS);
                    if (isCompleted || now <= dueDate) return false;
                } else if (o.status !== statusFilter) {
                    return false;
                }
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchId = String(o.uid).includes(q);
                const matchName = o.customer?.name?.toLowerCase().includes(q);
                const matchItem = o.items.some(i => i.product?.name?.toLowerCase().includes(q));
                if (!matchId && !matchName && !matchItem) return false;
            }
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            const aIsCompleted = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(a.status);
            const bIsCompleted = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.status);
            const aDue = new Date(a.uploaded).getTime() + (getOrderProcessingDays(a) * ONE_DAY_MS);
            const bDue = new Date(b.uploaded).getTime() + (getOrderProcessingDays(b) * ONE_DAY_MS);
            const aOverdue = !aIsCompleted && now > aDue;
            const bOverdue = !bIsCompleted && now > bDue;

            // Overdue always at the top
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;

            if (sortBy === 'MOST_OVERDUE') {
                // If both overdue, sort by how overdue they are (earliest due date first)
                if (aOverdue && bOverdue) return aDue - bDue;
                // Otherwise sort by soonest due date
                return aDue - bDue;
            } else if (sortBy === 'OLDEST') {
                return new Date(a.uploaded).getTime() - new Date(b.uploaded).getTime();
            } else {
                return new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime();
            }
        });

        return {
            filtered,
            stats: { overdueCount, pendingCount, processingCount, weeklyEarnings }
        };
    }, [orders, searchQuery, statusFilter, sortBy]);

    const { filtered, stats } = processedData;
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    const paginatedOrders = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Page reset on filter change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortBy]);

    // Handlers
    const handleUpdateStatus = async (status: string, extraData: any = {}, orderOverrides?: Order[]) => {
        const targets = orderOverrides || (selectedOrder ? [selectedOrder] : []);
        if (targets.length === 0) return false;

        try {
            setSubmitting(true);
            await Promise.all(targets.map(async (order) => {
                const res = await sellerOrdersAPI.updateOrderStatus(order.uid, { status, ...extraData });
                const data = res.data;
                if (data.success) {
                    setOrders(prev => prev.map(o => o.uid === order.uid ? { ...o, ...data.order } : o));
                }
            }));
            Alert.alert("Success", targets.length > 1 ? "Bulk update completed" : `Order updated to ${status}`);
            closeAllModals();
            return true;
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Something went wrong.");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const closeAllModals = () => {
        setShipModalVisible(false);
        setAcceptModalVisible(false);
        setRejectModalVisible(false);
        setSelectedOrder(null);
        setSelectedOrderForDetail(null);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === paginatedOrders.length && paginatedOrders.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedOrders.map(o => o.uid)));
        }
    };

    const openActionModal = (order: Order, type: 'ship' | 'accept' | 'reject') => {
        setSelectedOrderForDetail(null); // Close detail modal if open
        setSelectedOrder(order);
        if (type === 'ship') setShipModalVisible(true);
        if (type === 'accept') setAcceptModalVisible(true);
        if (type === 'reject') setRejectModalVisible(true);
    };

    const handleQuickActionSafe = (status: string, order: Order) => {
        let actionName = status.replace(/_/g, ' ');
        if (status === 'IN_PRODUCTION') actionName = 'Start Production';
        else if (status === 'READY_TO_SHIP') actionName = 'Mark Ready to Ship';

        Alert.alert("Confirm Action", `Are you sure you want to ${actionName.toLowerCase()} for Order #${order.referenceNumber || order.uid}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Yes, Confirm",
                onPress: () => {
                    // 1. Optimistic Update
                    const originalStatus = order.status;
                    setOrders(prev => prev.map(o => o.uid === order.uid ? { ...o, status } : o));

                    // If in detail view, update that too optimistically
                    if (selectedOrderForDetail?.uid === order.uid) {
                        setSelectedOrderForDetail({ ...selectedOrderForDetail, status });
                    }

                    // 2. Show Undo Toast
                    toastEvents.emit({
                        message: `Order #${order.referenceNumber || order.uid} moved to ${status.replace(/_/g, ' ')}`,
                        type: 'INFO',
                        duration: 5000,
                        onUndo: () => {
                            // Cancel timeout
                            if (pendingUpdates.current[order.uid]) {
                                clearTimeout(pendingUpdates.current[order.uid]);
                                delete pendingUpdates.current[order.uid];
                            }
                            // Revert optimistic update
                            setOrders(prev => prev.map(o => o.uid === order.uid ? { ...o, status: originalStatus } : o));
                            if (selectedOrderForDetail?.uid === order.uid) {
                                setSelectedOrderForDetail({ ...selectedOrderForDetail, status: originalStatus });
                            }
                        }
                    });

                    // 3. Queue Real API Call
                    pendingUpdates.current[order.uid] = setTimeout(() => {
                        delete pendingUpdates.current[order.uid];
                        // Execute the real API call without UI blocking
                        handleUpdateStatus(status, {}, [order]);
                    }, 5000);
                }
            }
        ]);
    };

    // Bulk Actions
    const handleBulkStartProduction = () => {
        const selected = orders.filter(o => selectedIds.has(o.uid));
        const invalid = selected.filter(o => o.status !== 'CONFIRMED');
        if (invalid.length > 0) {
            Alert.alert("Invalid Selection", "Only 'Confirmed' orders can be started. Please adjust your selection.");
            return;
        }
        Alert.alert("Confirm", `Start production for ${selected.length} orders?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => handleUpdateStatus('IN_PRODUCTION', {}, selected) }
        ]);
    };

    const handleBulkShip = () => {
        const selected = orders.filter(o => selectedIds.has(o.uid));
        const invalid = selected.filter(o => o.status !== 'READY_TO_SHIP');
        if (invalid.length > 0) {
            Alert.alert("Invalid Selection", "Only 'Ready to Ship' orders can be marked as shipped.");
            return;
        }
        Alert.alert("Confirm", `Mark ${selected.length} orders as shipped? (Note: Tracking info will be blank)`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => handleUpdateStatus('SHIPPED', {}, selected) }
        ]);
    };

    const handleBulkPrint = async () => {
        if (selectedIds.size === 0) return;
        const selectedOrders = orders.filter(o => selectedIds.has(o.uid));
        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .slip { border-bottom: 2px dashed #333; padding-bottom: 20px; margin-bottom: 20px; page-break-after: always; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .title { font-size: 20px; font-weight: bold; }
                        .meta { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    ${selectedOrders.map(order => `
                        <div class="slip">
                            <div class="header">
                                <div class="title">PACKING SLIP</div>
                                <div>Order #${order.uid}</div>
                            </div>
                            <div class="meta">
                                <div>
                                    <strong>Customer:</strong><br>
                                    ${order.customer?.name || 'Unknown'}<br>
                                    ${order.customer?.email || 'N/A'}
                                </div>
                                <div style="text-align: right;">
                                    <strong>Date:</strong> ${new Date(order.uploaded).toLocaleDateString()}<br>
                                    <strong>Status:</strong> ${order.status}
                                </div>
                            </div>
                            <table>
                                <thead>
                                    <tr><th>Item</th><th>Qty</th><th>SKU</th></tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => `
                                        <tr>
                                            <td>${item.product?.name || 'Unknown Item'}</td>
                                            <td>${item.quantity}</td>
                                            <td>-</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
            await Print.printAsync({ html });
        } catch (error) {
            Alert.alert("Error", "Failed to print");
        }
    };

    const fmtMoney = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const renderOrderRow = ({ item: o }: { item: Order }) => {
        const isSelected = selectedIds.has(o.uid);
        const isCompleted = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status);
        const dueDate = new Date(o.uploaded).getTime() + (LATE_THRESHOLD_DAYS * ONE_DAY_MS);
        const now = Date.now();
        const daysDiff = Math.ceil(Math.abs(dueDate - now) / ONE_DAY_MS);
        const isLate = !isCompleted && now > dueDate;

        const summaryText = `${o.items[0]?.product?.name || 'Unknown Item'} ${o.items.length > 1 ? `+ ${o.items.length - 1} more` : `x${o.items[0]?.quantity || 1}`}`;

        return (
            <Pressable
                style={[s.row, isSelected && s.rowSelected, isLate && s.rowLate]}
                onPress={() => setSelectedOrderForDetail(o)}
            >
                <TouchableOpacity style={s.checkboxArea} onPress={() => toggleSelection(o.uid)}>
                    {isSelected ? <CheckSquare size={20} color={P} /> : <Square size={20} color={SUB} fill={CARD} />}
                </TouchableOpacity>

                <View style={s.colId}>
                    <Text style={s.rowId}>#{o.referenceNumber || o.uid}</Text>
                    <View style={[s.statusPill, { backgroundColor: getStatusColor(o.status) + '20' }]}>
                        <Text style={[s.statusPillTxt, { color: getStatusColor(o.status) }]}>
                            {o.status.replace(/_/g, ' ')}
                        </Text>
                    </View>
                </View>

                <View style={s.colMain}>
                    <Text style={s.rowCustomer} numberOfLines={1}>{o.customer?.name || 'Unknown Customer'}</Text>
                    <Text style={s.rowSummary} numberOfLines={1}>{summaryText}</Text>
                </View>

                <View style={s.colDue}>
                    {isCompleted ? (
                        <Text style={s.dueTextMuted}>Completed</Text>
                    ) : isLate ? (
                        <Text style={s.dueTextLate}>{daysDiff} days overdue</Text>
                    ) : (
                        <Text style={s.dueTextMuted}>Due in {daysDiff} day{daysDiff !== 1 ? 's' : ''}</Text>
                    )}
                </View>

                <View style={s.colEarnings}>
                    <Text style={[s.rowEarnings, { color: isCompleted ? GREEN : TEXT }]}>{fmtMoney(Number(o.sellerEarnings || o.total) + Number(o.shippingFee || 0))}</Text>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Seller Orders" }} />

            {/* 1. Header Row */}
            <View style={s.headerContainer}>
                <View style={s.headerRow}>
                    <View>
                        <Text style={s.pageTitle}>Orders</Text>
                        <Text style={s.dateTxt}>View, manage, and fulfill your customer orders.</Text>
                        <Text style={s.pageSubtitle}>{orders.length} total orders</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Button
                            title="Manage Products"
                            variant="outline"
                            onPress={() => router.push('/seller-dashboard/products' as any)}
                            icon={<ChevronRight size={16} color={P} />}
                            iconPosition="right"
                            style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, height: 'auto', backgroundColor: CARD, borderColor: BORDER }}
                            textStyle={{ color: TEXT, fontSize: 13 }}
                        />
                    </View>
                </View>
            </View>

            {/* Main Content Area */}
            <View style={s.mainWrapper}>
                <FlatList
                    data={paginatedOrders}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderOrderRow}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            {/* 2. Summary Stat Tiles */}
                            <View style={s.statsGrid}>
                                <StatCard
                                    label="Overdue"
                                    value={String(stats.overdueCount)}
                                    icon={<AlertTriangle size={20} color={RED} />}
                                    color={RED}
                                    tooltip="Orders past their due date requiring immediate attention."
                                    isLoading={loading && orders.length === 0}
                                />
                                <StatCard
                                    label="Pending"
                                    value={String(stats.pendingCount)}
                                    icon={<Clock size={20} color={AMBER} />}
                                    color={AMBER}
                                    tooltip="Orders awaiting your confirmation to begin production."
                                    isLoading={loading && orders.length === 0}
                                />
                                <StatCard
                                    label="Processing"
                                    value={String(stats.processingCount)}
                                    icon={<Package size={20} color={P} />}
                                    color={P}
                                    tooltip="Orders currently being prepared or ready to ship."
                                    isLoading={loading && orders.length === 0}
                                />
                                <StatCard
                                    label="Earnings this week"
                                    value={fmtMoney(stats.weeklyEarnings)}
                                    icon={<TrendingUp size={20} color={GREEN} />}
                                    color={GREEN}
                                    tooltip="Your total earnings from completed orders this week."
                                    isLoading={loading && orders.length === 0}
                                />
                            </View>

                            {/* 3. Filter/Search Bar */}
                            <View style={s.filterContainer}>
                                <View style={s.searchRow}>
                                    <View style={s.searchBox}>
                                        <Search size={16} color={SUB} />
                                        <TextInput
                                            style={s.searchInput}
                                            placeholder="Search products or SKUs..."
                                            placeholderTextColor={SUB}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={s.sortBtn}
                                        onPress={() => {
                                            if (sortBy === 'NEWEST') setSortBy('OLDEST');
                                            else if (sortBy === 'OLDEST') setSortBy('MOST_OVERDUE');
                                            else setSortBy('NEWEST');
                                        }}
                                    >
                                        <ArrowDownUp size={16} color={SUB} />
                                        <Text style={s.sortBtnTxt}>
                                            {sortBy === 'NEWEST' ? 'Newest First' : sortBy === 'OLDEST' ? 'Oldest First' : 'Most Overdue'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={s.tabsRow}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsScroll}>
                                        {['ALL', 'OVERDUE', 'PENDING', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map(f => (
                                            <TouchableOpacity
                                                key={f}
                                                style={[s.tab, statusFilter === f && s.tabActive]}
                                                onPress={() => setStatusFilter(f)}
                                            >
                                                <Text style={[s.tabText, statusFilter === f && s.tabTextActive]}>
                                                    {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <Button
                                        title="Refresh"
                                        variant="outline"
                                        onPress={fetchOrders}
                                        icon={<RefreshCw size={16} color={P} />}
                                        loading={loading && orders.length > 0}
                                        style={{ borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, height: 'auto', backgroundColor: BG, borderColor: BORDER }}
                                        textStyle={{ color: P, fontSize: 13 }}
                                    />
                                </View>
                            </View>

                            {/* List Header Row */}
                            <View style={s.listHeaderRow}>
                                <TouchableOpacity style={s.checkboxArea} onPress={toggleSelectAll}>
                                    {selectedIds.size > 0 && selectedIds.size === paginatedOrders.length ? (
                                        <CheckSquare size={18} color={SUB} />
                                    ) : (
                                        <Square size={18} color={SUB} fill={BG} />
                                    )}
                                </TouchableOpacity>
                                <Text style={[s.listHeaderTxt, s.colId]}>Order ID</Text>
                                <Text style={[s.listHeaderTxt, s.colMain]}>Customer & Items</Text>
                                <Text style={[s.listHeaderTxt, s.colDue]}>Due Status</Text>
                                <Text style={[s.listHeaderTxt, s.colEarnings, { textAlign: 'right' }]}>Est. Earnings</Text>
                            </View>

                            {/* Skeleton Loading state inside FlatList Header */}
                            {loading && orders.length === 0 && (
                                <Animated.View style={{ opacity: pulseAnim, marginTop: 12, paddingHorizontal: 12 }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <View key={i} style={{ height: 100, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 12 }} />
                                    ))}
                                </Animated.View>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        !loading ? (
                            <Text style={s.emptyText}>No orders match your filters.</Text>
                        ) : null
                    }
                />

                {/* 6. Pagination */}
                {totalPages > 1 && (
                    <View style={s.pagination}>
                        <TouchableOpacity
                            style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
                            disabled={currentPage === 1}
                            onPress={() => setCurrentPage(prev => prev - 1)}
                        >
                            <ChevronLeft size={18} color={currentPage === 1 ? BORDER : TEXT} />
                        </TouchableOpacity>
                        <Text style={s.pageText}>Page {currentPage} of {totalPages}</Text>
                        <TouchableOpacity
                            style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
                            disabled={currentPage === totalPages}
                            onPress={() => setCurrentPage(prev => prev + 1)}
                        >
                            <ChevronRight size={18} color={currentPage === totalPages ? BORDER : TEXT} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 4. Bulk Action Bar */}
                <BulkActionBar
                    selectedCount={selectedIds.size}
                    onCancel={() => setSelectedIds(new Set())}
                    onPrint={handleBulkPrint}
                    onShip={handleBulkShip}
                    onStartProduction={handleBulkStartProduction}
                />

                {/* Detail View Modal */}
                <Modal visible={!!selectedOrderForDetail} transparent animationType="none">
                    <View style={s.modalOverlay}>
                        <View style={[s.modalContent, { paddingTop: 24, flex: 1 }]}>
                            {selectedOrderForDetail && (
                                <OrderCard
                                    order={selectedOrderForDetail}
                                    onClose={() => setSelectedOrderForDetail(null)}
                                    onOpenModal={openActionModal}
                                    onQuickAction={async (status, o) => {
                                        handleQuickActionSafe(status, o);
                                    }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Action Modals */}
                <ShipOrderModal visible={shipModalVisible} order={selectedOrder} submitting={submitting} onClose={() => { setShipModalVisible(false); setSelectedOrderForDetail(selectedOrder); }} onSubmit={async (data) => {
                    try {
                        setSubmitting(true);
                        const itemRes = await uploadToImageKit({ uri: data.itemPhotoUri, name: `item_${selectedOrder?.uid}` });
                        const pkgRes = await uploadToImageKit({ uri: data.packagePhotoUri, name: `pkg_${selectedOrder?.uid}` });
                        const proofPhotos = [itemRes.url, pkgRes.url];
                        if (data.receiptPhotoUri) {
                            const receiptRes = await uploadToImageKit({ uri: data.receiptPhotoUri, name: `receipt_${selectedOrder?.uid}` });
                            proofPhotos.push(receiptRes.url);
                        }
                        const ok = await handleUpdateStatus('SHIPPED', { shippingMethod: data.shippingMethod, proofPhotos: JSON.stringify(proofPhotos), trackingNumber: data.trackingNumber, courierName: data.courierName, message: data.message });
                        if (!ok) setSubmitting(false);
                    } catch (e) {
                        Alert.alert("Error", "Failed to upload photos");
                        setSubmitting(false);
                    }
                }} />
                <AcceptOrderModal visible={acceptModalVisible} order={selectedOrder} submitting={submitting} onClose={() => { setAcceptModalVisible(false); setSelectedOrderForDetail(selectedOrder); }} onSubmit={(data) => handleUpdateStatus('CONFIRMED', data)} />
                <RejectOrderModal visible={rejectModalVisible} order={selectedOrder} submitting={submitting} onClose={() => { setRejectModalVisible(false); setSelectedOrderForDetail(selectedOrder); }} onSubmit={(data) => handleUpdateStatus('CANCELLED', data)} />

            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    pageTitle: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    dateTxt: { fontSize: 13, color: SUB, marginTop: 4, fontFamily: 'Quicksand' },
    pageSubtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4, display: 'none' }, // hidden to match products
    navBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
    navBtnText: { color: TEXT, fontWeight: '700', fontFamily: 'Quicksand', marginRight: 6 },

    mainWrapper: { flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center', padding: 24 },
    statsGrid: { flexDirection: 'row', gap: 16, width: '100%', marginBottom: 24, zIndex: 100, overflow: 'visible' },

    filterContainer: { marginBottom: 16 },
    searchRow: { flexDirection: 'row', gap: 12, width: '100%', alignItems: 'center', marginBottom: 16 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, height: 44, borderWidth: 1, borderColor: BORDER },
    searchInput: { flex: 1, marginLeft: 12, fontFamily: 'Quicksand', fontSize: 14, color: TEXT, outlineStyle: 'none' as any },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 16, height: 44, borderWidth: 1, borderColor: BORDER },
    sortBtnTxt: { fontSize: 13, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },

    tabsRow: { flexDirection: 'row', alignItems: 'center' },
    tabsScroll: { flexGrow: 0, gap: 12, paddingBottom: 4 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    tabActive: { backgroundColor: P_LIGHT, borderColor: P },
    tabText: { fontSize: 13, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' },
    tabTextActive: { color: P },

    listWrapper: { flex: 1, width: '100%', backgroundColor: 'transparent' },
    listHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
    listHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    listContent: { paddingBottom: 100 },

    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
    rowSelected: { backgroundColor: '#F8FAFC' },
    rowLate: { backgroundColor: CARD, borderRadius: 16 },
    checkboxArea: { marginRight: 20 },

    colId: { width: 200 },
    rowId: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
    statusPillTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'Quicksand' },

    colMain: { flex: 1, paddingRight: 20 },
    rowCustomer: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    rowSummary: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },

    colDue: { width: 140 },
    dueTextMuted: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    dueTextLate: { fontSize: 13, fontWeight: '700', color: RED, fontFamily: 'Quicksand' },

    colEarnings: { width: 120, alignItems: 'flex-end' },
    rowEarnings: { fontSize: 15, fontWeight: '700', color: GREEN, fontFamily: 'Quicksand' },

    emptyText: { textAlign: 'center', marginTop: 60, fontSize: 14, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic' },

    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 20, gap: 16, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
    pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
    pageBtnDisabled: { opacity: 0.5 },
    pageText: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: CARD, width: '100%', maxWidth: 700, maxHeight: '90%', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
});
