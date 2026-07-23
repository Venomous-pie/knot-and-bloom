import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { CartItem as CartItemType } from '@/types/cart';
import { useDialog } from '@/contexts/DialogContext';

interface CartItemProps {
    item: CartItemType;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
    onUpdateQuantity: (item: CartItemType, newQuantity: number) => void;
    onRemove: (id: number) => void;
    updating?: boolean;
}

export const CartItem = ({
    item,
    isSelected,
    onToggleSelect,
    onUpdateQuantity,
    onRemove,
    updating = false
}: CartItemProps) => {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const [showVariants, setShowVariants] = useState(false);
    const { confirm } = useDialog();

    const handleRemoveItem = async () => {
        const confirmed = await confirm({
            title: "Remove Item",
            message: "Are you sure you want to remove this item from your cart?",
            confirmText: "Remove",
            cancelText: "Cancel"
        });
        if (confirmed) {
            onRemove(item.uid);
        }
    };

    const displayPrice = item.priceInfo?.finalPrice ?? Number(item.product.basePrice);
    const originalPrice = item.priceInfo?.effectivePrice ?? Number(item.product.basePrice);
    const hasDiscount = item.priceInfo?.hasDiscount;
    const totalPrice = displayPrice * item.quantity;
    const imageUrl = item.productVariant?.image || item.product.image;
    const maxStock = item.productVariant?.stock ?? 50;
    const isMaxStock = item.quantity >= maxStock;

    const variants = item.product.variants || [];
    const hasVariants = variants.length > 0;

    if (isDesktop) {
        return (
            <View style={styles.desktopRow}>
                {/* Product: 50% */}
                <View style={styles.productColumn}>
                    <Pressable style={styles.checkboxContainer} onPress={() => onToggleSelect(item.uid)}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                        </View>
                    </Pressable>
                    <Pressable 
                        style={styles.imageContainer}
                        onPress={() => router.push(`/product/${item.productId}`)}
                    >
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
                        ) : (
                            <View style={styles.placeholder}><Text>📦</Text></View>
                        )}
                    </Pressable>
                    <View style={styles.productDetails}>
                        <Pressable onPress={() => router.push(`/product/${item.productId}`)}>
                            <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
                        </Pressable>
                        <View style={{ position: 'relative' }}>
                            <Pressable
                                style={styles.variationBtn}
                                onPress={() => hasVariants && setShowVariants(!showVariants)}
                            >
                                <Text style={styles.variationText}>
                                    Variation: {item.productVariant?.name || 'Default'}
                                </Text>
                                {hasVariants && (
                                    <Ionicons
                                        name={showVariants ? "chevron-up" : "chevron-down"}
                                        size={12}
                                        color={theme.colors.textSecondary}
                                    />
                                )}
                            </Pressable>
                            {/* Simple Dropdown */}
                            {showVariants && (
                                <View style={styles.dropdown}>
                                    {variants.map(v => (
                                        <Pressable
                                            key={v.uid}
                                            style={[
                                                styles.dropdownItem,
                                                v.uid === item.productVariantId && styles.dropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setShowVariants(false);
                                                // TODO: Call API to update variant
                                            }}
                                        >
                                            <Text style={styles.dropdownText}>{v.name}</Text>
                                            {v.price && <Text style={styles.dropdownPrice}>₱{v.price.toFixed(2)}</Text>}
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Unit Price: 12.5% */}
                <View style={styles.priceColumn}>
                    {hasDiscount && <Text style={styles.originalPrice}>₱{originalPrice.toFixed(2)}</Text>}
                    <Text style={styles.price}>₱{displayPrice.toFixed(2)}</Text>
                </View>

                {/* Quantity: 12.5% */}
                <View style={styles.qtyColumn}>
                    <View style={styles.quantityContainer}>
                        <Pressable
                            style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
                            onPress={() => item.quantity > 1 && onUpdateQuantity(item, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updating}
                        >
                            <Text style={styles.qtyText}>−</Text>
                        </Pressable>
                        <View style={styles.qtyValueContainer}>
                            {updating ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.qtyValue}>{item.quantity}</Text>}
                        </View>
                        <Pressable
                            style={[styles.qtyBtn, isMaxStock && styles.qtyBtnDisabled]}
                            onPress={() => !isMaxStock && onUpdateQuantity(item, item.quantity + 1)}
                            disabled={isMaxStock || updating}
                        >
                            <Text style={styles.qtyText}>+</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Total: 12.5% */}
                <View style={styles.totalColumn}>
                    <Text style={styles.totalPrice}>₱{totalPrice.toFixed(2)}</Text>
                </View>

                {/* Actions: 12.5% */}
                <View style={styles.actionsColumn}>
                    <Pressable onPress={handleRemoveItem}>
                        <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    // Mobile Card
    return (
        <View style={styles.mobileCard}>
            <View style={styles.mobileRow}>
                <Pressable style={styles.checkboxContainer} onPress={() => onToggleSelect(item.uid)}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                    </View>
                </Pressable>
                <Pressable 
                    style={styles.imageContainer}
                    onPress={() => router.push(`/product/${item.productId}`)}
                >
                    {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={styles.placeholder}><Text>📦</Text></View>}
                </Pressable>
                <View style={styles.mobileDetails}>
                    <Pressable onPress={() => router.push(`/product/${item.productId}`)}>
                        <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
                    </Pressable>
                    <Pressable
                        style={styles.mobileVariationBtn}
                        onPress={() => hasVariants && setShowVariants(!showVariants)}
                    >
                        <Text style={styles.mobileVariation}>Var: {item.productVariant?.name || 'Default'}</Text>
                        {hasVariants && <Ionicons name={showVariants ? "chevron-up" : "chevron-down"} size={10} color={theme.colors.textSecondary} />}
                    </Pressable>
                    {showVariants && (
                        <View style={styles.mobileDropdown}>
                            {variants.map(v => (
                                <Pressable
                                    key={v.uid}
                                    style={[styles.dropdownItem, v.uid === item.productVariantId && styles.dropdownItemSelected]}
                                    onPress={() => setShowVariants(false)}
                                >
                                    <Text style={styles.dropdownText}>{v.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <View style={styles.mobileFooter}>
                        <Text style={styles.mobilePrice}>₱{displayPrice.toFixed(2)}</Text>
                        <View style={styles.quantityContainer}>
                            <Pressable style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]} onPress={() => item.quantity > 1 && onUpdateQuantity(item, item.quantity - 1)} disabled={item.quantity <= 1 || updating}><Text style={styles.qtyText}>−</Text></Pressable>
                            <View style={styles.qtyValueContainer}>{updating ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.qtyValue}>{item.quantity}</Text>}</View>
                            <Pressable style={[styles.qtyBtn, isMaxStock && styles.qtyBtnDisabled]} onPress={() => !isMaxStock && onUpdateQuantity(item, item.quantity + 1)} disabled={isMaxStock || updating}><Text style={styles.qtyText}>+</Text></Pressable>
                        </View>
                    </View>
                </View>
                <Pressable onPress={handleRemoveItem} style={styles.mobileDelete}><Ionicons name="trash-outline" size={18} color={theme.colors.error} /></Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    desktopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    productColumn: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceColumn: { width: '12.5%', alignItems: 'center' },
    qtyColumn: { width: '12.5%', alignItems: 'center' },
    totalColumn: { width: '12.5%', alignItems: 'center' },
    actionsColumn: { width: '12.5%', alignItems: 'center' },
    checkboxContainer: { paddingRight: 12 },
    checkbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: theme.colors.textLight, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: '#B36979', borderColor: '#B36979' },
    imageContainer: { width: 80, height: 80, borderRadius: 4, backgroundColor: theme.colors.subtle, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
    productDetails: { flex: 1 },
    productName: { fontSize: 14, fontWeight: '500', color: theme.colors.text, fontFamily: theme.typography.fontFamily, marginBottom: 4 },
    variationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.subtle, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
    variationText: { fontSize: 12, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily },
    price: { fontSize: 14, color: theme.colors.text, fontFamily: theme.typography.fontFamily },
    originalPrice: { fontSize: 12, color: theme.colors.textLight, textDecorationLine: 'line-through' },
    totalPrice: { fontSize: 14, fontWeight: '600', color: '#B36979', fontFamily: theme.typography.fontFamily },
    deleteText: { fontSize: 13, color: theme.colors.text, fontFamily: theme.typography.fontFamily },
    quantityContainer: { flexDirection: 'row', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4 },
    qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
    qtyBtnDisabled: { opacity: 0.4 },
    qtyText: { fontSize: 16, color: theme.colors.textSecondary },
    qtyValueContainer: { minWidth: 32, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border },
    qtyValue: { fontSize: 14, color: theme.colors.text, fontFamily: theme.typography.fontFamily },

    // Dropdown
    dropdown: { position: 'absolute', top: '100%', left: 0, minWidth: 150, backgroundColor: theme.colors.surface, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, zIndex: 100, marginTop: 4, ...theme.shadows.md },
    dropdownItem: { paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between' },
    dropdownItemSelected: { backgroundColor: '#B3697915' },
    dropdownText: { fontSize: 12, color: theme.colors.text, fontFamily: theme.typography.fontFamily },
    dropdownPrice: { fontSize: 11, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily },

    // Mobile
    mobileCard: { padding: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    mobileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    mobileDetails: { flex: 1 },
    mobileVariationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    mobileVariation: { fontSize: 11, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily },
    mobileDropdown: { backgroundColor: theme.colors.surface, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border, marginTop: 4, marginBottom: 4 },
    mobileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    mobilePrice: { fontSize: 14, fontWeight: '600', color: '#B36979', fontFamily: theme.typography.fontFamily },
    mobileDelete: { padding: 4 },
});
