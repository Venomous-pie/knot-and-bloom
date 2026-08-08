import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface CartOrderSummaryProps {
    subtotal: number;
    shippingEstimate?: number;
    discount?: number;
    total: number;
    onCheckout: () => void;
    checkoutDisabled: boolean;
    itemCount: number;
}

export const CartOrderSummary = ({
    subtotal,
    shippingEstimate,
    discount = 0,
    total,
    onCheckout,
    checkoutDisabled,
    itemCount
}: CartOrderSummaryProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Order Summary</Text>

            <View style={styles.row}>
                <Text style={styles.label}>Subtotal ({itemCount} items)</Text>
                <Text style={styles.value}>₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            {shippingEstimate !== undefined && (
                <View style={styles.row}>
                    <Text style={styles.label}>Shipping Estimate</Text>
                    <Text style={styles.value}>₱{shippingEstimate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
            )}

            {discount > 0 && (
                <View style={styles.row}>
                    <Text style={[styles.label, styles.discountText]}>Discount</Text>
                    <Text style={[styles.value, styles.discountText]}>-₱{discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
            )}

            {/* Promo Code Input */}
            <View style={styles.promoContainer}>
                <TextInput
                    style={styles.promoInput}
                    placeholder="Enter Promo Code"
                    placeholderTextColor={theme.colors.textLight}
                />
                <Pressable style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>Apply</Text>
                </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>

            <Pressable
                style={[styles.checkoutBtn, checkoutDisabled && styles.checkoutBtnDisabled]}
                onPress={onCheckout}
                disabled={checkoutDisabled}
            >
                {checkoutDisabled ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                )}
            </Pressable>

            <View style={styles.secureRow}>
                <Ionicons name="lock-closed-outline" size={14} color={theme.colors.textLight} />
                <Text style={styles.secureText}>Secure Checkout</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
        margin: theme.spacing.md,
        marginTop: 0,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.lg,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    label: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    },
    value: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        fontWeight: '600',
    },
    discountText: {
        color: theme.colors.success,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
    },
    totalLabel: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.base,
        fontWeight: '700',
        color: theme.colors.text,
    },
    totalValue: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.xl,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    checkoutBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
    },
    checkoutBtnDisabled: {
        backgroundColor: theme.colors.textLight,
        opacity: 0.7,
    },
    checkoutBtnText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: 'white',
    },
    promoContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    promoInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8, // Fixed height for alignment
        fontFamily: theme.typography.fontFamily,
        color: theme.colors.text,
        backgroundColor: theme.colors.subtle,
    },
    applyBtn: {
        backgroundColor: theme.colors.text,
        paddingHorizontal: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
    },
    applyBtnText: {
        color: 'white',
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
    },
    secureRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        gap: 4,
    },
    secureText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
    },
});
