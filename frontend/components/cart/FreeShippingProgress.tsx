import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface FreeShippingProgressProps {
    currentTotal: number;
    threshold: number;
}

export const FreeShippingProgress = ({ currentTotal, threshold }: FreeShippingProgressProps) => {
    const progress = Math.min(currentTotal / threshold, 1);
    const remaining = threshold - currentTotal;
    const isEligible = currentTotal >= threshold;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {isEligible ? (
                    <Text style={styles.successText}>
                        <Ionicons name="gift-outline" size={16} /> Free shipping from this shop!
                    </Text>
                ) : (
                    <Text style={styles.text}>
                        Add <Text style={styles.bold}>₱{remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text> for <Text style={styles.highlight}>Free Shipping</Text> from this shop
                    </Text>
                )}
            </View>

            <View style={styles.track}>
                <View style={[
                    styles.fill,
                    { width: `${progress * 100}%` },
                    isEligible && styles.fillSuccess
                ]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        marginHorizontal: theme.spacing.md,
        marginVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.sm,
    },
    text: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    },
    successText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.secondary, // Green
        fontWeight: '600',
    },
    bold: {
        fontWeight: '700',
        color: theme.colors.text,
    },
    highlight: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    track: {
        height: 6,
        backgroundColor: theme.colors.subtle,
        borderRadius: 3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
    fillSuccess: {
        backgroundColor: theme.colors.secondary,
    },
});
