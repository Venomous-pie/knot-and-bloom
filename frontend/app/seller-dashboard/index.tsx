import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { sellerAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { AlertCircle, Package, TrendingUp, Users, DollarSign, Calendar, Bell } from 'lucide-react-native';

const PRIMARY_COLOR = '#B36979';
const BG_COLOR = '#F9FAFB';
const CARD_BG = '#FFFFFF';

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
        totalOrders: {
            PENDING: number;
            TO_SHIP: number;
            COMPLETED: number;
        };
        conversionRate: number;
    };
    performanceGraph: Array<{ date: string; sales: number }>;
}

export default function SellerDashboardHome() {
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Auth guard: only ACTIVE sellers or admins can access
    const { user, loading: authLoading } = useAuth();
    React.useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    const fetchStats = async () => {
        try {
            const data = await sellerAPI.getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const formatCurrency = (amount: number) => {
        return `₱${amount.toFixed(2)}`;
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            </View>
        );
    }

    if (!stats) {
        return (
            <View style={styles.centerContainer}>
                <Text>Failed to load dashboard data.</Text>
                <TouchableOpacity onPress={fetchStats} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Chart logic
    const maxSales = Math.max(...stats.performanceGraph.map(d => d.sales), 1);
    const chartHeight = 150;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY_COLOR]} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Dashboard Overview</Text>
                    <Text style={styles.date}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/seller-dashboard/notifications' as any)} style={styles.notificationBtn}>
                    <Bell size={24} color="#374151" />
                    {/* Optional: Add badge if unread count available in stats */}
                    {stats.performanceSnapshot.pendingActions > 0 && <View style={styles.badgeDot} />}
                </TouchableOpacity>
            </View>

            {/* Performance Snapshot */}
            <Text style={styles.sectionTitle}>Performance Snapshot</Text>
            <View style={styles.grid}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <DollarSign size={20} color={PRIMARY_COLOR} />
                    </View>
                    <Text style={styles.cardLabel}>Today's Revenue</Text>
                    <Text style={styles.cardValue}>{formatCurrency(stats.performanceSnapshot.todayRevenue)}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Package size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.cardLabel}>Today's Orders</Text>
                    <Text style={styles.cardValue}>{stats.performanceSnapshot.todayOrders}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Users size={20} color="#10B981" />
                    </View>
                    <Text style={styles.cardLabel}>Visitors</Text>
                    <Text style={styles.cardValue}>{stats.performanceSnapshot.todayVisitors}</Text>
                </View>

                <View style={[styles.card, stats.performanceSnapshot.pendingActions > 0 && styles.cardActive]}>
                    <View style={styles.iconContainer}>
                        <AlertCircle size={20} color="#F59E0B" />
                    </View>
                    <Text style={styles.cardLabel}>Pending Actions</Text>
                    <Text style={styles.cardValue}>{stats.performanceSnapshot.pendingActions}</Text>
                </View>
            </View>

            {/* Quick Stats Card */}
            <View style={styles.largeCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Sales Overview</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>This Month</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total Sales</Text>
                        <Text style={styles.statValue}>{formatCurrency(stats.quickStats.thisMonthSales)}</Text>
                        <Text style={styles.statSub}>vs {formatCurrency(stats.quickStats.lastMonthSales)} last month</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Pending Orders</Text>
                        <Text style={styles.statValue}>{stats.quickStats.totalOrders.PENDING}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>To Ship</Text>
                        <Text style={styles.statValue}>{stats.quickStats.totalOrders.TO_SHIP}</Text>
                    </View>
                </View>
            </View>

            {/* Performance Graph */}
            <View style={styles.largeCard}>
                <Text style={styles.cardTitle}>Sales Trend (Last 7 Days)</Text>
                <View style={styles.chartContainer}>
                    {stats.performanceGraph.map((item, index) => {
                        const barHeight = (item.sales / maxSales) * chartHeight;
                        if (isNaN(barHeight)) return null;
                        return (
                            <View key={index} style={styles.barWrapper}>
                                <View style={[styles.bar, { height: Math.max(barHeight, 4) }]} />
                                <Text style={styles.barLabel}>{new Date(item.date).getDate()}</Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Navigation Links */}
            <View style={styles.navGrid}>
                <TouchableOpacity style={styles.navButton} onPress={() => router.push('/seller-dashboard/products')}>
                    <Package size={24} color={PRIMARY_COLOR} />
                    <Text style={styles.navText}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={() => router.push('/seller-dashboard/orders')}>
                    <Calendar size={24} color={PRIMARY_COLOR} />
                    <Text style={styles.navText}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={() => router.push('/seller-dashboard/earnings')}>
                    <TrendingUp size={24} color={PRIMARY_COLOR} />
                    <Text style={styles.navText}>Earnings</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_COLOR,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryButton: {
        marginTop: 16,
        padding: 10,
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 8,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
    header: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationBtn: {
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    badgeDot: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#FFF'
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    date: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 12,
        padding: 16,
        width: '48%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardActive: {
        borderWidth: 1,
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    iconContainer: {
        marginBottom: 12,
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    cardLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    largeCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    badge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        color: '#4B5563',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    statSub: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#E5E7EB',
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        paddingTop: 20,
        gap: 8,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    bar: {
        width: '60%',
        backgroundColor: PRIMARY_COLOR,
        borderRadius: 4,
        opacity: 0.8,
    },
    barLabel: {
        fontSize: 10,
        color: '#6B7280',
    },
    navGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20
    },
    navButton: {
        flex: 1,
        backgroundColor: CARD_BG,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    navText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    }
});
