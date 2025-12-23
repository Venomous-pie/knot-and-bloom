import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface Address {
    uid: number;
    label?: string | null;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string | null;
    city: string;
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

const LABEL_ICONS: Record<string, string> = {
    'Home': '🏠',
    'Work': '💼',
    'Office': '💼',
    'Gift': '🎁',
    'PO Box': '📦',
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
    const labelIcon = address.label ? LABEL_ICONS[address.label] || '📍' : '📍';

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
                    <Text style={styles.labelIcon}>{labelIcon}</Text>
                    <Text style={styles.label}>{address.label || 'Address'}</Text>
                    {address.isDefault && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
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
                    {address.city}{address.stateProvince ? `, ${address.stateProvince}` : ''} {address.postalCode}
                </Text>
                <Text style={styles.addressLine}>{address.country}</Text>
                <Text style={styles.phone}>{formatPhone(address.phone)}</Text>
            </View>

            {/* Actions */}
            {showActions && (
                <View style={styles.actions}>
                    {onEdit && (
                        <Pressable style={styles.actionButton} onPress={onEdit}>
                            <Text style={styles.actionText}>Edit</Text>
                        </Pressable>
                    )}
                    {onDelete && (
                        <Pressable style={styles.actionButton} onPress={onDelete}>
                            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                        </Pressable>
                    )}
                    {!address.isDefault && onSetDefault && (
                        <Pressable style={styles.actionButton} onPress={onSetDefault}>
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
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        marginBottom: 12,
    },
    cardSelected: {
        borderColor: '#7c3aed',
        borderWidth: 2,
        backgroundColor: '#faf5ff',
    },
    cardSelectable: {
        cursor: 'pointer',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelIcon: {
        fontSize: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    defaultBadge: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    defaultBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#d1d5db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#7c3aed',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#7c3aed',
    },
    details: {
        marginBottom: 12,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    addressLine: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    phone: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 8,
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    actionButton: {
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 13,
        color: '#7c3aed',
        fontWeight: '500',
    },
    deleteText: {
        color: '#ef4444',
    },
});

export default AddressCard;
