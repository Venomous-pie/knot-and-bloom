import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { theme } from '@/constants/theme';

export default function ProductCardSkeleton({ style }: { style?: any }) {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const [cardWidth, setCardWidth] = useState(200);

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

    const handleLayout = (e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setCardWidth(w);
    };

    return (
        <View style={[styles.productCard, style]} onLayout={handleLayout}>
            <Animated.View style={[styles.skeletonContainer, { opacity: pulseAnim }]}>
                {/* Image Placeholder */}
                <View style={styles.imagePlaceholder} />

                {/* Content Placeholder */}
                <View style={styles.content}>
                    {/* Category */}
                    <View style={styles.categoryLine} />
                    
                    {/* Title */}
                    <View style={styles.titleLine1} />
                    <View style={styles.titleLine2} />
                    
                    {/* Seller */}
                    <View style={styles.sellerRow}>
                        <View style={styles.sellerAvatar} />
                        <View style={styles.sellerName} />
                    </View>

                    {/* Price */}
                    <View style={styles.priceRow}>
                        <View style={styles.priceText} />
                    </View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.colors.border,
        aspectRatio: 0.62, // Approximating the card aspect ratio so it mimics real size
    },
    skeletonContainer: {
        flex: 1,
    },
    imagePlaceholder: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#E2E8F0',
    },
    content: {
        padding: 12,
        gap: 8,
        flex: 1,
    },
    categoryLine: {
        width: '40%',
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    titleLine1: {
        width: '90%',
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    titleLine2: {
        width: '60%',
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    sellerAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
    },
    sellerName: {
        width: '50%',
        height: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    priceRow: {
        marginTop: 8,
    },
    priceText: {
        width: '40%',
        height: 20,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    }
});
