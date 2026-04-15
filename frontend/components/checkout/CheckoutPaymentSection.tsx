import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';

type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'card';

interface CheckoutPaymentSectionProps {
    paymentMethod: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
    isCodAllowed: boolean;
    codDepositPercent: number;
    codReason?: string | null;
    totalAmount: number;
    shippingFee: number;
}

export function CheckoutPaymentSection({
    paymentMethod,
    onSelect,
    isCodAllowed,
    codDepositPercent,
    codReason,
    totalAmount,
    shippingFee,
}: CheckoutPaymentSectionProps) {
    const grandTotal = totalAmount + shippingFee;

    return (
        <View style={styles.paymentMethods}>
            {/* COD */}
            <Pressable
                style={[
                    styles.chip,
                    paymentMethod === 'cod' && styles.chipSelected,
                    !isCodAllowed && { opacity: 0.5, backgroundColor: '#eee' }
                ]}
                onPress={() => isCodAllowed && onSelect('cod')}
                disabled={!isCodAllowed}
            >
                <Text style={[
                    styles.chipText,
                    paymentMethod === 'cod' && styles.chipTextSelected,
                    !isCodAllowed && { color: '#999' }
                ]}>
                    {isCodAllowed ? 'Cash on Delivery' : 'COD Unavailable'}
                </Text>
                {paymentMethod === 'cod' && isCodAllowed && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* GCash */}
            <Pressable
                style={[styles.chip, paymentMethod === 'gcash' && styles.chipSelected]}
                onPress={() => onSelect('gcash')}
            >
                <Text style={[styles.chipText, paymentMethod === 'gcash' && styles.chipTextSelected]}>GCash</Text>
                {paymentMethod === 'gcash' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* Maya */}
            <Pressable
                style={[styles.chip, paymentMethod === 'paymaya' && styles.chipSelected]}
                onPress={() => onSelect('paymaya')}
            >
                <Text style={[styles.chipText, paymentMethod === 'paymaya' && styles.chipTextSelected]}>Maya</Text>
                {paymentMethod === 'paymaya' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* Card */}
            <Pressable
                style={[styles.chip, paymentMethod === 'card' && styles.chipSelected]}
                onPress={() => onSelect('card')}
            >
                <Text style={[styles.chipText, paymentMethod === 'card' && styles.chipTextSelected]}>Credit/Debit Card</Text>
                {paymentMethod === 'card' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* COD Deposit Warning */}
            {paymentMethod === 'cod' && codDepositPercent > 0 && (
                <View style={styles.splitContainer}>
                    {codReason && (
                        <Text style={{ fontSize: 12, color: '#F59E0B', marginBottom: 8, fontWeight: '600' }}>
                            ⚠️ {codReason}
                        </Text>
                    )}
                    <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Due Now ({codDepositPercent}% Deposit):</Text>
                        <Text style={styles.splitValue}>₱{(grandTotal * (codDepositPercent / 100)).toFixed(2)}</Text>
                    </View>
                    <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Due on Delivery ({100 - codDepositPercent}%):</Text>
                        <Text style={styles.splitValue}>₱{(grandTotal * ((100 - codDepositPercent) / 100)).toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {/* Escrow Protection (non-COD) */}
            {paymentMethod !== 'cod' && (
                <View style={styles.splitContainer}>
                    <Text style={[styles.splitLabel, { marginBottom: 4 }]}>Strict Escrow Protection</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, fontFamily: theme.typography.fontFamily }}>
                        You are paying the full amount of{' '}
                        <Text style={{ fontWeight: '700', color: theme.colors.primary }}>₱{grandTotal.toFixed(2)}</Text>.
                        This amount is held securely.{' '}
                        <Text style={{ fontWeight: '700' }}>If the item is damaged or incorrect, you can request a return or refund.</Text>{' '}
                        Funds are only released to the seller after you verify the item.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    paymentMethods: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    chip: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight + '10',
    },
    chipText: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    chipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    splitContainer: {
        width: '100%',
        marginTop: 12,
        padding: 12,
        backgroundColor: theme.colors.primaryLight + '20',
        borderRadius: 8,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    splitLabel: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    splitValue: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '700',
        fontFamily: theme.typography.fontFamily,
    },
});
