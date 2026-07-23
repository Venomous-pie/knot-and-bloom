import { addressAPI, Address, AddressInput } from '@/api/api';
import { AddressCard } from '@/components/checkout/AddressCard';
import { useAuth } from '@/contexts/AuthContext';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPinOff, Plus } from 'lucide-react-native';
import AddressForm from '@/components/checkout/AddressForm';
import { AddressMapPicker } from '@/components/checkout/AddressMapPicker';
import { theme } from '@/constants/theme';

export default function AddressesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // View Mode: 'form' (address form), 'map' (map picker)
    const [viewMode, setViewMode] = useState<'form' | 'map'>('form');

    // Draft/Editing state
    const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchAddresses();
        }
    }, [user, authLoading]);

    const fetchAddresses = async () => {
        try {
            const response = await addressAPI.getAddresses();
            setAddresses(response.data.addresses);
        } catch (error) {
            console.error('Error fetching addresses:', error);
            Alert.alert('Error', 'Failed to load addresses');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingAddress({
            fullName: user?.name || '',
            phone: user?.phone || '',
            country: 'Philippines',
            isDefault: false
        });
        setViewMode('form');
        setShowModal(true);
    };

    const openEditModal = (address: Address) => {
        setEditingAddress(address);
        setViewMode('form');
        setShowModal(true);
    };

    const handleSave = async (formData: any) => {
        if (saving) return; // Prevent duplicate submissions
        setSaving(true);
        try {
            const data: AddressInput = {
                label: formData.label,
                fullName: formData.fullName,
                phone: formData.phone,
                streetAddress: formData.streetAddress,
                aptSuite: formData.aptSuite,
                region: formData.region,
                province: formData.province,
                city: formData.city,
                barangay: formData.barangay,
                stateProvince: formData.province, // keep for compatibility
                postalCode: formData.postalCode,
                country: formData.country,
                isDefault: formData.isDefault,
            };

            if (editingAddress && editingAddress.uid) {
                await addressAPI.updateAddress(editingAddress.uid, data);
            } else {
                await addressAPI.createAddress(data);
            }

            await fetchAddresses();
            setShowModal(false);
            Alert.alert('Success', editingAddress?.uid ? 'Address updated' : 'Address added');
        } catch (error: any) {
            console.error('Error saving address:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save address');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (addressId: number) => {
        Alert.alert(
            'Delete Address',
            'Are you sure you want to delete this address?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await addressAPI.deleteAddress(addressId);
                            await fetchAddresses();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to delete address');
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (addressId: number) => {
        try {
            await addressAPI.setDefaultAddress(addressId);
            await fetchAddresses();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to set default');
        }
    };

    const handleMapLocationSelect = (data: any) => {
        setEditingAddress(prev => ({
            ...(prev || {}),
            streetAddress: data.street || data.fullAddress,
            city: data.city,
            stateProvince: data.state,
            province: data.state,
            postalCode: data.zipCode,
            country: data.country || 'Philippines',
        }));
        setViewMode('form');
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.navigate('/profile' as RelativePathString)} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>My Addresses</Text>
                    <Pressable onPress={openAddModal} style={styles.addButton}>
                        <Plus size={20} color="white" />
                        <Text style={styles.addButtonText}>Add New</Text>
                    </Pressable>
                </View>

                {addresses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MapPinOff style={styles.emptyIcon} size={40} />
                        <Text style={styles.emptyTitle}>No Addresses</Text>
                        <Text style={styles.emptyText}>Add an address for faster checkout</Text>
                        <Pressable style={styles.emptyButton} onPress={openAddModal}>
                            <Text style={styles.emptyButtonText}>Add Address</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {addresses.map((address) => (
                            <AddressCard
                                key={address.uid}
                                address={address}
                                onEdit={() => openEditModal(address)}
                                onDelete={() => handleDelete(address.uid)}
                                onSetDefault={() => handleSetDefault(address.uid)}
                                showActions={true}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
                        {viewMode === 'form' ? (
                                <View style={{ flex: 1, paddingHorizontal: 0 }}>
                                    <AddressForm
                                        renderHeader={() => (
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>
                                                    {editingAddress?.uid ? 'Edit Address' : 'Add Address'}
                                                </Text>
                                                <Pressable onPress={() => setShowModal(false)}>
                                                    <Text style={styles.modalClose}>✕</Text>
                                                </Pressable>
                                            </View>
                                        )}
                                        mode={editingAddress?.uid ? 'edit' : 'create'}
                                        initialData={{
                                            label: editingAddress?.label || undefined,
                                            fullName: editingAddress?.fullName || '',
                                            phone: editingAddress?.phone || '',
                                            streetAddress: editingAddress?.streetAddress || '',
                                            aptSuite: editingAddress?.aptSuite || undefined,
                                            region: editingAddress?.region || undefined,
                                            province: editingAddress?.province || editingAddress?.stateProvince || undefined,
                                            city: editingAddress?.city || '',
                                            barangay: editingAddress?.barangay || undefined,
                                            postalCode: editingAddress?.postalCode || '',
                                            country: editingAddress?.country || 'Philippines',
                                            isDefault: editingAddress?.isDefault ?? false,
                                        }}
                                        onSave={handleSave}
                                        onCancel={() => setShowModal(false)}
                                        onOpenMap={() => setViewMode('map')}
                                        isSaving={saving}
                                        showSaveCheckbox={false}
                                    />
                                </View>
                        ) : (
                            /* Map View */
                            <View style={{ flex: 1 }}>
                                <AddressMapPicker
                                    onClose={() => setViewMode('form')}
                                    onLocationSelect={handleMapLocationSelect}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        ...theme.shadows.md,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
        fontFamily: theme.typography.fontFamily,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
        color: theme.colors.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        gap: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        width: '100%',
        maxHeight: '90%',
        padding: 24,
        ...theme.shadows.lg,
    },
    modalContentDesktop: {
        width: 600,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalClose: {
        fontSize: 24,
        color: theme.colors.textLight,
    },
});
