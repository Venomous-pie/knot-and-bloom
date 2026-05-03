import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from '@/constants/theme';

export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, token, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/earnings/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (e) {
            console.error("Failed to fetch admin stats", e);
        } finally {
            setStatsLoading(false);
        }
    };

    // Auth Check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
            } else if (user.role !== 'ADMIN') {
                router.replace('/');
            }
        }
    }, [user, authLoading]);

    // Fetch Stats on Focus
    useFocusEffect(
        React.useCallback(() => {
            if (user?.role === 'ADMIN') {
                fetchStats();
            }
        }, [user, token])
    );

    if (authLoading || (user?.role !== 'ADMIN')) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Admin Control Center</Text>
                    <Text style={styles.subtitle}>Platform overview and moderation</Text>
                </View>

                {/* Platform Metrics */}
                <Text style={styles.sectionTitle}>Platform Metrics</Text>
                {statsLoading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : stats ? (
                    <View style={styles.metricsContainer}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Platform Revenue</Text>
                            <Text style={styles.metricValue}>₱{Number(stats.revenue || 0).toLocaleString()}</Text>
                            <Text style={styles.metricSub}>From 5% Fees</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricLabel}>Total GMV</Text>
                            <Text style={styles.metricValue}>₱{Number(stats.gmv || 0).toLocaleString()}</Text>
                            <Text style={styles.metricSub}>Gross Sales</Text>
                        </View>
                        <View style={[styles.metricCard, stats.pendingWithdrawals > 0 && { borderColor: '#F59E0B', borderWidth: 2 }]}>
                            <Text style={styles.metricLabel}>Pending Payouts</Text>
                            <Text style={[styles.metricValue, stats.pendingWithdrawals > 0 && { color: '#F59E0B' }]}>
                                {stats.pendingWithdrawals}
                            </Text>
                            <Text style={styles.metricSub}>Requests</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.emptyText}>Unable to load platform metrics.</Text>
                )}

                {/* Moderation Quick Actions */}
                <Text style={styles.sectionTitle}>Moderation</Text>
                <View style={styles.actionGrid}>
                    <Pressable
                        style={[styles.actionCard, { borderLeftColor: '#F59E0B' }]}
                        onPress={() => router.push('/admin/products' as any)}
                    >
                        <Text style={styles.actionEmoji}>📋</Text>
                        <Text style={styles.actionTitle}>Review Products</Text>
                        <Text style={styles.actionDesc}>Approve, reject, or suspend seller product listings</Text>
                    </Pressable>

                    <Pressable
                        style={[styles.actionCard, { borderLeftColor: '#4CAF50' }]}
                        onPress={() => router.push('/admin/sellers')}
                    >
                        <Text style={styles.actionEmoji}>👥</Text>
                        <Text style={styles.actionTitle}>Manage Sellers</Text>
                        <Text style={styles.actionDesc}>Review seller applications and manage accounts</Text>
                    </Pressable>
                </View>

                {/* Quick Links */}
                <Text style={styles.sectionTitle}>Quick Links</Text>
                <View style={styles.linkRow}>
                    <Pressable style={styles.linkBtn} onPress={() => router.push('/' as any)}>
                        <Text style={styles.linkBtnText}>🏠 View Storefront</Text>
                    </Pressable>
                    {user?.sellerId && (
                        <Pressable style={styles.linkBtn} onPress={() => router.push('/seller-dashboard' as any)}>
                            <Text style={styles.linkBtnText}>📊 Seller Dashboard</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginTop: 8,
    },
    metricsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
    },
    metricSub: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginTop: 2,
    },
    actionGrid: {
        gap: 12,
        marginBottom: 24,
    },
    actionCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    actionDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
    linkRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    linkBtn: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    linkBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 24,
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
});
