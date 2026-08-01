import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'maribank' | 'card';

interface CheckoutOrderSummaryProps {
    totalAmount: number;
    subtotal?: number;
    platformFee?: number;
    shippingFee: number;
    hasFreeShipping: boolean;
    paymentMethod: PaymentMethod;
    codDepositPercent: number;
    isProcessing: boolean;
    onPlaceOrder: () => void;
    isStickyLayout?: boolean;
}

export function CheckoutOrderSummary({
    totalAmount,
    subtotal,
    platformFee,
    shippingFee,
    hasFreeShipping,
    paymentMethod,
    codDepositPercent,
    isProcessing,
    onPlaceOrder,
    isStickyLayout = false,
}: CheckoutOrderSummaryProps) {
    const grandTotal = totalAmount + shippingFee;

    const placeOrderLabel = paymentMethod === 'cod'
        ? (codDepositPercent > 0
            ? `Pay Deposit ₱${(grandTotal * (codDepositPercent / 100)).toFixed(2)}`
            : 'Place Order (Pay on Delivery)')
        : 'Place Order';

    return (
        <View style={[styles.container, isStickyLayout && styles.stickyContainer]}>
            <Text style={styles.title}>Order Summary</Text>
            
            {/* Subtotal */}
            <View style={styles.row}>
                <Text style={styles.label}>Merchandise Subtotal:</Text>
                <Text style={styles.value}>₱{(subtotal ?? totalAmount).toFixed(2)}</Text>
            </View>

            {/* Platform Fee */}
            {(platformFee ?? 0) > 0 && (
                <View style={styles.row}>
                    <Text style={styles.label}>Platform & Trust Fee:</Text>
                    <Text style={styles.value}>₱{(platformFee ?? 0).toFixed(2)}</Text>
                </View>
            )}

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
                <Text style={styles.totalAmount}>
                    <Text style={{ fontWeight: '400' }}>₱</Text>
                    {grandTotal.toFixed(2)}
                </Text>
            </View>

            {/* Action Button */}
            <View style={styles.actionRow}>
                <Pressable
                    style={[styles.placeOrderButton, isProcessing && styles.disabledButton]}
                    onPress={onPlaceOrder}
                    disabled={isProcessing}
                >
                    <Text style={styles.placeOrderText}>
                        {isProcessing ? 'Processing...' : placeOrderLabel}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 16,
        ...theme.shadows.sm,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 16,
    },
    stickyContainer: {
        borderRadius: 0,
        marginTop: 0,
        shadowOpacity: 0,
        elevation: 0,
        padding: 0,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        alignItems: 'stretch',
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
        width: '100%',
    },
    placeOrderText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        fontFamily: theme.typography.fontFamily,
    },
    disabledButton: { opacity: 0.7 },
});
