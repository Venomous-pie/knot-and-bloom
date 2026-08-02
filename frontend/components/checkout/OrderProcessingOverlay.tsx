import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { PackageOpen, Package, Gift, Sparkles } from 'lucide-react-native';

interface OrderProcessingOverlayProps {
    visible: boolean;
    message: string | null;
}

const STAGES = ['open', 'closed', 'gift'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_ICON: Record<Stage, React.ComponentType<any>> = {
    open: PackageOpen,
    closed: Package,
    gift: Gift,
};

// How long each stage holds before advancing (ms)
const STAGE_DURATIONS: Record<Stage, number> = {
    open: 750,
    closed: 750,
    gift: 1400,
};

const SPARKLE_POSITIONS = [
    { top: -34, left: -34, size: 22, delay: 0 },
    { bottom: -22, right: -34, size: 30, delay: 120 },
    { top: 6, right: -44, size: 18, delay: 240 },
    { bottom: 4, left: -44, size: 16, delay: 360 },
];

export function OrderProcessingOverlay({ visible, message }: OrderProcessingOverlayProps) {
    const [stage, setStage] = useState<Stage>('open');

    useEffect(() => {
        if (!visible) return;

        setStage('open');
        let index = 0;
        let timer: ReturnType<typeof setTimeout>;

        const advance = () => {
            index = (index + 1) % STAGES.length;
            const next = STAGES[index];
            setStage(next);
            timer = setTimeout(advance, STAGE_DURATIONS[next]);
        };

        timer = setTimeout(advance, STAGE_DURATIONS['open']);
        return () => clearTimeout(timer);
    }, [visible]);

    if (!visible) return null;

    const Icon = STAGE_ICON[stage];
    const isGiftStage = stage === 'gift';

    return (
        <Modal transparent={false} visible={visible} animationType="slide">
            <SafeAreaView style={styles.container}>
                {/* Soft ambient glow pulsing behind everything */}
                <MotiView
                    style={styles.glow}
                    from={{ opacity: 0.12, scale: 0.9 }}
                    animate={{ opacity: 0.32, scale: 1.15 }}
                    transition={{
                        type: 'timing',
                        duration: 1600,
                        easing: Easing.inOut(Easing.ease),
                        loop: true,
                    }}
                />

                {/* Whole icon stack gently bobs up and down */}
                <MotiView
                    style={styles.animationContainer}
                    from={{ translateY: 0 }}
                    animate={{ translateY: -8 }}
                    transition={{
                        type: 'timing',
                        duration: 1200,
                        easing: Easing.inOut(Easing.sin),
                        loop: true,
                    }}
                >
                    {/* Icon swaps with a spring-driven pop + rotate, not a flat cross-fade */}
                    <AnimatePresence exitBeforeEnter>
                        <MotiView
                            key={stage}
                            style={styles.iconLayer}
                            from={{ opacity: 0, scale: 0.4, rotate: '-18deg' }}
                            animate={{ opacity: 1, scale: 1, rotate: '0deg' }}
                            exit={{ opacity: 0, scale: 0.6, rotate: '18deg' }}
                            transition={{ type: 'spring', damping: 12, stiffness: 160 }}
                        >
                            <Icon size={80} color={theme.colors.primary} strokeWidth={1.5} />
                        </MotiView>
                    </AnimatePresence>

                    {/* Sparkles pop in individually with staggered delays and a gentle loop */}
                    {isGiftStage &&
                        SPARKLE_POSITIONS.map((pos, idx) => (
                            <MotiView
                                key={idx}
                                style={[styles.sparkle, pos]}
                                from={{ opacity: 0, scale: 0, rotate: '0deg' }}
                                animate={{ opacity: 1, scale: 1, rotate: '180deg' }}
                                transition={{
                                    type: 'timing',
                                    duration: 900,
                                    delay: pos.delay,
                                    easing: Easing.out(Easing.exp),
                                    loop: true,
                                    repeatReverse: true,
                                }}
                            >
                                <Sparkles
                                    size={pos.size}
                                    color={idx % 2 === 0 ? theme.colors.primaryDark : theme.colors.primary}
                                />
                            </MotiView>
                        ))}
                </MotiView>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>Handcrafting Your Order</Text>
                    <MotiText
                        key={message}
                        style={styles.message}
                        from={{ opacity: 0, translateY: 4 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 400 }}
                    >
                        {message || 'Wrapping things up...'}
                    </MotiText>
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
    glow: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: theme.colors.primary,
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
    sparkle: {
        position: 'absolute',
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
    },
});