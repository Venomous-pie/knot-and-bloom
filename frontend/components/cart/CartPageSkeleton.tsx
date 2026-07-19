import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';

export function CartPageSkeleton() {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    const renderSkeletonItem = (key: number) => {
        if (isDesktop) {
            return (
                <View key={key} style={styles.desktopRow}>
                    <View style={styles.productColumn}>
                        <View style={styles.checkboxContainer}>
                            <View style={styles.checkboxPlaceholder} />
                        </View>
                        <View style={styles.imagePlaceholder} />
                        <View style={styles.productDetails}>
                            <View style={styles.titleLine1} />
                            <View style={styles.variationPlaceholder} />
                        </View>
                    </View>
                    <View style={styles.priceColumn}>
                        <View style={styles.priceLine} />
                    </View>
                    <View style={styles.qtyColumn}>
                        <View style={styles.qtyPlaceholder} />
                    </View>
                    <View style={styles.totalColumn}>
                        <View style={styles.priceLine} />
                    </View>
                    <View style={styles.actionsColumn}>
                        <View style={styles.deletePlaceholder} />
                    </View>
                </View>
            );
        }

        return (
            <View key={key} style={styles.mobileCard}>
                <View style={styles.mobileRow}>
                    <View style={styles.checkboxContainer}>
                        <View style={styles.checkboxPlaceholder} />
                    </View>
                    <View style={styles.imagePlaceholder} />
                    <View style={styles.mobileDetails}>
                        <View style={styles.titleLine1} />
                        <View style={styles.variationPlaceholder} />
                        <View style={styles.mobileFooter}>
                            <View style={styles.priceLine} />
                            <View style={styles.qtyPlaceholder} />
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Animated.View style={[{ opacity: pulseAnim }]}>
            {/* Free Shipping Progress Placeholder */}
            <View style={styles.progressContainer}>
                <View style={styles.progressPlaceholder} />
            </View>
            
            {/* Table Header Placeholder */}
            {isDesktop && <View style={styles.headerPlaceholder} />}

            {/* Shop Group */}
            <View style={styles.shopGroup}>
                <View style={styles.shopHeader}>
                    <View style={styles.shopSelectRow}>
                        <View style={styles.checkboxPlaceholder} />
                        <View style={styles.iconPlaceholder} />
                        <View style={styles.shopNamePlaceholder} />
                    </View>
                </View>
                {[1].map(renderSkeletonItem)}
            </View>
            
            <View style={styles.shopGroup}>
                <View style={styles.shopHeader}>
                    <View style={styles.shopSelectRow}>
                        <View style={styles.checkboxPlaceholder} />
                        <View style={styles.iconPlaceholder} />
                        <View style={styles.shopNamePlaceholder} />
                    </View>
                </View>
                {[2, 3].map(renderSkeletonItem)}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    progressContainer: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        alignItems: 'center',
    },
    progressPlaceholder: {
        height: 16,
        width: '60%',
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
    },
    headerPlaceholder: {
        height: 56,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        marginBottom: 16,
    },
    shopGroup: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
    },
    shopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.subtle,
    },
    shopSelectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconPlaceholder: {
        width: 16,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    shopNamePlaceholder: {
        width: 100,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    
    // Desktop row styles
    desktopRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: theme.spacing.md, 
        paddingHorizontal: theme.spacing.lg, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.colors.border 
    },
    productColumn: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceColumn: { width: '12.5%', alignItems: 'center' },
    qtyColumn: { width: '12.5%', alignItems: 'center' },
    totalColumn: { width: '12.5%', alignItems: 'center' },
    actionsColumn: { width: '12.5%', alignItems: 'center' },
    
    // Mobile row styles
    mobileCard: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    mobileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    mobileDetails: { flex: 1, gap: 8 },
    mobileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    
    // Common components
    checkboxContainer: { paddingRight: 12 },
    checkboxPlaceholder: {
        width: 16,
        height: 16,
        borderRadius: 3,
        backgroundColor: '#E2E8F0',
    },
    imagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 4,
        backgroundColor: '#E2E8F0',
    },
    productDetails: { flex: 1, gap: 8 },
    titleLine1: {
        width: '80%',
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    variationPlaceholder: {
        width: '40%',
        height: 20,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    priceLine: {
        width: 60,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    qtyPlaceholder: {
        width: 90,
        height: 30,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    deletePlaceholder: {
        width: 40,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    }
});
