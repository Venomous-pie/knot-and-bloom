import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import { MapPin } from 'lucide-react-native';
import { Address } from '@/components/checkout/AddressCard';

interface CheckoutAddressSectionProps {
    selectedAddress?: Address | null;
    onChange: () => void;
}

export const CheckoutAddressSection: React.FC<CheckoutAddressSectionProps> = ({
    selectedAddress,
    onChange
}) => {
    return (
        <View style={styles.container}>
            {/* Bespoke "Candy Cane" Border Top - Alternating Pink/Green with wavy/soft edges */}
            <View style={styles.topBorder}>
                {[...Array(40)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.stripe,
                            { backgroundColor: i % 2 === 0 ? theme.colors.primary : theme.colors.secondary }
                        ]}
                    />
                ))}
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <View style={styles.titleContainer}>
                        <MapPin size={20} color={theme.colors.primary} />
                        <Text style={styles.title}>Delivery Address</Text>
                    </View>
                </View>

                {selectedAddress ? (
                    <View style={styles.addressRow}>
                        <View style={styles.detailsContainer}>
                            <View style={styles.userInfo}>
                                <Text style={styles.name}>{selectedAddress.fullName}</Text>
                                <Text style={styles.phone}>{selectedAddress.phone}</Text>
                            </View>
                            <Text style={styles.addressText}>
                                {selectedAddress.streetAddress}
                                {selectedAddress.aptSuite ? `, ${selectedAddress.aptSuite}` : ''}
                                {selectedAddress.barangay ? `, ${selectedAddress.barangay}` : ''}
                                {', '}{selectedAddress.city}
                                {selectedAddress.province || selectedAddress.stateProvince ? `, ${selectedAddress.province || selectedAddress.stateProvince}` : ''}
                                {', '}{selectedAddress.postalCode}
                            </Text>
                            {selectedAddress.isDefault && (
                                <View style={styles.defaultBadge}>
                                    <Text style={styles.defaultBadgeText}>Default</Text>
                                </View>
                            )}
                        </View>
                        <Pressable onPress={onChange} style={styles.changeButton}>
                            <Text style={styles.changeButtonText}>Change</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No address selected</Text>
                        <Pressable onPress={onChange} style={styles.addButton}>
                            <Text style={styles.addButtonText}>+ Add New Address</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.sm,
        overflow: 'hidden',
    },
    topBorder: {
        flexDirection: 'row',
        height: 6,
        width: '100%',
        gap: 6,
        paddingHorizontal: 12,
        marginTop: -1, // Pull slightly up so it looks attached
    },
    stripe: {
        flex: 1,
        borderRadius: 4,
        transform: [{ skewX: '-30deg' }],
    },
    content: {
        padding: theme.spacing.lg,
    },
    headerRow: {
        marginBottom: theme.spacing.md,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    addressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailsContainer: {
        flex: 1,
        marginRight: theme.spacing.lg,
        gap: 4,
    },
    userInfo: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    phone: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    addressText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
        fontFamily: theme.typography.fontFamily,
    },
    defaultBadge: {
        borderWidth: 1,
        borderColor: theme.colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    defaultBadgeText: {
        fontSize: 10,
        color: theme.colors.secondary,
        fontFamily: theme.typography.fontFamily,
    },
    changeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    changeButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'uppercase',
        fontFamily: theme.typography.fontFamily,
    },
    emptyContainer: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    emptyText: {
        color: theme.colors.textSecondary,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
