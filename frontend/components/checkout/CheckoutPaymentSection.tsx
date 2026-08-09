import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Banknote, AlertTriangle, QrCode } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export type PaymentMethod = 'cod' | 'gcash' | 'paymaya' | 'maribank' | 'qrph';
export type DepositPaymentMethod = 'gcash' | 'paymaya' | 'maribank' | 'qrph' | 'card';

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

    const isCodSelected = paymentMethod === 'cod';
    const activeWallet = isCodSelected ? depositPaymentMethod : paymentMethod;
    const requiresDeposit = isCodSelected && codDepositPercent > 0;
    const showWallets = !isCodSelected || requiresDeposit;

    const handleWalletSelect = (method: 'gcash' | 'paymaya' | 'maribank' | 'qrph') => {
        if (isCodSelected) {
            onDepositSelect?.(method);
        } else {
            onSelect(method);
        }
    };

    return (
        <View style={styles.paymentMethods}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>
                Payment Option
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <Pressable
                    style={[
                        styles.termChip, 
                        !isCodSelected && styles.termChipSelected
                    ]}
                    onPress={() => {
                        onSelect(activeWallet as PaymentMethod);
                    }}
                >
                    <Text style={[styles.termChipText, !isCodSelected && styles.termChipTextSelected]}>
                        Pay in Full
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.termChip, 
                        isCodSelected && styles.termChipSelected,
                        !isCodAllowed && { opacity: 0.5, backgroundColor: '#eee' }
                    ]}
                    onPress={() => isCodAllowed && onSelect('cod')}
                    disabled={!isCodAllowed}
                >
                    <Text style={[
                        styles.termChipText, 
                        isCodSelected && styles.termChipTextSelected,
                        !isCodAllowed && { color: '#999' }
                    ]}>
                        {isCodAllowed ? 'Cash on Delivery' : 'COD Unavailable'}
                    </Text>
                </Pressable>
            </View>

            {/* COD Deposit Warning */}
            {isCodSelected && codDepositPercent > 0 && codReason && (
                <View style={[styles.splitContainer, { padding: 16, marginBottom: 8 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <AlertTriangle size={16} color="#D97706" style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 13, color: '#D97706', fontWeight: '600', flex: 1, lineHeight: 18, fontFamily: theme.typography.fontFamily }}>
                            {codReason}
                        </Text>
                    </View>
                </View>
            )}

            {showWallets && (
                <>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 8, marginBottom: 8 }}>
                        {isCodSelected ? 'Select Payment Method for Deposit' : 'Select Payment Method'}
                    </Text>

                    {/* GCash */}
                    <Pressable
                        style={[styles.chip, activeWallet === 'gcash' && styles.chipSelected]}
                        onPress={() => handleWalletSelect('gcash')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Image 
                                source={require('@/assets/payment_methods/gcash/GCash_idOP67IR4D_1.png')} 
                                style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                            />
                            <Text style={[styles.chipText, activeWallet === 'gcash' && styles.chipTextSelected]}>GCash</Text>
                        </View>
                        {activeWallet === 'gcash' && <Check size={16} color={theme.colors.primary} />}
                    </Pressable>

                    {/* Maya */}
                    <Pressable
                        style={[styles.chip, activeWallet === 'paymaya' && styles.chipSelected]}
                        onPress={() => handleWalletSelect('paymaya')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Image 
                                source={require('@/assets/payment_methods/maya/Maya_idX88ZrhHL_1.png')} 
                                style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                            />
                            <Text style={[styles.chipText, activeWallet === 'paymaya' && styles.chipTextSelected]}>Maya</Text>
                        </View>
                        {activeWallet === 'paymaya' && <Check size={16} color={theme.colors.primary} />}
                    </Pressable>

                    {/* Maribank */}
                    <Pressable
                        style={[styles.chip, activeWallet === 'maribank' && styles.chipSelected]}
                        onPress={() => handleWalletSelect('maribank')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Image 
                                source={require('@/assets/payment_methods/mari_bank/MariBank_Philippines_idU8zrGSy__0.png')} 
                                style={{ width: 24, height: 24, resizeMode: 'contain' }} 
                            />
                            <Text style={[styles.chipText, activeWallet === 'maribank' && styles.chipTextSelected]}>MariBank</Text>
                        </View>
                        {activeWallet === 'maribank' && <Check size={16} color={theme.colors.primary} />}
                    </Pressable>

                    {/* QR Ph */}
                    <Pressable
                        style={[styles.chip, activeWallet === 'qrph' && styles.chipSelected]}
                        onPress={() => handleWalletSelect('qrph')}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                                <QrCode size={20} color={activeWallet === 'qrph' ? theme.colors.primary : theme.colors.text} />
                            </View>
                            <Text style={[styles.chipText, activeWallet === 'qrph' && styles.chipTextSelected]}>QR Ph</Text>
                        </View>
                        {activeWallet === 'qrph' && <Check size={16} color={theme.colors.primary} />}
                    </Pressable>
                </>
            )}

            {/* Escrow Protection (non-COD) */}
            {!isCodSelected && (
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
    termChip: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
    },
    termChipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: `${theme.colors.primary}08`,
    },
    termChipText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    termChipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
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
