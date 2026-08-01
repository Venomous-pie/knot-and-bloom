import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { LockedPriceItem } from '@/api/api'; // Or import from Context if needed

interface CartItem extends Omit<LockedPriceItem, 'image'> {
    image?: string | null;
}

interface CheckoutProductListProps {
    items: CartItem[];
    shopTotal?: number;
}

export const CheckoutProductList: React.FC<CheckoutProductListProps> = ({ items, shopTotal }) => {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerText, { flex: 4 }]}>Product Ordered</Text>
                {isDesktop && (
                    <>
                        <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Unit Price</Text>
                        <Text style={[styles.headerText, { flex: 1, textAlign: 'center' }]}>Quantity</Text>
                        <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>Subtotal</Text>
                    </>
                )}
            </View>

            {items.map((item) => (
                <View key={item.itemUid} style={styles.itemRow}>
                    {/* Product Info */}
                    <View style={styles.productInfo}>
                        <Pressable 
                            style={styles.imageContainer}
                            onPress={() => router.push(`/product/${item.productId}`)}
                        >
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.image} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Text>📦</Text>
                                </View>
                            )}
                        </Pressable>
                        <View style={{ flex: 1 }}>
                            <Pressable onPress={() => router.push(`/product/${item.productId}`)}>
                                <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                            </Pressable>
                            {/* Variant name might be null/undefined, handle safely */}
                            <Text style={styles.variantName}>
                                {item.variantName ? `Variation: ${item.variantName}` : ''}
                            </Text>
                            {/* Mobile only details */}
                            {!isDesktop && (
                                <View style={styles.mobileDetails}>
                                    <Text style={styles.mobilePrice}>₱{item.unitPrice.toFixed(2)}</Text>
                                    <Text style={styles.mobileQty}>x{item.quantity}</Text>
                                    <Text style={styles.mobileSubtotal}>₱{(item.finalPrice * item.quantity).toFixed(2)}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Desktop Columns */}
                    {isDesktop && (
                        <>
                            <View style={styles.column}>
                                <Text style={styles.colText}>₱{item.unitPrice.toFixed(2)}</Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.colText}>{item.quantity}</Text>
                            </View>
                            <View style={[styles.column, { alignItems: 'flex-end' }]}>
                                <Text style={styles.subtotalText}>₱{(item.finalPrice * item.quantity).toFixed(2)}</Text>
                            </View>
                        </>
                    )}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: theme.spacing.sm,
    },
    header: {
        flexDirection: 'row',
        marginBottom: theme.spacing.lg,
    },
    headerText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    productInfo: {
        flex: 4,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 4,
    },
    placeholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa'
    },
    productName: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    variantName: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
        fontFamily: theme.typography.fontFamily,
    },
    column: {
        flex: 1,
        alignItems: 'center',
    },
    colText: {
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    subtotalText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },

    // Mobile styles
    mobileDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        alignItems: 'center',
    },
    mobilePrice: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    mobileQty: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    mobileSubtotal: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    }
});
