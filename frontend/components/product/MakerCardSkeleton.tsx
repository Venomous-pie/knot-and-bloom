import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '@/constants/theme';

export default function MakerCardSkeleton({ style }: { style?: any }) {
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
        <View style={[styles.card, style]}>
            <Animated.View style={[styles.content, { opacity: pulseAnim }]}>
                <View style={styles.headerRow}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar} />
                    </View>
                    <View style={styles.statsContainer}>
                        <View style={styles.statBadge} />
                        <View style={styles.statBadgeSecondary} />
                    </View>
                </View>

                <View style={styles.infoContainer}>
                    <View style={styles.makerName} />
                    <View style={styles.chipRow}>
                        <View style={styles.chip} />
                        <View style={styles.chipSmall} />
                    </View>
                </View>

                <View style={styles.footerRow}>
                    <View style={styles.actionText} />
                    <View style={styles.actionIcon} />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        height: 280,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    avatarContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#CBD5E1',
    },
    statsContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: theme.spacing.xs,
    },
    statBadge: {
        width: 40,
        height: 22,
        backgroundColor: '#E2E8F0',
        borderRadius: 11,
    },
    statBadgeSecondary: {
        width: 60,
        height: 18,
        backgroundColor: '#E2E8F0',
        borderRadius: 9,
    },
    infoContainer: {
        marginBottom: theme.spacing.lg,
    },
    makerName: {
        width: '70%',
        height: 24,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 4,
    },
    chip: {
        width: 80,
        height: 18,
        backgroundColor: '#E2E8F0',
        borderRadius: 9,
    },
    chipSmall: {
        width: 50,
        height: 18,
        backgroundColor: '#E2E8F0',
        borderRadius: 9,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    actionText: {
        width: 70,
        height: 16,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    actionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E2E8F0',
    }
});
