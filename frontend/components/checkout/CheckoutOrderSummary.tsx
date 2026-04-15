import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { TrustBadge } from '@/components/checkout/TrustBadge';
import { theme } from '@/constants/theme';

type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'card';

interface CheckoutOrderSummaryProps {
    totalAmount: number;
    shippingFee: number;
    hasFreeShipping: boolean;
    paymentMethod: PaymentMethod;
    codDepositPercent: number;
    isProcessing: boolean;
    onPlaceOrder: () => void;
}

export function CheckoutOrderSummary({
    totalAmount,
    shippingFee,
    hasFreeShipping,
    paymentMethod,
    codDepositPercent,
    isProcessing,
    onPlaceOrder,
}: CheckoutOrderSummaryProps) {
    const grandTotal = totalAmount + shippingFee;

    const placeOrderLabel = paymentMethod === 'cod'
        ? (codDepositPercent > 0
            ? `Pay Deposit ₱${(grandTotal * (codDepositPercent / 100)).toFixed(2)}`
            : 'Place Order (Pay on Delivery)')
        : 'Place Order';

    return (
        <View style={styles.container}>
            {/* Subtotal */}
            <View style={styles.row}>
                <Text style={styles.label}>Merchandise Subtotal:</Text>
                <Text style={styles.value}>₱{totalAmount.toFixed(2)}</Text>
            </View>

            {/* Shipping */}
            <View style={styles.row}>
                <Text style={styles.label}>Shipping Total:</Text>
                {hasFreeShipping ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.value, { textDecorationLine: 'line-through', color: theme.colors.textSecondary, fontSize: 13 }]}>₱60.00</Text>
                        <Text style={[styles.value, { color: theme.colors.primary, fontWeight: '600' }]}>Free</Text>
                    </View>
                ) : (
                    <Text style={styles.value}>₱{shippingFee.toFixed(2)}</Text>
                )}
            </View>

            {/* Total */}
            <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Payment:</Text>
                <Text style={styles.totalAmount}>₱{grandTotal.toFixed(2)}</Text>
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
                <Pressable
                    style={[styles.placeOrderButton, isProcessing && styles.disabledButton]}
                    onPress={onPlaceOrder}
                    disabled={isProcessing}
                >
                    {isProcessing
                        ? <ActivityIndicator color="white" />
                        : <Text style={styles.placeOrderText}>{placeOrderLabel}</Text>
                    }
                </Pressable>
            </View>

            <TrustBadge />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 16,
        ...theme.shadows.sm,
        marginTop: theme.spacing.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        alignItems: 'center',
        marginBottom: 8,
    },
    totalRow: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 8,
    },
    label: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    value: {
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        minWidth: 80,
        textAlign: 'right',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginTop: 8,
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
        minWidth: 80,
        textAlign: 'right',
        marginTop: 8,
    },
    actionRow: {
        alignItems: 'flex-end',
        marginTop: 24,
    },
    placeOrderButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.md,
        minWidth: 200,
    },
    placeOrderText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        fontFamily: theme.typography.fontFamily,
    },
    disabledButton: { opacity: 0.7 },
});
