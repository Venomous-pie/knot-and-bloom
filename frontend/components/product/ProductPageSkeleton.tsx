import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';

export default function ProductPageSkeleton() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

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

    return (
        <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
            <View style={isDesktop ? styles.mainLayoutDesktop : styles.mainLayoutMobile}>
                {/* Left Column (Image) */}
                <View style={isDesktop ? styles.leftColumnDesktop : styles.leftColumnMobile}>
                    <View style={styles.imagePlaceholder} />
                    <View style={styles.thumbnailStrip}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={styles.thumbnailPlaceholder} />
                        ))}
                    </View>
                </View>

                {/* Right Column (Details) */}
                <View style={isDesktop ? styles.rightColumnDesktop : styles.rightColumnMobile}>
                    <View style={styles.titlePlaceholder} />
                    <View style={styles.pricePlaceholder} />
                    <View style={styles.variantsPlaceholder} />
                    <View style={styles.buttonPlaceholder} />
                    <View style={styles.descriptionPlaceholder} />
                    <View style={styles.descriptionPlaceholderShort} />
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingVertical: 24,
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
        gap: 40,
    },
    mainLayoutMobile: {
        flexDirection: 'column',
        paddingHorizontal: 16,
    },
    leftColumnDesktop: {
        flex: 1,
        maxWidth: 550,
    },
    leftColumnMobile: {
        width: '100%',
    },
    rightColumnDesktop: {
        flex: 1,
    },
    rightColumnMobile: {
        width: '100%',
        marginTop: 24,
    },
    imagePlaceholder: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: theme.colors.subtle,
        borderRadius: theme.borderRadius.lg,
    },
    thumbnailStrip: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    thumbnailPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: theme.colors.subtle,
        borderRadius: theme.borderRadius.md,
    },
    titlePlaceholder: {
        width: '80%',
        height: 32,
        backgroundColor: theme.colors.subtle,
        borderRadius: 4,
        marginBottom: 16,
    },
    pricePlaceholder: {
        width: '40%',
        height: 28,
        backgroundColor: theme.colors.subtle,
        borderRadius: 4,
        marginBottom: 32,
    },
    variantsPlaceholder: {
        width: '100%',
        height: 60,
        backgroundColor: theme.colors.subtle,
        borderRadius: 8,
        marginBottom: 32,
    },
    buttonPlaceholder: {
        width: '100%',
        height: 48,
        backgroundColor: theme.colors.subtle,
        borderRadius: 24,
        marginBottom: 32,
    },
    descriptionPlaceholder: {
        width: '100%',
        height: 16,
        backgroundColor: theme.colors.subtle,
        borderRadius: 4,
        marginBottom: 8,
    },
    descriptionPlaceholderShort: {
        width: '60%',
        height: 16,
        backgroundColor: theme.colors.subtle,
        borderRadius: 4,
    }
});
