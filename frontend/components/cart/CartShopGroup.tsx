import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BadgeCheck } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { CartItem as CartItemType } from '@/types/cart';
import { CartItem } from './CartItem';

interface CartShopGroupProps {
    sellerName: string;
    isOfficialShop?: boolean;
    items: CartItemType[];
    selectedItems: Set<number>;
    updatingItems: Set<number>;
    onToggleShopSelect: (items: CartItemType[]) => void;
    onToggleItemSelect: (id: number) => void;
    onUpdateQuantity: (item: CartItemType, qty: number) => void;
    onRemoveItem: (id: number) => void;
    voucher?: string;
    onVoucherChange?: (code: string) => void;
}

export const CartShopGroup = ({
    sellerName,
    isOfficialShop = false,
    items,
    selectedItems,
    updatingItems,
    onToggleShopSelect,
    onToggleItemSelect,
    onUpdateQuantity,
    onRemoveItem,
    voucher,
    onVoucherChange
}: CartShopGroupProps) => {
    const allSelected = items.every(item => selectedItems.has(item.uid));

    return (
        <View style={styles.card}>
            {/* Shop Header */}
            <View style={styles.shopHeader}>
                <Pressable
                    style={styles.shopSelectRow}
                    onPress={() => onToggleShopSelect(items)}
                >
                    <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                        {allSelected && <Ionicons name="checkmark" size={12} color="white" />}
                    </View>
                    <Ionicons name="storefront-outline" size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.shopName}>{sellerName}</Text>
                    {isOfficialShop && (
                        <BadgeCheck size={16} color="#00c3ffff" fill="#fff" />
                    )}
                </Pressable>
            </View>

            {/* Items */}
            {items.map(item => (
                <CartItem
                    key={item.uid}
                    item={item}
                    isSelected={selectedItems.has(item.uid)}
                    onToggleSelect={onToggleItemSelect}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                    updating={updatingItems.has(item.uid)}
                />
            ))}

            {/* Voucher Section (if applicable) */}
            {onVoucherChange && (
                <View style={styles.voucherSection}>
                    <View style={styles.voucherRow}>
                        <Ionicons name="ticket-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.voucherLabel}>Shop Voucher</Text>
                    </View>
                    <TextInput
                        style={styles.voucherInput}
                        placeholder="Enter voucher code"
                        placeholderTextColor={theme.colors.textLight}
                        value={voucher}
                        onChangeText={onVoucherChange}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.sm,
        overflow: 'hidden',
    },
    shopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.subtle,
    },
    shopSelectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    shopName: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    voucherSection: {
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    voucherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    voucherLabel: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    voucherInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: theme.typography.sizes.sm,
        fontFamily: theme.typography.fontFamily,
        color: theme.colors.text,
    },
});
