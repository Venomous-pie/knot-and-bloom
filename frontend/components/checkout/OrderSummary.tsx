import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

interface CartItem {
    itemUid: number;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    finalPrice: number;
    image?: string | null;
    discountPercentage: number;
}

interface OrderSummaryProps {
    items: CartItem[];
    totalAmount: number;
    shippingFee?: number; // Optional, might be calculated later
    discountAmount?: number;
    className?: string; // For web styling if needed
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
    items,
    totalAmount,
    shippingFee = 0,
    discountAmount = 0,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Order Summary</Text>

            <View style={styles.itemsList}>
                {items.map((item) => (
                    <View key={item.itemUid} style={styles.itemRow}>
                        <View style={styles.imageContainer}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.image} />
                            ) : (
                                <View style={styles.placeholderImage}>
                                    <Text style={styles.placeholderText}>📦</Text>
                                </View>
                            )}
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.quantity}</Text>
                            </View>
                        </View>
                        <View style={styles.itemDetails}>
                            <Text style={styles.itemName} numberOfLines={2}>
                                {item.productName}
                            </Text>
                            {item.variantName && (
                                <Text style={styles.variantName}>{item.variantName}</Text>
                            )}
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.price}>
                                ₱{item.finalPrice.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{totalAmount.toFixed(2)}</Text>
            </View>

            {shippingFee > 0 ? (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping</Text>
                    <Text style={styles.summaryValue}>₱{shippingFee.toFixed(2)}</Text>
                </View>
            ) : (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.textSecondary }]}>Calculated at next step</Text>
                </View>
            )}

            {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.colors.secondary }]}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: theme.colors.secondary }]}>
                        -₱{discountAmount.toFixed(2)}
                    </Text>
                </View>
            )}

            <View style={[styles.divider, { marginVertical: theme.spacing.md }]} />

            <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalCurrency}>PHP</Text>
                    <Text style={styles.totalAmount}>
                        ₱{(totalAmount + shippingFee - discountAmount).toFixed(2)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    title: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        fontFamily: theme.typography.fontFamily,
    },
    itemsList: {
        marginBottom: theme.spacing.md,
        maxHeight: 300, // Scrollable if too many items
        overflow: 'hidden', // Just in case, though View doesn't scroll by default without ScrollView
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
        gap: theme.spacing.md,
    },
    imageContainer: {
        position: 'relative',
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        overflow: 'visible', // For badge
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: theme.borderRadius.sm,
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 24,
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: theme.colors.textSecondary, // Standard ecommerce badge color (usually gray or dark)
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    itemDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
        fontFamily: theme.typography.fontFamily,
    },
    variantName: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    priceContainer: {
        justifyContent: 'center',
    },
    price: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xs,
    },
    summaryLabel: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    summaryValue: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
    },
    totalLabel: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    totalCurrency: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        marginBottom: -4,
        marginRight: 2,
        fontFamily: theme.typography.fontFamily,
    },
    totalAmount: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
});

export default OrderSummary;
