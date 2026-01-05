import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, Clock } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export const TrustBadge = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ShieldCheck size={20} color={theme.colors.primary} />
                <Text style={styles.title}>Knot&Bloom Guarantee</Text>
            </View>
            <Text style={styles.description}>
                Your payment is held securely in escrow. The seller is only paid after you verify you've received your order.
            </Text>
            <View style={styles.timeline}>
                <View style={styles.step}>
                    <View style={[styles.dot, styles.dotActive]} />
                    <Text style={styles.stepText}>Order</Text>
                </View>
                <View style={[styles.line, styles.lineActive]} />
                <View style={styles.step}>
                    <View style={styles.dot} />
                    <Text style={styles.stepText}>Delivery</Text>
                </View>
                <View style={styles.line} />
                <View style={styles.step}>
                    <View style={styles.dot} />
                    <Text style={styles.stepText}>Verify</Text>
                </View>
                <View style={styles.line} />
                <View style={styles.step}>
                    <View style={styles.dot} />
                    <Text style={styles.stepText}>Released</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginTop: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
        ...theme.shadows.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    description: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: theme.typography.fontFamily,
    },
    timeline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    step: {
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.border,
    },
    dotActive: {
        backgroundColor: theme.colors.primary,
    },
    stepText: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    line: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.border,
        marginHorizontal: 4,
        marginBottom: 14, // align with dot
    },
    lineActive: {
        backgroundColor: theme.colors.primary,
    },
});
