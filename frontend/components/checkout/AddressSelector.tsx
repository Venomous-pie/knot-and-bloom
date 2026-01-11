import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    Platform
} from 'react-native';
import AddressCard, { type Address } from './AddressCard';
import { theme } from '@/constants/theme';
import { MapPin, Plus } from 'lucide-react-native';

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
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to delete this address?');
            if (!confirmed) return;
        }

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
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading addresses...</Text>
            </View>
        );
    }

    if (addresses.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.iconCircle}>
                    <MapPin size={32} color={theme.colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No saved addresses yet</Text>
                <Text style={styles.emptyText}>
                    Add your first shipping address to speed up future checkouts
                </Text>
                <Pressable style={styles.addNewButton} onPress={onAddNew}>
                    <Plus size={18} color={theme.colors.primaryText} />
                    <Text style={styles.addNewButtonText}>Add Shipping Address</Text>
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
                                    deletingId !== address.uid
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
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Add New Address Button */}
                <Pressable style={styles.addNewCard} onPress={onAddNew}>
                    <View style={styles.addNewIconContainer}>
                        <Plus size={24} color={theme.colors.primary} />
                    </View>
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
        gap: theme.spacing.md,
    },
    gridMobile: {
        flexDirection: 'column',
    },
    gridTablet: {
        // 2 columns handled by cardWrapper width
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
        borderRadius: theme.borderRadius.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: theme.spacing.sm,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.colors.border,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    emptyTitle: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        fontFamily: theme.typography.fontFamily,
    },
    emptyText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        fontFamily: theme.typography.fontFamily,
    },
    addNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
        ...theme.shadows.md,
    },
    addNewButtonText: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.primaryText,
        fontFamily: theme.typography.fontFamily,
    },
    addNewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.primaryLight,
        backgroundColor: theme.colors.background,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        cursor: 'pointer',
    },
    addNewIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    addNewText: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.primary,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
});

export default AddressSelector;
