import { paymentMethodAPI, PaymentMethod, PaymentMethodType, PaymentMethodInput } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import { CreditCard, Plus } from 'lucide-react-native';
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
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

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
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

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
    const [focusedField, setFocusedField] = useState<string | null>(null);

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
        router.push('/secure/payment-methods/add/select');
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
                    <Pressable onPress={() => router.push('/secure/payment-methods/add/select' as any)} style={styles.addButton}>
                        <Plus size={20} color="white" />
                        <Text style={styles.addButtonText}>Add New</Text>
                    </Pressable>
                </View>

                {paymentMethods.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CreditCard style={styles.emptyIcon} size={40} />
                        <Text style={styles.emptyTitle}>No Payment Methods</Text>
                        <Text style={styles.emptyText}>Add a payment method for faster checkout</Text>
                        <Pressable style={styles.emptyButton} onPress={() => router.push('/secure/payment-methods/add/select' as any)}>
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
                                    <View style={styles.iconWrapper}>
                                        <Text style={styles.cardIcon}>{PAYMENT_TYPE_ICONS[method.type]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
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
            <Modal visible={showModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
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
                                style={[styles.input, focusedField === 'accountName' && styles.inputFocused]}
                                value={accountName}
                                onChangeText={setAccountName}
                                placeholder="Name on account"
                                placeholderTextColor="#999"
                                onFocus={() => setFocusedField('accountName')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <Text style={styles.formLabel}>Account Number</Text>
                            <TextInput
                                style={[styles.input, focusedField === 'accountNumber' && styles.inputFocused]}
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                placeholder={selectedType === 'BANK' ? 'Account number' : 'Mobile number'}
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                                onFocus={() => setFocusedField('accountNumber')}
                                onBlur={() => setFocusedField(null)}
                            />

                            {selectedType === 'BANK' && (
                                <>
                                    <Text style={styles.formLabel}>Bank Name</Text>
                                    <TextInput
                                        style={[styles.input, focusedField === 'bankName' && styles.inputFocused]}
                                        value={bankName}
                                        onChangeText={setBankName}
                                        placeholder="e.g., BDO, BPI, UnionBank"
                                        placeholderTextColor="#999"
                                        onFocus={() => setFocusedField('bankName')}
                                        onBlur={() => setFocusedField(null)}
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
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
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
        fontFamily: 'Quicksand',
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
        backgroundColor: '#B36979',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        gap: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FDF2F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
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
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 12,
        gap: 16,
    },
    actionButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    actionText: {
        color: '#B36979',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteText: {
        color: '#E53935',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        width: '100%',
        maxHeight: '90%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    modalContentDesktop: {
        width: 600,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    modalClose: {
        fontSize: 24,
        color: '#888',
    },
    modalBody: {
        padding: 24,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
        fontFamily: 'Quicksand',
    },
    typeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    typeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    typeButtonActive: {
        borderColor: '#B36979',
        backgroundColor: '#FDF2F5',
    },
    typeButtonIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    typeButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: '#C88EA7',
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        color: '#333',
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: '#C88EA7',
        backgroundColor: '#fff',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 8,
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
        backgroundColor: '#B36979',
        borderColor: '#B36979',
    },
    checkmark: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
    },
    modalFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: 'white',
    },
    saveButton: {
        backgroundColor: '#C88EA7',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Quicksand',
    },
});
