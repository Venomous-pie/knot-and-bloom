import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Truck, Store, CheckCircle2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { CheckoutProductList } from './CheckoutProductList';
import type { LockedPriceItem } from '@/api/api';

interface CheckoutSellerGroupProps {
    sellerId: number;
    sellerName: string;
    sellerLocation?: string | null;
    items: LockedPriceItem[];
    choice: string;
    onChoiceChange: (choice: string) => void;
    shippingEstimate?: {
        fee: number;
        resolvedType: string;
        meetUpSnapshot: string | null;
        breakdown?: string[];
    };
    isLoadingEstimate?: boolean;
    note: string;
    onNoteChange: (text: string) => void;
}

export function CheckoutSellerGroup({
    sellerId,
    sellerName,
    sellerLocation,
    items,
    choice,
    onChoiceChange,
    shippingEstimate,
    isLoadingEstimate,
    note,
    onNoteChange
}: CheckoutSellerGroupProps) {
    const [isMessageFocused, setIsMessageFocused] = React.useState(false);
    
    const shopItemTotal = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const shopShippingFee = shippingEstimate?.fee || 0;
    const shopTotal = shopItemTotal + shopShippingFee;

    return (
        <View style={styles.container}>
            <View style={styles.sellerHeader}>
                <Store size={20} color={theme.colors.textSecondary} />
                <Text style={styles.sellerName}>{sellerName || 'Knot & Bloom'}</Text>
            </View>

            <CheckoutProductList items={items} shopTotal={shopTotal} />

            <View style={styles.messageSection}>
                <View style={styles.messageHeader}>
                    <Text style={styles.messageTitle}>Message to Seller/Courier (Optional)</Text>
                </View>
                <TextInput
                    placeholder="E.g., Please ensure secure packaging, drop at lobby..."
                    placeholderTextColor={theme.colors.textSecondary + '80'}
                    style={[
                        styles.messageInput,
                        isMessageFocused && { borderColor: theme.colors.primary, backgroundColor: 'white' }
                    ]}
                    value={note}
                    onChangeText={onNoteChange}
                    onFocus={() => setIsMessageFocused(true)}
                    onBlur={() => setIsMessageFocused(false)}
                    multiline
                />
            </View>

            <View style={styles.fulfillmentSection}>
                <View style={styles.fulfillmentHeaderRow}>
                    <View style={styles.fulfillmentLeft}>
                        <View style={styles.fulfillmentIconBox}>
                            <Truck size={20} color={theme.colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.fulfillmentTitle}>Delivery</Text>
                            <Text style={styles.fulfillmentSubtitle}>
                                Third-party courier{sellerLocation ? ` • Ships from ${sellerLocation}` : ''}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.fulfillmentRight}>
                        {shopShippingFee > 0 ? (
                            <Text style={styles.fulfillmentPrice}>₱{shopShippingFee.toFixed(2)}</Text>
                        ) : (
                            <>
                                <Text style={styles.fulfillmentPriceOriginal}>₱150.00</Text>
                                <Text style={styles.fulfillmentPriceFree}>Free</Text>
                            </>
                        )}
                    </View>
                </View>

                {shopShippingFee === 0 && (
                    <View style={styles.freeShippingBanner}>
                        <CheckCircle2 size={14} color="#15803d" style={{ marginRight: 6 }} />
                        <Text style={styles.freeShippingText}>Free shipping unlocked — order over ₱300</Text>
                    </View>
                )}

                <Pressable style={styles.seeCalculationBtn}>
                    <Text style={styles.seeCalculationText}>See calculation ↗</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
        borderBottomWidth: 4,
        borderBottomColor: '#E5E7EB',
    },
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    messageSection: {
        marginTop: theme.spacing.lg,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    messageTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    messageInput: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        backgroundColor: theme.colors.backgroundAlt,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        minHeight: 60,
        textAlignVertical: 'top',
        outlineStyle: 'none' as any,
    },
    fulfillmentSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: theme.spacing.md,
    },
    fulfillmentHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    fulfillmentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    fulfillmentIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fulfillmentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    fulfillmentSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        marginTop: 2,
    },
    fulfillmentRight: {
        alignItems: 'flex-end',
    },
    fulfillmentPrice: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    fulfillmentPriceOriginal: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textDecorationLine: 'line-through',
        fontFamily: theme.typography.fontFamily,
    },
    fulfillmentPriceFree: {
        fontSize: 15,
        fontWeight: '600',
        color: '#15803d',
        fontFamily: theme.typography.fontFamily,
    },
    freeShippingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 16,
    },
    freeShippingText: {
        fontSize: 13,
        color: '#15803d',
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    seeCalculationBtn: {
        marginTop: 16,
    },
    seeCalculationText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    }
});
