import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Truck, Store, CheckCircle2, MapPin } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { CheckoutProductList } from './CheckoutProductList';
import type { LockedPriceItem } from '@/services/api';

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
    const [isNoteExpanded, setIsNoteExpanded] = React.useState(!!note);
    
    const shopItemTotal = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const shopShippingFee = choice === 'PICKUP' ? 0 : (shippingEstimate?.fee || 0);
    const shopTotal = shopItemTotal + shopShippingFee;

    return (
        <View style={styles.container}>
            <View style={styles.sellerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Store size={20} color={theme.colors.textSecondary} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sellerName} numberOfLines={1}>{sellerName || 'Knot & Bloom'}</Text>
                        {sellerLocation && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
                                <MapPin size={12} color={theme.colors.textSecondary} />
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontFamily: theme.typography.fontFamily }} numberOfLines={1}>
                                    {sellerLocation}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                {!isNoteExpanded && (
                    <Pressable 
                        style={styles.addNoteBtn}
                        onPress={() => setIsNoteExpanded(true)}
                    >
                        <Text style={styles.addNoteText}>+ Add Note</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.cardContainer}>
                <CheckoutProductList items={items} shopTotal={shopTotal} />

                {isNoteExpanded && (
                    <View style={styles.messageSection}>
                        <View style={styles.messageHeader}>
                            <Text style={styles.messageTitle}>Message to Seller/Courier (Optional)</Text>
                            <Pressable onPress={() => {
                                setIsNoteExpanded(false);
                                onNoteChange(''); // clear the note if cancelled
                            }}>
                                <Text style={styles.cancelNoteText}>Cancel</Text>
                            </Pressable>
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
                            autoFocus
                        />
                    </View>
                )}

                <View style={styles.shopSummaryRow}>
                    {/* Left side: Fulfillment Toggle */}
                    <View style={styles.fulfillmentToggle}>
                        <Text style={styles.fulfillmentLabel}>Fulfillment Options</Text>
                        <View style={styles.toggleGroup}>
                            <Pressable 
                                style={[styles.toggleBtn, choice === 'DELIVERY' && styles.toggleBtnActive]}
                                onPress={() => onChoiceChange('DELIVERY')}
                            >
                                <Truck size={16} color={choice === 'DELIVERY' ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.toggleText, choice === 'DELIVERY' && styles.toggleTextActive]}>Delivery</Text>
                            </Pressable>
                            <Pressable 
                                style={[styles.toggleBtn, choice === 'PICKUP' && styles.toggleBtnActive]}
                                onPress={() => onChoiceChange('PICKUP')}
                            >
                                <Store size={16} color={choice === 'PICKUP' ? theme.colors.primary : theme.colors.textSecondary} />
                                <Text style={[styles.toggleText, choice === 'PICKUP' && styles.toggleTextActive]}>Pick Up</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Right side: Subtotals */}
                    <View style={styles.totalsBreakdown}>
                        <View style={styles.totalsColumn}>
                             <Text style={styles.totalLabel}>Items ({items.length}):</Text>
                             <Text style={styles.totalValue}>₱{shopItemTotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalsColumn}>
                             <Text style={styles.totalLabel}>Shipping:</Text>
                             <Text style={styles.totalValue}>
                                  {choice === 'PICKUP' ? '₱0.00' : (shopShippingFee > 0 ? `₱${shopShippingFee.toFixed(2)}` : 'Free')}
                             </Text>
                        </View>
                        <View style={styles.totalsColumnMain}>
                             <Text style={styles.mainTotalLabel}>Shop Subtotal:</Text>
                             <Text style={styles.mainTotalValue}>₱{shopTotal.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.sm,
    },
    cardContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    sellerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm, 
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    messageSection: {
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    messageTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    addNoteBtn: {
        paddingVertical: 8,
    },
    addNoteText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    cancelNoteText: {
        fontSize: 13,
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
    shopSummaryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: theme.spacing.md,
        gap: theme.spacing.lg,
    },
    fulfillmentToggle: {
        flex: 1,
        minWidth: 200,
    },
    fulfillmentLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 8,
    },
    toggleGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.backgroundAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    toggleBtnActive: {
        backgroundColor: theme.colors.primaryLight + '40',
        borderColor: theme.colors.primary,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    toggleTextActive: {
        color: theme.colors.primary,
    },
    totalsBreakdown: {
        flex: 1,
        minWidth: 200,
        alignItems: 'flex-end',
        gap: 4,
    },
    totalsColumn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
    },
    totalLabel: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    totalValue: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    totalsColumnMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 200,
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    mainTotalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    mainTotalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    }
});
