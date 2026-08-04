import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Users, DollarSign, Package, Clock, AlertTriangle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import StatCard from '@/components/ui/StatCard';
import { Stack } from 'expo-router';
import InfoBox from '@/components/ui/InfoBox';
import { adminAPI } from '@/services/admin';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Placeholder stats for now
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeSellers: 0,
        pendingSellers: 0,
        activeProducts: 0
    });

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getDashboardStats();
            setStats(res);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const greeting = `Good morning, ${user?.name?.split(' ')[0] || 'Admin'}!`;

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Admin Dashboard" }} />

            {/* Header Bar */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>{greeting}</Text>
                        <Text style={s.subtitle}>{today}</Text>
                    </View>
                </View>
            </View>
            
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
                }
            >
                {/* Top Stats Row */}
                <View style={s.statsGrid}>
                    <StatCard 
                        label="Total Revenue" 
                        value={`₱${stats.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                        icon={<DollarSign size={20} color={theme.colors.primary} />} 
                        color={theme.colors.primary} 
                        isLoading={loading} 
                    />
                    <StatCard 
                        label="Active Sellers" 
                        value={stats.activeSellers.toString()} 
                        icon={<Users size={20} color={theme.colors.secondary} />} 
                        color={theme.colors.secondary} 
                        isLoading={loading} 
                    />
                    <StatCard 
                        label="Pending Sellers" 
                        value={stats.pendingSellers.toString()} 
                        icon={<Clock size={20} color="#F59E0B" />} 
                        color="#F59E0B" 
                        isLoading={loading} 
                    />
                    <StatCard 
                        label="Active Products" 
                        value={stats.activeProducts.toString()} 
                        icon={<Package size={20} color="#10B981" />} 
                        color="#10B981" 
                        isLoading={loading} 
                    />
                </View>

                {/* Main Content Layout */}
                <View style={s.mainLayout}>
                    {/* Left Column: Charts/Trends */}
                    <View style={s.leftColumn}>
                        <View style={s.card}>
                            <View style={s.cardHeader}>
                                <Text style={s.cardTitle}>Platform Revenue Trends</Text>
                                <View style={s.badge}>
                                    <Text style={s.badgeText}>Monthly</Text>
                                </View>
                            </View>
                            <View style={s.chartPlaceholder}>
                                <Text style={s.placeholderText}>Chart Visualization Coming Soon</Text>
                            </View>
                        </View>
                    </View>

                    {/* Right Column: Actions / Activity */}
                    <View style={s.rightColumn}>
                        <View style={s.card}>
                            <View style={s.cardHeader}>
                                <Text style={s.cardTitle}>Pending Actions</Text>
                                <Text style={s.viewAllBtn}>View All</Text>
                            </View>

                            <View style={s.actionList}>
                                <View style={s.actionItem}>
                                    <View style={[s.actionIconBg, { backgroundColor: '#F59E0B20' }]}>
                                        <Clock size={16} color="#F59E0B" />
                                    </View>
                                    <View style={s.actionTextContainer}>
                                        <Text style={s.actionTitle}>Seller Applications</Text>
                                        <Text style={s.actionSub}>Awaiting your approval.</Text>
                                    </View>
                                    <Text style={s.actionCount}>{stats.pendingSellers}</Text>
                                </View>

                                <View style={s.actionItem}>
                                    <View style={[s.actionIconBg, { backgroundColor: '#6366F120' }]}>
                                        <AlertTriangle size={16} color="#6366F1" />
                                    </View>
                                    <View style={s.actionTextContainer}>
                                        <Text style={s.actionTitle}>Reported Products</Text>
                                        <Text style={s.actionSub}>Require moderation.</Text>
                                    </View>
                                    <Text style={s.actionCount}>0</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F4F8',
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F5',
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A2E',
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 13,
        color: '#6B7280',
        fontFamily: 'Quicksand',
        marginTop: 4,
    },
    scrollContent: {
        padding: 20,
        maxWidth: 1400,
        alignSelf: 'center',
        width: '100%',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    mainLayout: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
    },
    leftColumn: {
        flex: 2,
        minWidth: 400,
    },
    rightColumn: {
        flex: 1,
        minWidth: 300,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F0F0F5',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A2E',
        fontFamily: 'Quicksand',
    },
    badge: {
        backgroundColor: '#FDEEF1',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B36979',
        fontFamily: 'Quicksand',
    },
    viewAllBtn: {
        fontSize: 13,
        fontWeight: '700',
        color: '#B36979',
        fontFamily: 'Quicksand',
    },
    chartPlaceholder: {
        height: 300,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#9CA3AF',
        fontFamily: 'Quicksand',
        fontWeight: '600',
    },
    actionList: {
        gap: 20,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A1A2E',
        fontFamily: 'Quicksand',
        marginBottom: 2,
    },
    actionSub: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: 'Quicksand',
    },
    actionCount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A2E',
        fontFamily: 'Quicksand',
    },
});