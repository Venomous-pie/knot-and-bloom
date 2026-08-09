import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'maribank' | 'card' | 'qrph';

export interface ShippingBreakdownItem {
    sellerName: string;
    fee: number;
    isPickup?: boolean;
}

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
    shippingBreakdown?: ShippingBreakdownItem[];
    totalSavings?: number;
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
    shippingBreakdown,
    totalSavings = 0,
}: CheckoutOrderSummaryProps) {
    const [isShippingExpanded, setIsShippingExpanded] = useState(false);
    const grandTotal = totalAmount + shippingFee;

    const placeOrderLabel = paymentMethod === 'cod'
        ? (codDepositPercent > 0
            ? `Pay Deposit ₱${(totalAmount * (codDepositPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'Place Order (Pay on Delivery)')
        : 'Place Order';

    return (
        <View style={[styles.container, isStickyLayout && styles.stickyContainer]}>
            <Text style={styles.title}>Order Summary</Text>
            
            {/* Subtotal & Savings Logic */}
            {totalSavings > 0 ? (
                <>
                    <View style={styles.row}>
                        <Text style={styles.label}>Original Subtotal:</Text>
                        <Text style={styles.value}>₱{((subtotal ?? totalAmount) + totalSavings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={[styles.row, { paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                        <Text style={styles.label}>Total Savings:</Text>
                        <Text style={[styles.value, { color: theme.colors.success }]}>
                            -₱{totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.row, { marginTop: 8 }]}>
                        <Text style={styles.label}>Merchandise Subtotal:</Text>
                        <Text style={styles.value}>₱{(subtotal ?? totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                </>
            ) : (
                <View style={styles.row}>
                    <Text style={styles.label}>Merchandise Subtotal:</Text>
                    <Text style={styles.value}>₱{(subtotal ?? totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
            )}

    {/* Platform fee on the buyer side has been removed. */}

            {/* Shipping */}
            <View style={{ marginBottom: 8 }}>
                <Pressable 
                    style={[styles.row, { marginBottom: 0 }]} 
                    onPress={() => setIsShippingExpanded(!isShippingExpanded)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.label}>Shipping Total:</Text>
                        {(shippingBreakdown?.length || 0) > 0 && (
                            <Ionicons 
                                name={isShippingExpanded ? 'chevron-up' : 'chevron-down'} 
                                size={14} 
                                color={theme.colors.textSecondary} 
                            />
                        )}
                    </View>
                    {hasFreeShipping ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.value, { textDecorationLine: 'line-through', color: theme.colors.textSecondary, fontSize: 13 }]}>₱60.00</Text>
                            <Text style={[styles.value, { color: theme.colors.primary, fontWeight: '600' }]}>Free</Text>
                        </View>
                    ) : (
                        <Text style={styles.value}>₱{shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    )}
                </Pressable>
                
                {isShippingExpanded && (shippingBreakdown?.length || 0) > 0 && (
                    <View style={styles.breakdownContainer}>
                        {shippingBreakdown!.map((item, idx) => (
                            <View key={idx} style={styles.breakdownRow}>
                                <Text style={styles.breakdownLabel} numberOfLines={1}>
                                    {item.sellerName} {item.isPickup && '(Pickup)'}
                                </Text>
                                <Text style={styles.breakdownValue}>
                                    {item.fee === 0 ? 'Free' : `₱${item.fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {paymentMethod === 'cod' && codDepositPercent > 0 ? (
                <>
                    <View style={styles.row}>
                        <Text style={[styles.label, { fontWeight: '600', color: theme.colors.text }]}>Total Order Amount:</Text>
                        <Text style={[styles.value, { fontWeight: '600' }]}>
                            ₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.row, styles.totalRow, { marginBottom: 4, paddingBottom: 0 }]}>
                        <Text style={[styles.totalLabel, { color: theme.colors.primary }]}>To Pay Now:</Text>
                        <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
                            <Text style={{ fontWeight: '400', fontFamily: theme.typography.fontFamily }}>₱</Text>
                            {(totalAmount * (codDepositPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={[styles.row, { marginBottom: 16, marginTop: 4 }]}>
                        <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily }}>Due on Delivery:</Text>
                        <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily, fontWeight: '500' }}>
                            ₱{((totalAmount * ((100 - codDepositPercent) / 100)) + shippingFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                    </View>
                </>
            ) : (
                <View style={[styles.row, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Payment:</Text>
                    <Text style={styles.totalAmount}>
                        <Text style={{ fontWeight: '400', fontFamily: theme.typography.fontFamily }}>₱</Text>
                        {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                </View>
            )}

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
    breakdownContainer: {
        marginTop: 8,
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: theme.colors.border,
        gap: 6,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    breakdownLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        flex: 1,
    },
    breakdownValue: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
});
