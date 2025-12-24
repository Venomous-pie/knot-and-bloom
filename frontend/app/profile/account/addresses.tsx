import { addressAPI, Address, AddressInput } from '@/api/api';
import { AddressCard } from '@/components/checkout/AddressCard';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'];

export default function AddressesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [label, setLabel] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [aptSuite, setAptSuite] = useState('');
    const [city, setCity] = useState('');
    const [stateProvince, setStateProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [isDefault, setIsDefault] = useState(false);

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
        setEditingAddress(null);
        setLabel('');
        setFullName(user?.name || '');
        setPhone(user?.phone || '');
        setStreetAddress('');
        setAptSuite('');
        setCity('');
        setStateProvince('');
        setPostalCode('');
        setIsDefault(false);
        setShowModal(true);
    };

    const openEditModal = (address: Address) => {
        setEditingAddress(address);
        setLabel(address.label || '');
        setFullName(address.fullName);
        setPhone(address.phone);
        setStreetAddress(address.streetAddress);
        setAptSuite(address.aptSuite || '');
        setCity(address.city);
        setStateProvince(address.stateProvince || '');
        setPostalCode(address.postalCode);
        setIsDefault(address.isDefault);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!fullName.trim() || !phone.trim() || !streetAddress.trim() || !city.trim() || !postalCode.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            const data: AddressInput = {
                label: label.trim() || undefined,
                fullName: fullName.trim(),
                phone: phone.trim(),
                streetAddress: streetAddress.trim(),
                aptSuite: aptSuite.trim() || undefined,
                city: city.trim(),
                stateProvince: stateProvince.trim() || undefined,
                postalCode: postalCode.trim(),
                isDefault,
            };

            if (editingAddress) {
                await addressAPI.updateAddress(editingAddress.uid, data);
            } else {
                await addressAPI.createAddress(data);
            }

            await fetchAddresses();
            setShowModal(false);
            Alert.alert('Success', editingAddress ? 'Address updated' : 'Address added');
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

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>My Addresses</Text>
                    <Pressable onPress={openAddModal} style={styles.addButton}>
                        <Text style={styles.addButtonText}>+ Add</Text>
                    </Pressable>
                </View>

                {addresses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📍</Text>
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

            {/* Add/Edit Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingAddress ? 'Edit Address' : 'Add Address'}
                            </Text>
                            <Pressable onPress={() => setShowModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Label Selection */}
                            <Text style={styles.formLabel}>Label (Optional)</Text>
                            <View style={styles.labelButtons}>
                                {LABEL_OPTIONS.map((opt) => (
                                    <Pressable
                                        key={opt}
                                        style={[styles.labelButton, label === opt && styles.labelButtonActive]}
                                        onPress={() => setLabel(label === opt ? '' : opt)}
                                    >
                                        <Text style={[styles.labelButtonText, label === opt && styles.labelButtonTextActive]}>
                                            {opt}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Full name"
                            />

                            <Text style={styles.formLabel}>Phone *</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone number"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.formLabel}>Street Address *</Text>
                            <TextInput
                                style={styles.input}
                                value={streetAddress}
                                onChangeText={setStreetAddress}
                                placeholder="Street address"
                            />

                            <Text style={styles.formLabel}>Apt/Suite/Unit (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={aptSuite}
                                onChangeText={setAptSuite}
                                placeholder="Apt, suite, unit, etc."
                            />

                            <View style={styles.row}>
                                <View style={styles.halfField}>
                                    <Text style={styles.formLabel}>City *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={city}
                                        onChangeText={setCity}
                                        placeholder="City"
                                    />
                                </View>
                                <View style={styles.halfField}>
                                    <Text style={styles.formLabel}>Province</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={stateProvince}
                                        onChangeText={setStateProvince}
                                        placeholder="Province"
                                    />
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Postal Code *</Text>
                            <TextInput
                                style={styles.input}
                                value={postalCode}
                                onChangeText={setPostalCode}
                                placeholder="Postal code"
                                keyboardType="numeric"
                            />

                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setIsDefault(!isDefault)}
                            >
                                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                                    {isDefault && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Set as default address</Text>
                            </Pressable>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable
                                style={[styles.saveButton, saving && styles.disabledButton]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {editingAddress ? 'Update' : 'Add'} Address
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
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
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    addButton: {
        backgroundColor: '#C88EA7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    emptyButton: {
        backgroundColor: '#C88EA7',
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
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    modalClose: {
        fontSize: 24,
        color: '#888',
    },
    modalBody: {
        padding: 20,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
    },
    labelButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    labelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    labelButtonActive: {
        borderColor: '#C88EA7',
        backgroundColor: '#FDF2F5',
    },
    labelButtonText: {
        fontSize: 14,
        color: '#666',
    },
    labelButtonTextActive: {
        color: '#C88EA7',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ddd',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#C88EA7',
        borderColor: '#C88EA7',
    },
    checkmark: {
        color: 'white',
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
    },
    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    saveButton: {
        backgroundColor: '#C88EA7',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
