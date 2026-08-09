import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Banknote } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'maribank';
export type DepositPaymentMethod = 'gcash' | 'paymaya' | 'maribank' | 'card';

interface CheckoutPaymentSectionProps {
    paymentMethod: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
    depositPaymentMethod?: DepositPaymentMethod;
    onDepositSelect?: (method: DepositPaymentMethod) => void;
    isCodAllowed: boolean;
    codDepositPercent: number;
    codReason?: string | null;
    totalAmount: number;
    shippingFee: number;
}

export function CheckoutPaymentSection({
    paymentMethod,
    onSelect,
    depositPaymentMethod = 'gcash',
    onDepositSelect,
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Banknote size={20} color={paymentMethod === 'cod' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[
                        styles.chipText,
                        paymentMethod === 'cod' && styles.chipTextSelected,
                        !isCodAllowed && { color: '#999' }
                    ]}>
                        {isCodAllowed ? 'Cash on Delivery' : 'COD Unavailable'}
                    </Text>
                </View>
                {paymentMethod === 'cod' && isCodAllowed && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* GCash */}
            <Pressable
                style={[styles.chip, paymentMethod === 'gcash' && styles.chipSelected]}
                onPress={() => onSelect('gcash')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image 
                        source={require('@/assets/payment_methods/gcash/GCash_idOP67IR4D_1.png')} 
                        style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                    />
                    <Text style={[styles.chipText, paymentMethod === 'gcash' && styles.chipTextSelected]}>GCash</Text>
                </View>
                {paymentMethod === 'gcash' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* Maya */}
            <Pressable
                style={[styles.chip, paymentMethod === 'paymaya' && styles.chipSelected]}
                onPress={() => onSelect('paymaya')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image 
                        source={require('@/assets/payment_methods/maya/Maya_idX88ZrhHL_1.png')} 
                        style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                    />
                    <Text style={[styles.chipText, paymentMethod === 'paymaya' && styles.chipTextSelected]}>Maya</Text>
                </View>
                {paymentMethod === 'paymaya' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* Maribank */}
            <Pressable
                style={[styles.chip, paymentMethod === 'maribank' && styles.chipSelected]}
                onPress={() => onSelect('maribank')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image 
                        source={require('@/assets/payment_methods/mari_bank/MariBank_Philippines_idU8zrGSy__0.png')} 
                        style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                    />
                    <Text style={[styles.chipText, paymentMethod === 'maribank' && styles.chipTextSelected]}>MariBank</Text>
                </View>
                {paymentMethod === 'maribank' && <Check size={16} color={theme.colors.primary} />}
            </Pressable>

            {/* COD Deposit Warning */}
            {paymentMethod === 'cod' && codDepositPercent > 0 && (
                <View style={[styles.splitContainer, { padding: 16 }]}>
                    {codReason && (
                        <Text style={{ fontSize: 13, color: '#D97706', marginBottom: 12, fontWeight: '600' }}>
                            ⚠️ {codReason}
                        </Text>
                    )}
                    <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Due Now ({codDepositPercent}% Deposit):</Text>
                        <Text style={styles.splitValue}>₱{(totalAmount * (codDepositPercent / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>
                    <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Due on Delivery ({100 - codDepositPercent}%):</Text>
                        <Text style={styles.splitValue}>₱{((totalAmount * ((100 - codDepositPercent) / 100)) + shippingFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 16, marginBottom: 8 }}>
                        Pay deposit via:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        {(['gcash', 'paymaya', 'maribank'] as const).map(method => (
                            <Pressable 
                                key={method}
                                style={[
                                    styles.depositChip, 
                                    depositPaymentMethod === method && styles.depositChipSelected
                                ]}
                                onPress={() => onDepositSelect?.(method)}
                            >
                                <Text style={[
                                    styles.depositChipText, 
                                    depositPaymentMethod === method && styles.depositChipTextSelected
                                ]}>
                                    {method === 'gcash' ? 'GCash' : method === 'paymaya' ? 'Maya' : 'MariBank'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            )}

            {/* Escrow Protection (non-COD) */}
            {paymentMethod !== 'cod' && (
                <View style={styles.splitContainer}>
                    <Text style={[styles.splitLabel, { marginBottom: 4 }]}>Strict Escrow Protection</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18, fontFamily: theme.typography.fontFamily }}>
                        You are paying the full amount of{' '}
                        <Text style={{ fontWeight: '700', color: theme.colors.primary }}>₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>.
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
        flexDirection: 'column',
        gap: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}08`,
    },
    chipText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    chipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    depositChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    depositChipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}10`,
    },
    depositChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    depositChipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    splitContainer: {
        marginTop: 4,
        padding: 16,
        backgroundColor: '#FFFBEB',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    splitLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    splitValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
});
