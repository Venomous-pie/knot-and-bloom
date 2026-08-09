import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '@/constants/theme';

export const ProfileSkeleton = () => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
            {/* Header/Title Skeleton */}
            <View style={styles.titleSkeleton} />
            
            <View style={styles.cardSkeleton}>
                <View style={styles.row}>
                    <View style={styles.circleSkeleton} />
                    <View style={styles.textSkeletonContainer}>
                        <View style={styles.lineSkeletonLarge} />
                        <View style={styles.lineSkeletonSmall} />
                    </View>
                </View>
                
                <View style={styles.formGroupSkeleton}>
                    <View style={styles.lineSkeletonMedium} />
                    <View style={styles.inputSkeleton} />
                </View>
                <View style={styles.formGroupSkeleton}>
                    <View style={styles.lineSkeletonMedium} />
                    <View style={styles.inputSkeleton} />
                </View>
                <View style={styles.formGroupSkeleton}>
                    <View style={styles.lineSkeletonMedium} />
                    <View style={styles.inputSkeleton} />
                </View>
            </View>
        </Animated.View>
    );
};

export const OrderHistorySkeleton = () => {
    const pulseAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    return (
        <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
            {/* Tabs Skeleton */}
            <View style={styles.tabsContainerSkeleton}>
                {[50, 70, 70, 80, 80, 80, 100].map((width, i) => (
                    <View key={i} style={[styles.tabTextSkeleton, { width }]} />
                ))}
            </View>
            
            {/* Cards */}
            {[1, 2, 3].map(i => (
                <View key={i} style={styles.orderCardSkeleton}>
                    {/* Header */}
                    <View style={styles.orderHeaderRowSkeleton}>
                        <View style={styles.orderHeaderLeftSkeleton}>
                            <View style={styles.orderIdSkeleton} />
                            <View style={styles.orderDateSkeleton} />
                        </View>
                        <View style={styles.orderStatusBadgeSkeleton} />
                    </View>
                    
                    {/* Divider */}
                    <View style={styles.divider} />
                    
                    {/* Product Row */}
                    <View style={styles.productRowSkeleton}>
                        <View style={styles.productThumbSkeleton} />
                        <View style={styles.productDetailsSkeleton}>
                            <View style={styles.shopNameSkeleton} />
                            <View style={styles.productTitleSkeleton} />
                            <View style={styles.itemCountSkeleton} />
                        </View>
                    </View>
                    
                    {/* Est Ready Date */}
                    <View style={styles.estDateSkeletonRow}>
                        <View style={styles.estDateIconSkeleton} />
                        <View style={styles.estDateTextSkeleton} />
                    </View>
                    
                    {/* Divider */}
                    <View style={styles.divider} />
                    
                    {/* Footer */}
                    <View style={styles.orderFooterRowSkeleton}>
                        <View style={styles.balanceTextSkeleton} />
                        <View style={styles.actionTextSkeleton} />
                    </View>
                </View>
            ))}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    titleSkeleton: {
        width: 150,
        height: 24,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 20,
    },
    cardSkeleton: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    circleSkeleton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E0E0E0',
        marginRight: 16,
    },
    textSkeletonContainer: {
        flex: 1,
        gap: 8,
    },
    lineSkeletonLarge: {
        width: '60%',
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    lineSkeletonMedium: {
        width: '30%',
        height: 14,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 8,
    },
    lineSkeletonSmall: {
        width: '40%',
        height: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    formGroupSkeleton: {
        marginBottom: 20,
    },
    inputSkeleton: {
        width: '100%',
        height: 48,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
    },
    tabsContainerSkeleton: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 24,
        paddingHorizontal: 8,
        justifyContent: 'flex-start',
    },
    tabTextSkeleton: {
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
    },
    orderCardSkeleton: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    orderHeaderRowSkeleton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderHeaderLeftSkeleton: {
        flex: 1,
        gap: 6,
    },
    orderIdSkeleton: {
        width: 180,
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    orderDateSkeleton: {
        width: 80,
        height: 12,
        backgroundColor: '#EEEEEE',
        borderRadius: 4,
    },
    orderStatusBadgeSkeleton: {
        width: 100,
        height: 24,
        backgroundColor: '#E0E0E0',
        borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    productRowSkeleton: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    productThumbSkeleton: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
        marginRight: 12,
    },
    productDetailsSkeleton: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    shopNameSkeleton: {
        width: 120,
        height: 12,
        backgroundColor: '#EEEEEE',
        borderRadius: 4,
    },
    productTitleSkeleton: {
        width: '80%',
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    itemCountSkeleton: {
        width: 50,
        height: 12,
        backgroundColor: '#EEEEEE',
        borderRadius: 4,
    },
    estDateSkeletonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 72, // align with product details
        marginBottom: 8,
    },
    estDateIconSkeleton: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#EEEEEE',
    },
    estDateTextSkeleton: {
        width: 120,
        height: 12,
        backgroundColor: '#EEEEEE',
        borderRadius: 4,
    },
    orderFooterRowSkeleton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceTextSkeleton: {
        width: 110,
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
    actionTextSkeleton: {
        width: 160,
        height: 14,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
    },
});
