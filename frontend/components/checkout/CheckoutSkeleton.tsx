import React from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';

export const CheckoutSkeleton = () => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    
    const pulseAnim = React.useRef(new Animated.Value(0.3)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const animatedStyle = { opacity: pulseAnim };

    return (
        <View style={isDesktop ? styles.mainLayoutDesktop : styles.mainLayout}>
            {/* Left Column */}
            <View style={styles.leftColumn}>
                
                {/* 1. Address Section Skeleton */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Animated.View style={[styles.iconSkeleton, animatedStyle]} />
                        <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
                    </View>
                    <Animated.View style={[styles.textLineSkeleton, { width: '80%' }, animatedStyle]} />
                    <Animated.View style={[styles.textLineSkeleton, { width: '60%' }, animatedStyle]} />
                    <Animated.View style={[styles.textLineSkeleton, { width: '40%' }, animatedStyle]} />
                </View>

                {/* 2. Sellers and Products Skeleton */}
                <View style={{ marginBottom: theme.spacing.lg }}>
                    <View style={[styles.sectionHeader, { paddingHorizontal: theme.spacing.sm, justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Animated.View style={[styles.iconSkeleton, animatedStyle, { marginTop: 2 }]} />
                            <View>
                                <Animated.View style={[styles.titleSkeleton, animatedStyle, { marginBottom: 6 }]} />
                                <Animated.View style={[styles.textLineSkeleton, { width: 90, height: 12, marginBottom: 0 }, animatedStyle]} />
                            </View>
                        </View>
                        <Animated.View style={[styles.textLineSkeleton, { width: 80, height: 14, marginBottom: 0, marginTop: 4 }, animatedStyle]} />
                    </View>
                    
                    <View style={[styles.sectionContainer, { marginBottom: 0 }]}>
                        {/* Item Skeleton */}
                        <View style={styles.itemRow}>
                            <Animated.View style={[styles.imageSkeleton, animatedStyle]} />
                            <View style={styles.itemDetails}>
                                <Animated.View style={[styles.textLineSkeleton, { width: '90%' }, animatedStyle]} />
                                <Animated.View style={[styles.textLineSkeleton, { width: '40%' }, animatedStyle]} />
                                <Animated.View style={[styles.textLineSkeleton, { width: '30%', marginTop: 8 }, animatedStyle]} />
                            </View>
                        </View>
                        
                        {/* Separator line */}
                        <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 }} />

                        {/* Fulfillment Option Skeleton */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                            <View style={{ gap: 12 }}>
                                <Animated.View style={[styles.textLineSkeleton, { width: 120, marginBottom: 0 }, animatedStyle]} />
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <Animated.View style={[styles.fulfillmentSkeleton, { width: 100 }, animatedStyle]} />
                                    <Animated.View style={[styles.fulfillmentSkeleton, { width: 100 }, animatedStyle]} />
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                <Animated.View style={[styles.textLineSkeleton, { width: 100, marginBottom: 0 }, animatedStyle]} />
                                <Animated.View style={[styles.textLineSkeleton, { width: 80, marginBottom: 0 }, animatedStyle]} />
                                <Animated.View style={[styles.textLineSkeleton, { width: 120, height: 20, marginTop: 4, marginBottom: 0 }, animatedStyle]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4. Payment Method Skeleton */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Animated.View style={[styles.iconSkeleton, animatedStyle]} />
                        <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Animated.View style={[styles.paymentMethodSkeleton, animatedStyle]} />
                        <Animated.View style={[styles.paymentMethodSkeleton, animatedStyle]} />
                    </View>
                </View>

            </View>

            {/* Right Column / Order Summary Skeleton */}
            <View style={styles.rightColumn}>
                <View style={styles.sectionContainer}>
                    <Animated.View style={[styles.titleSkeleton, { width: 140, marginBottom: 24 }, animatedStyle]} />
                    
                    <View style={styles.summaryRow}>
                        <Animated.View style={[styles.textLineSkeleton, { width: '40%' }, animatedStyle]} />
                        <Animated.View style={[styles.textLineSkeleton, { width: '20%' }, animatedStyle]} />
                    </View>
                    <View style={styles.summaryRow}>
                        <Animated.View style={[styles.textLineSkeleton, { width: '35%' }, animatedStyle]} />
                        <Animated.View style={[styles.textLineSkeleton, { width: '25%' }, animatedStyle]} />
                    </View>
                    <View style={styles.summaryRow}>
                        <Animated.View style={[styles.textLineSkeleton, { width: '45%' }, animatedStyle]} />
                        <Animated.View style={[styles.textLineSkeleton, { width: '15%' }, animatedStyle]} />
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.summaryRow}>
                        <Animated.View style={[styles.titleSkeleton, { width: '30%' }, animatedStyle]} />
                        <Animated.View style={[styles.titleSkeleton, { width: '40%' }, animatedStyle]} />
                    </View>
                    
                    <Animated.View style={[styles.buttonSkeleton, animatedStyle]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainLayout: {
        flexDirection: 'column',
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        alignSelf: 'center',
        width: '100%',
        maxWidth: 1100,
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
        alignItems: 'flex-start',
    },
    leftColumn: {
        flex: 1,
        width: '100%',
        gap: theme.spacing.lg,
    },
    rightColumn: {
        width: '100%',
        maxWidth: 380,
    },
    sectionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    iconSkeleton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
    },
    titleSkeleton: {
        width: 120,
        height: 20,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    textLineSkeleton: {
        height: 16,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginBottom: 8,
    },
    itemRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    imageSkeleton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    itemDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    fulfillmentSkeleton: {
        height: 36,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    notesSkeleton: {
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    paymentMethodSkeleton: {
        height: 60,
        flex: 1,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16,
    },
    buttonSkeleton: {
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
        marginTop: 8,
    }
});
