import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from 'react-native';
import AddressCard, { type Address } from './AddressCard';

interface AddressSelectorProps {
    addresses: Address[];
    selectedId: number | null;
    onSelect: (addressId: number) => void;
    onEdit: (address: Address) => void;
    onDelete: (addressId: number) => Promise<void>;
    onSetDefault: (addressId: number) => Promise<void>;
    onAddNew: () => void;
    isLoading?: boolean;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
    addresses,
    selectedId,
    onSelect,
    onEdit,
    onDelete,
    onSetDefault,
    onAddNew,
    isLoading = false,
}) => {
    const { width } = useWindowDimensions();
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;

    const handleDelete = async (addressId: number) => {
        const confirmed = window.confirm('Are you sure you want to delete this address?');
        if (!confirmed) return;

        setDeletingId(addressId);
        try {
            await onDelete(addressId);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSetDefault = async (addressId: number) => {
        setSettingDefaultId(addressId);
        try {
            await onSetDefault(addressId);
        } finally {
            setSettingDefaultId(null);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
                <Text style={styles.loadingText}>Loading addresses...</Text>
            </View>
        );
    }

    if (addresses.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📍</Text>
                <Text style={styles.emptyTitle}>No saved addresses yet</Text>
                <Text style={styles.emptyText}>
                    Add your first shipping address to speed up future checkouts
                </Text>
                <Pressable style={styles.addNewButton} onPress={onAddNew}>
                    <Text style={styles.addNewButtonText}>+ Add Shipping Address</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[
                    styles.grid,
                    isMobile && styles.gridMobile,
                    isTablet && styles.gridTablet,
                ]}>
                    {addresses.map((address) => (
                        <View
                            key={address.uid}
                            style={[
                                styles.cardWrapper,
                                isMobile && styles.cardWrapperMobile,
                                isTablet && styles.cardWrapperTablet,
                            ]}
                        >
                            <AddressCard
                                address={address}
                                isSelected={selectedId === address.uid}
                                onSelect={() => onSelect(address.uid)}
                                onEdit={() => onEdit(address)}
                                onDelete={
                                    addresses.length > 1 && deletingId !== address.uid
                                        ? () => handleDelete(address.uid)
                                        : undefined
                                }
                                onSetDefault={
                                    !address.isDefault && settingDefaultId !== address.uid
                                        ? () => handleSetDefault(address.uid)
                                        : undefined
                                }
                                showActions={true}
                                selectable={true}
                            />
                            {/* Loading overlay for actions */}
                            {(deletingId === address.uid || settingDefaultId === address.uid) && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="small" color="#7c3aed" />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Add New Address Button */}
                <Pressable style={styles.addNewCard} onPress={onAddNew}>
                    <Text style={styles.addNewIcon}>+</Text>
                    <Text style={styles.addNewText}>Add New Address</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridMobile: {
        flexDirection: 'column',
    },
    gridTablet: {
        // 2 columns
    },
    cardWrapper: {
        width: '48%',
        position: 'relative',
    },
    cardWrapperMobile: {
        width: '100%',
    },
    cardWrapperTablet: {
        width: '48%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6b7280',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#f9fafb',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    addNewButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#7c3aed',
        borderRadius: 8,
    },
    addNewButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    addNewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#d1d5db',
        backgroundColor: '#fafafa',
        marginTop: 8,
        marginBottom: 24,
    },
    addNewIcon: {
        fontSize: 24,
        color: '#7c3aed',
        marginRight: 8,
    },
    addNewText: {
        fontSize: 15,
        color: '#7c3aed',
        fontWeight: '600',
    },
});

export default AddressSelector;
