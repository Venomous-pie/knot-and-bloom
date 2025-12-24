import { paymentMethodAPI, PaymentMethod, PaymentMethodType, PaymentMethodInput } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
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

const PAYMENT_TYPE_ICONS: Record<PaymentMethodType, string> = {
    GCASH: '📱',
    PAYMAYA: '💳',
    BANK: '🏦',
};

const PAYMENT_TYPE_LABELS: Record<PaymentMethodType, string> = {
    GCASH: 'GCash',
    PAYMAYA: 'PayMaya',
    BANK: 'Bank Account',
};

export default function PaymentMethodsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [selectedType, setSelectedType] = useState<PaymentMethodType>('GCASH');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [isDefault, setIsDefault] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchPaymentMethods();
        }
    }, [user, authLoading]);

    const fetchPaymentMethods = async () => {
        try {
            const response = await paymentMethodAPI.getPaymentMethods();
            setPaymentMethods(response.data.paymentMethods);
        } catch (error) {
            console.error('Error fetching payment methods:', error);
            Alert.alert('Error', 'Failed to load payment methods');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingMethod(null);
        setSelectedType('GCASH');
        setAccountName('');
        setAccountNumber('');
        setBankName('');
        setIsDefault(false);
        setShowModal(true);
    };

    const openEditModal = (method: PaymentMethod) => {
        setEditingMethod(method);
        setSelectedType(method.type);
        setAccountName(method.accountName);
        setAccountNumber(method.accountNumber);
        setBankName(method.bankName || '');
        setIsDefault(method.isDefault);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!accountName.trim() || !accountNumber.trim()) {
            Alert.alert('Error', 'Account name and number are required');
            return;
        }

        if (selectedType === 'BANK' && !bankName.trim()) {
            Alert.alert('Error', 'Bank name is required for bank accounts');
            return;
        }

        setSaving(true);
        try {
            const data: PaymentMethodInput = {
                type: selectedType,
                accountName: accountName.trim(),
                accountNumber: accountNumber.trim(),
                bankName: selectedType === 'BANK' ? bankName.trim() : undefined,
                isDefault,
            };

            if (editingMethod) {
                await paymentMethodAPI.updatePaymentMethod(editingMethod.uid, data);
            } else {
                await paymentMethodAPI.createPaymentMethod(data);
            }

            await fetchPaymentMethods();
            setShowModal(false);
            Alert.alert('Success', editingMethod ? 'Payment method updated' : 'Payment method added');
        } catch (error: any) {
            console.error('Error saving payment method:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save payment method');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (methodId: number) => {
        Alert.alert(
            'Delete Payment Method',
            'Are you sure you want to delete this payment method?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await paymentMethodAPI.deletePaymentMethod(methodId);
                            await fetchPaymentMethods();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to delete payment method');
                        }
                    },
                },
            ]
        );
    };

    const handleSetDefault = async (methodId: number) => {
        try {
            await paymentMethodAPI.setDefaultPaymentMethod(methodId);
            await fetchPaymentMethods();
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
                    <Text style={styles.title}>Payment Methods</Text>
                    <Pressable onPress={openAddModal} style={styles.addButton}>
                        <Text style={styles.addButtonText}>+ Add</Text>
                    </Pressable>
                </View>

                {paymentMethods.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CreditCard style={styles.emptyIcon} size={40}/>
                        <Text style={styles.emptyTitle}>No Payment Methods</Text>
                        <Text style={styles.emptyText}>Add a payment method for faster checkout</Text>
                        <Pressable style={styles.emptyButton} onPress={openAddModal}>
                            <Text style={styles.emptyButtonText}>Add Payment Method</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {paymentMethods.map((method) => (
                            <Pressable
                                key={method.uid}
                                style={styles.card}
                                onPress={() => openEditModal(method)}
                            >
                                <View style={styles.cardLeft}>
                                    <Text style={styles.cardIcon}>{PAYMENT_TYPE_ICONS[method.type]}</Text>
                                    <View>
                                        <View style={styles.cardTitleRow}>
                                            <Text style={styles.cardTitle}>{PAYMENT_TYPE_LABELS[method.type]}</Text>
                                            {method.isDefault && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>Default</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.cardSubtitle}>{method.accountName}</Text>
                                        <Text style={styles.cardNumber}>
                                            ****{method.accountNumber.slice(-4)}
                                            {method.bankName && ` • ${method.bankName}`}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardActions}>
                                    {!method.isDefault && (
                                        <Pressable onPress={() => handleSetDefault(method.uid)} style={styles.actionButton}>
                                            <Text style={styles.actionText}>Set Default</Text>
                                        </Pressable>
                                    )}
                                    <Pressable onPress={() => handleDelete(method.uid)} style={styles.actionButton}>
                                        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                                    </Pressable>
                                </View>
                            </Pressable>
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
                                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                            </Text>
                            <Pressable onPress={() => setShowModal(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {/* Type Selection */}
                            <Text style={styles.formLabel}>Type</Text>
                            <View style={styles.typeButtons}>
                                {(['GCASH', 'PAYMAYA', 'BANK'] as PaymentMethodType[]).map((type) => (
                                    <Pressable
                                        key={type}
                                        style={[styles.typeButton, selectedType === type && styles.typeButtonActive]}
                                        onPress={() => setSelectedType(type)}
                                    >
                                        <Text style={styles.typeButtonIcon}>{PAYMENT_TYPE_ICONS[type]}</Text>
                                        <Text style={[styles.typeButtonText, selectedType === type && styles.typeButtonTextActive]}>
                                            {PAYMENT_TYPE_LABELS[type]}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Account Name</Text>
                            <TextInput
                                style={styles.input}
                                value={accountName}
                                onChangeText={setAccountName}
                                placeholder="Name on account"
                            />

                            <Text style={styles.formLabel}>Account Number</Text>
                            <TextInput
                                style={styles.input}
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                placeholder={selectedType === 'BANK' ? 'Account number' : 'Mobile number'}
                                keyboardType="numeric"
                            />

                            {selectedType === 'BANK' && (
                                <>
                                    <Text style={styles.formLabel}>Bank Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={bankName}
                                        onChangeText={setBankName}
                                        placeholder="e.g., BDO, BPI, UnionBank"
                                    />
                                </>
                            )}

                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setIsDefault(!isDefault)}
                            >
                                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                                    {isDefault && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxLabel}>Set as default payment method</Text>
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
                                        {editingMethod ? 'Update' : 'Add'} Payment Method
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
        color: '#ddd',
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
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    cardIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    defaultBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    defaultBadgeText: {
        color: '#4CAF50',
        fontSize: 10,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    cardNumber: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        gap: 12,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    actionText: {
        color: '#C88EA7',
        fontSize: 14,
        fontWeight: '500',
    },
    deleteText: {
        color: '#E53935',
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
        marginTop: 16,
    },
    typeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#eee',
        alignItems: 'center',
    },
    typeButtonActive: {
        borderColor: '#C88EA7',
        backgroundColor: '#FDF2F5',
    },
    typeButtonIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    typeButtonText: {
        fontSize: 12,
        color: '#666',
    },
    typeButtonTextActive: {
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
