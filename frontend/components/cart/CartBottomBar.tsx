import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface CartBottomBarProps {
    subtotal: number;
    totalSavings: number;
    selectedCount: number;
    totalItems: number;
    allSelected: boolean;
    onToggleSelectAll: () => void;
    onCheckout: () => void;
    onDeleteSelected: () => void;
    loading: boolean;
}

export const CartBottomBar = ({
    subtotal,
    totalSavings,
    selectedCount,
    totalItems,
    allSelected,
    onToggleSelectAll,
    onCheckout,
    onDeleteSelected,
    loading
}: CartBottomBarProps) => {
    const [showVoucher, setShowVoucher] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Layer 1: Platform Voucher ... Saved */}
                <View style={styles.row}>
                    <View style={styles.voucherSection}>
                        <Pressable style={styles.voucherBtn} onPress={() => setShowVoucher(!showVoucher)}>
                            <Ionicons name="ticket-outline" size={16} color="#B36979" />
                            <Text style={styles.voucherBtnText}>Platform Voucher</Text>
                            <Ionicons name={showVoucher ? "chevron-up" : "chevron-down"} size={12} color={theme.colors.textSecondary} />
                        </Pressable>
                        {showVoucher && (
                            <TextInput
                                style={styles.voucherInput}
                                placeholder="Enter code"
                                placeholderTextColor={theme.colors.textLight}
                                value={voucherCode}
                                onChangeText={setVoucherCode}
                            />
                        )}
                    </View>
                    <View style={styles.savingsSection}>
                        <Ionicons name="pricetag" size={14} color={totalSavings > 0 ? '#B36979' : theme.colors.textLight} />
                        <Text style={[styles.savingsText, totalSavings === 0 && styles.savingsDisabled]}>
                            Saved: ₱{totalSavings.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Layer 2: Select All + Delete ... Total + Checkout */}
                <View style={styles.row}>
                    <View style={styles.actionsSection}>
                        <Pressable style={styles.selectAllRow} onPress={onToggleSelectAll}>
                            <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                                {allSelected && <Ionicons name="checkmark" size={10} color="white" />}
                            </View>
                            <Text style={styles.selectAllText}>Select All ({totalItems})</Text>
                        </Pressable>
                        {selectedCount > 0 && (
                            <Pressable style={styles.deleteBtn} onPress={onDeleteSelected}>
                                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                                <Text style={styles.deleteText}>Delete</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.checkoutSection}>
                        <View style={styles.totalInfo}>
                            <Text style={styles.totalLabel}>Items Total ({selectedCount}{selectedCount === 1 ? ' Item' : ' Items'}):</Text>
                            <Text style={styles.totalPrice}>₱{subtotal.toFixed(2)}</Text>
                        </View>
                        <Pressable
                            style={[styles.checkoutBtn, (selectedCount === 0 || loading) && styles.checkoutBtnDisabled]}
                            onPress={onCheckout}
                            disabled={selectedCount === 0 || loading}
                        >
                            {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.checkoutBtnText}>Check Out</Text>}
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.lg,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    content: {
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        paddingBottom: 24,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    voucherSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    voucherBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
    },
    voucherBtnText: {
        fontSize: 12,
        color: '#B36979',
        fontFamily: theme.typography.fontFamily,
    },
    voucherInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 12,
        minWidth: 100,
        fontFamily: theme.typography.fontFamily,
    },
    savingsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    savingsText: {
        fontSize: 12,
        color: '#B36979',
        fontFamily: theme.typography.fontFamily,
    },
    savingsDisabled: {
        color: theme.colors.textLight,
    },
    actionsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 3,
        borderWidth: 2,
        borderColor: theme.colors.textLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#B36979',
        borderColor: '#B36979',
    },
    selectAllText: {
        fontSize: 13,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    deleteText: {
        fontSize: 13,
        color: theme.colors.error,
        fontFamily: theme.typography.fontFamily,
    },
    checkoutSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    totalInfo: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
    },
    totalLabel: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    totalPrice: {
        fontSize: 24,
        fontWeight: '700',
        color: '#B36979',
        fontFamily: theme.typography.fontFamily,
    },
    checkoutBtn: {
        backgroundColor: '#B36979',
        paddingHorizontal: 28,
        paddingVertical: 10,
        borderRadius: 6,
        minWidth: 100,
        alignItems: 'center',
    },
    checkoutBtnDisabled: {
        opacity: 0.5,
    },
    checkoutBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        fontFamily: theme.typography.fontFamily,
    },
});
