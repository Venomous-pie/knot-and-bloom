import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { sellerAPI } from '@/api/api';
import { User } from '@/types/user';
import MakerCard from '@/components/MakerCard';
import { Palette, SearchX } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MakersDirectory() {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [makers, setMakers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMakers = async () => {
            try {
                // Fetch all active sellers from the public API
                const response = await sellerAPI.getActiveSellers();
                // We expect response.data to be an array of sellers
                const data = response.data as any;
                const sellersList = Array.isArray(data) ? data : (data?.sellers || []);
                
                setMakers(sellersList);
            } catch (error) {
                console.error("Failed to fetch makers:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMakers();
    }, []);

    // Calculate grid layout
    const containerWidth = Math.min(width, 1200);
    const padding = theme.spacing.lg * 2;
    const availableWidth = containerWidth - padding;
    
    // Determine columns based on screen width
    let numColumns = 1;
    if (width >= 1024) numColumns = 3;
    else if (width >= 768) numColumns = 2;

    const gap = theme.spacing.lg;
    const itemWidth = isMobile ? '100%' : (availableWidth - (gap * (numColumns - 1))) / numColumns;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.headerIconWrapper}>
                        <Palette size={32} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Commission a Maker</Text>
                    <Text style={styles.subtitle}>
                        Find the perfect student artisan to bring your custom ideas to life.
                        Browse their portfolios and request a bespoke creation directly.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Finding available makers...</Text>
                    </View>
                ) : makers.length > 0 ? (
                    <View style={styles.grid}>
                        {makers.map((maker) => (
                            <View key={maker.uid} style={{ width: itemWidth }}>
                                <MakerCard maker={maker} />
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <SearchX size={48} color={theme.colors.textLight} />
                        <Text style={styles.emptyTitle}>No makers available right now.</Text>
                        <Text style={styles.emptySubtitle}>Please check back later or contact customer service.</Text>
                    </View>
                )}
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
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing['2xl'],
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.md,
    },
    headerIconWrapper: {
        backgroundColor: theme.colors.primaryLight + '30',
        padding: 16,
        borderRadius: 32,
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.sizes['3xl'],
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
        fontFamily: theme.typography.fontFamily,
    },
    subtitle: {
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.lg,
        justifyContent: 'flex-start',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.base,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xs,
    },
    emptySubtitle: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
});
