import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, SafeAreaView } from 'react-native';
import { theme } from '@/constants/theme';
import { PackageOpen, Package, Gift, Sparkles } from 'lucide-react-native';

interface OrderProcessingOverlayProps {
    visible: boolean;
    message: string | null;
}

export function OrderProcessingOverlay({ visible, message }: OrderProcessingOverlayProps) {
    // We will animate a sequence from 0 to 3
    // 0 -> 1: Open Package shows, then fades out
    // 1 -> 2: Closed Package shows, then fades out
    // 2 -> 3: Gift box shows and pulses
    const animSequence = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            animSequence.setValue(0);
            Animated.loop(
                Animated.sequence([
                    // Stage 1: Packing (Open box to closed box)
                    Animated.timing(animSequence, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    // Stage 2: Tying (Closed box to gift)
                    Animated.timing(animSequence, {
                        toValue: 2,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    // Stage 3: Magic/Sparkle pulse
                    Animated.timing(animSequence, {
                        toValue: 3,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [visible, animSequence]);

    if (!visible) return null;

    // Interpolations for each icon's scale and opacity
    const openBoxOpacity = animSequence.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [1, 1, 0],
    });
    const openBoxScale = animSequence.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.5, 1, 0.8],
    });

    const closedBoxOpacity = animSequence.interpolate({
        inputRange: [0.8, 1, 1.8, 2],
        outputRange: [0, 1, 1, 0],
    });
    const closedBoxScale = animSequence.interpolate({
        inputRange: [0.8, 1, 1.5, 2],
        outputRange: [0.8, 1, 1, 0.8],
    });

    const giftBoxOpacity = animSequence.interpolate({
        inputRange: [1.8, 2, 2.5, 3],
        outputRange: [0, 1, 1, 0],
    });
    const giftBoxScale = animSequence.interpolate({
        inputRange: [1.8, 2, 2.5, 3],
        outputRange: [0.8, 1, 1.1, 1],
    });

    const sparklesOpacity = animSequence.interpolate({
        inputRange: [2, 2.3, 2.7, 3],
        outputRange: [0, 1, 1, 0],
    });
    const sparklesScale = animSequence.interpolate({
        inputRange: [2, 2.5, 3],
        outputRange: [0.5, 1.2, 0.8],
    });

    return (
        <Modal transparent={false} visible={visible} animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.animationContainer}>
                    {/* Open Box */}
                    <Animated.View style={[styles.iconLayer, { opacity: openBoxOpacity, transform: [{ scale: openBoxScale }] }]}>
                        <PackageOpen size={80} color={theme.colors.primary} strokeWidth={1.5} />
                    </Animated.View>

                    {/* Closed Box */}
                    <Animated.View style={[styles.iconLayer, { opacity: closedBoxOpacity, transform: [{ scale: closedBoxScale }] }]}>
                        <Package size={80} color={theme.colors.primary} strokeWidth={1.5} />
                    </Animated.View>

                    {/* Gift Box */}
                    <Animated.View style={[styles.iconLayer, { opacity: giftBoxOpacity, transform: [{ scale: giftBoxScale }] }]}>
                        <Gift size={80} color={theme.colors.primary} strokeWidth={1.5} />
                    </Animated.View>
                    
                    {/* Sparkles around Gift */}
                    <Animated.View style={[styles.iconLayer, { opacity: sparklesOpacity, transform: [{ scale: sparklesScale }] }]}>
                        <View style={{ position: 'absolute', top: -30, left: -30 }}>
                            <Sparkles size={24} color={theme.colors.primaryDark} />
                        </View>
                        <View style={{ position: 'absolute', bottom: -20, right: -30 }}>
                            <Sparkles size={32} color={theme.colors.primaryDark} />
                        </View>
                        <View style={{ position: 'absolute', top: 10, right: -40 }}>
                            <Sparkles size={20} color={theme.colors.primary} />
                        </View>
                    </Animated.View>
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Handcrafting Your Order</Text>
                    <Text style={styles.message}>{message || 'Wrapping things up...'}</Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animationContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    iconLayer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textAlign: 'center',
        lineHeight: 24,
    }
});
