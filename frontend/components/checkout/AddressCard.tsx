import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { MapPin, Briefcase, Gift, Package, Home, Trash2, Edit2, Star } from 'lucide-react-native';

export interface Address {
    uid: number;
    label?: string | null;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string | null;
    region?: string | null;
    province?: string | null;
    city: string;
    barangay?: string | null;
    stateProvince?: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

interface AddressCardProps {
    address: Address;
    isSelected?: boolean;
    onSelect?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onSetDefault?: () => void;
    showActions?: boolean;
    selectable?: boolean;
}

const getLabelIcon = (label?: string | null) => {
    const l = label?.toLowerCase() || '';
    if (l.includes('home')) return <Home size={16} color={theme.colors.primary} />;
    if (l.includes('work') || l.includes('office')) return <Briefcase size={16} color={theme.colors.primary} />;
    if (l.includes('gift')) return <Gift size={16} color={theme.colors.primary} />;
    return <MapPin size={16} color={theme.colors.primary} />;
};

export const AddressCard: React.FC<AddressCardProps> = ({
    address,
    isSelected = false,
    onSelect,
    onEdit,
    onDelete,
    onSetDefault,
    showActions = true,
    selectable = false,
}) => {
    const formatPhone = (phone: string) => {
        // Format PH phone: 09171234567 -> (0917) 123-4567
        if (phone.startsWith('+63')) {
            const digits = phone.slice(3);
            return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
        }
        if (phone.startsWith('0') && phone.length === 11) {
            return `(${phone.slice(0, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
        }
        return phone;
    };

    return (
        <Pressable
            style={[
                styles.card,
                isSelected && styles.cardSelected,
                selectable && styles.cardSelectable,
            ]}
            onPress={selectable ? onSelect : undefined}
        >
            {/* Header with label and default badge */}
            <View style={styles.header}>
                <View style={styles.labelContainer}>
                    <View style={styles.iconContainer}>
                        {getLabelIcon(address.label)}
                    </View>
                    <Text style={[styles.label, isSelected && styles.labelSelected]}>
                        {address.label || 'Address'}
                    </Text>
                    {address.isDefault && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                    )}
                </View>
                {selectable && (
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                )}
            </View>

            {/* Address details */}
            <View style={styles.details}>
                <Text style={styles.name}>{address.fullName}</Text>
                <Text style={styles.addressLine}>{address.streetAddress}</Text>
                {address.aptSuite && (
                    <Text style={styles.addressLine}>{address.aptSuite}</Text>
                )}
                <Text style={styles.addressLine}>
                    {address.barangay ? `${address.barangay}, ` : ''}{address.city}{address.province || address.stateProvince ? `, ${address.province || address.stateProvince}` : ''} {address.postalCode}
                </Text>
                <Text style={styles.addressLine}>{address.country}</Text>
                <Text style={styles.phone}>{formatPhone(address.phone)}</Text>
            </View>

            {/* Actions */}
            {showActions && (
                <View style={styles.actions}>
                    {onEdit && (
                        <Pressable style={styles.actionButton} onPress={onEdit}>
                            <Edit2 size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.actionText}>Edit</Text>
                        </Pressable>
                    )}
                    {onDelete && (
                        <Pressable style={styles.actionButton} onPress={onDelete}>
                            <Trash2 size={14} color={theme.colors.error} />
                            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                        </Pressable>
                    )}
                    {!address.isDefault && onSetDefault && (
                        <Pressable style={styles.actionButton} onPress={onSetDefault}>
                            <Star size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.actionText}>Set Default</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    cardSelected: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
        backgroundColor: theme.colors.primaryLight + '20', // Very light pink tint
    },
    cardSelectable: {

    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    iconContainer: {
        padding: 4,
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.borderRadius.full,
    },
    label: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    labelSelected: {
        color: theme.colors.primary,
    },
    defaultBadge: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
        marginLeft: theme.spacing.xs,
    },
    defaultBadgeText: {
        color: theme.colors.primaryText,
        fontSize: 10,
        fontWeight: '700',
        fontFamily: theme.typography.fontFamily,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    radioSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary,
    },
    details: {
        marginBottom: theme.spacing.md,
        paddingLeft: 4, // Indent slightly to align with label text not icon
    },
    name: {
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
        fontFamily: theme.typography.fontFamily,
    },
    addressLine: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        fontFamily: theme.typography.fontFamily,
    },
    phone: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        fontFamily: theme.typography.fontFamily,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.subtle,
        paddingTop: theme.spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        gap: 4,
    },
    actionText: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    deleteText: {
        color: theme.colors.error,
    },
});

export default AddressCard;
