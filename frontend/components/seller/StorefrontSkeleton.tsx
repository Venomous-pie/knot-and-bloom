import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton';

export default function StorefrontSkeleton() {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.8,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [pulseAnim]);

    const productGridCols = isDesktop ? 4 : 2;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View style={[{ opacity: pulseAnim }, isDesktop && styles.desktopContainer]}>
                
                {/* Banner Skeleton */}
                <View style={[styles.banner, isDesktop && styles.bannerDesktop]} />

                {/* Profile Header Info */}
                <View style={styles.headerContainer}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logo} />
                    </View>
                    
                    <View style={styles.infoContainer}>
                        <View style={styles.title} />
                        <View style={styles.subtitle} />
                        
                        <View style={styles.actionButtonsRow}>
                            <View style={styles.actionButton} />
                            <View style={styles.actionButton} />
                        </View>
                        
                        <View style={styles.descriptionLine} />
                        <View style={[styles.descriptionLine, { width: '40%' }]} />

                        {/* Stat Cards */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard} />
                            <View style={styles.statCard} />
                            <View style={styles.statCard} />
                        </View>
                    </View>
                </View>

                {/* Tabs Skeleton */}
                <View style={styles.tabsContainer}>
                    <View style={styles.tabItem}>
                        <View style={styles.tabText} />
                        <View style={styles.tabActiveIndicator} />
                    </View>
                    <View style={styles.tabItem}>
                        <View style={styles.tabText} />
                    </View>
                    <View style={styles.tabItem}>
                        <View style={styles.tabText} />
                    </View>
                </View>

                {/* Content Section Skeleton */}
                <View style={styles.contentSection}>
                    <View style={styles.searchBar} />
                    
                    <View style={styles.collectionHeader} />
                    
                    <View style={styles.filterPillsRow}>
                        <View style={styles.filterPillActive} />
                        <View style={styles.filterPill} />
                        <View style={styles.filterPill} />
                        <View style={styles.filterPill} />
                    </View>

                    {/* Products Grid Skeleton */}
                    <View style={styles.productsGrid}>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <View 
                                key={index} 
                                style={{ 
                                    width: isDesktop ? `${100 / productGridCols}%` : '50%',
                                    padding: theme.spacing.sm
                                }}
                            >
                                <ProductCardSkeleton />
                            </View>
                        ))}
                    </View>
                </View>

            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    desktopContainer: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
    },
    banner: {
        width: '100%',
        height: 200,
        backgroundColor: '#E2E8F0',
    },
    bannerDesktop: {
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.lg,
    },
    headerContainer: {
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
        marginTop: -60, // Overlap banner
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.surface,
        padding: 4,
        marginBottom: theme.spacing.md,
    },
    logo: {
        width: '100%',
        height: '100%',
        borderRadius: 56,
        backgroundColor: '#CBD5E1',
    },
    infoContainer: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        width: 240,
        height: 32,
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
        marginBottom: 8,
    },
    subtitle: {
        width: 140,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 20,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: 24,
    },
    actionButton: {
        width: 100,
        height: 36,
        backgroundColor: '#E2E8F0',
        borderRadius: 18,
    },
    descriptionLine: {
        width: '80%',
        maxWidth: 600,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 8,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        maxWidth: 800,
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        marginTop: 32,
    },
    statCard: {
        flex: 1,
        height: 80,
        backgroundColor: '#F1F5F9',
        borderRadius: theme.borderRadius.lg,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        width: '100%',
        maxWidth: 800,
        marginHorizontal: 'auto',
        justifyContent: 'space-around',
    },
    tabItem: {
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        width: 100,
    },
    tabText: {
        width: 60,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 8,
    },
    tabActiveIndicator: {
        position: 'absolute',
        bottom: -1,
        width: '100%',
        height: 2,
        backgroundColor: '#E2E8F0', // In the skeleton, we can just use a generic color for the active line
    },
    contentSection: {
        width: '100%',
        maxWidth: 1000,
        marginHorizontal: 'auto',
        padding: theme.spacing.lg,
    },
    searchBar: {
        width: '100%',
        height: 48,
        backgroundColor: '#F1F5F9',
        borderRadius: theme.borderRadius.md,
        marginBottom: 32,
    },
    collectionHeader: {
        width: 180,
        height: 24,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 16,
    },
    filterPillsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: 24,
    },
    filterPillActive: {
        width: 60,
        height: 32,
        backgroundColor: '#CBD5E1', // slightly darker for active
        borderRadius: 16,
    },
    filterPill: {
        width: 80,
        height: 32,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -theme.spacing.sm,
    },
});
