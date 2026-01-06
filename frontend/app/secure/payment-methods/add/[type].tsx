import { paymentMethodAPI, PaymentMethodInput, PaymentMethodType } from '@/api/api';
import { theme } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddPaymentMethodPage() {
    const router = useRouter();
    const { type, subtype } = useLocalSearchParams<{ type: PaymentMethodType, subtype?: string }>();
    const safeType = type || 'GCASH';
    const isCard = subtype === 'card';
    const isBank = safeType === 'BANK' && !isCard;

    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');

    const [isDefault, setIsDefault] = useState(false);
    const [saving, setSaving] = useState(false);

    const getTitle = () => {
        if (isCard) return 'Add Credit / Debit Card';
        if (safeType === 'PAYMAYA') return 'Link PayMaya';
        if (safeType === 'GCASH') return 'Link GCash';
        if (isBank) return 'Link Bank Account';
        return `Add ${safeType}`;
    };

    const handleSave = async () => {
        if (!accountName.trim() || !accountNumber.trim()) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (isBank && !bankName.trim()) {
            Alert.alert('Error', 'Bank name is required');
            return;
        }

        setSaving(true);
        try {
            const data: PaymentMethodInput = {
                type: safeType as PaymentMethodType,
                accountName: accountName.trim(),
                accountNumber: accountNumber.trim(),
                bankName: isBank ? bankName.trim() : (isCard ? 'Credit/Debit Card' : undefined),
                isDefault,
            };

            await paymentMethodAPI.createPaymentMethod(data);
            Alert.alert('Success', 'Payment method added successfully');
            router.replace('/profile/account/payment-methods');
        } catch (error: any) {
            console.error('Error saving payment method:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to save payment method');
        } finally {
            setSaving(false);
        }
    };

    // This handles "Cancel" on the form page.
    // If user clicked Cancel, they probably want to abort the whole flow, OR go back to selection.
    // Given the flow, "Cancel" usually implies aborting. "Back" implies going up a level.
    // The UI has a "Cancel" text. Let's make it go back to profile (abort) to be consistent with "independent page".
    // BUT we also need a way to go "Back" to select.
    // The previous code used `router.back()` which goes to select.
    // I will add a header with "Back" (chevron) AND "Cancel" (text). 
    // Wait, the user said "put cancel button ... to exit".
    // I will keep "Cancel" in top right maybe? Or just replace "Back" with "Cancel" if step 1 is skipped?
    // Let's stick to: "Cancel" button exits to profile. A separate "Back" button goes to select.

    const handleCancel = () => {
        router.replace('/profile/account/payment-methods');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>

                <View style={styles.card}>
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Back</Text>
                        </Pressable>
                        <Text style={styles.title}>{getTitle()}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.securityBanner}>
                        <ShieldCheck size={20} color="#4CAF50" />
                        <View style={styles.securityTextContainer}>
                            <Text style={styles.securityTitle}>Your details are protected.</Text>
                            <Text style={styles.securityText}>
                                We partner with secure payment providers to ensure your details are kept safe.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.formContent}>
                        {isCard ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Card Details</Text>
                                    <View style={styles.cardInputContainer}>
                                        <TextInput
                                            style={[styles.input, styles.inputTop]}
                                            placeholder="Card Number"
                                            value={accountNumber}
                                            onChangeText={setAccountNumber}
                                            keyboardType="numeric"
                                            placeholderTextColor="#999"
                                        />
                                        <View style={styles.rowInputs}>
                                            <TextInput
                                                style={[styles.input, styles.inputBottomLeft, { flex: 1, borderRightWidth: 1, borderRightColor: '#e0e0e0' }]}
                                                placeholder="Expiry Date (MM/YY)"
                                                value={expiry}
                                                onChangeText={setExpiry}
                                                placeholderTextColor="#999"
                                            />
                                            <TextInput
                                                style={[styles.input, styles.inputBottomRight, { flex: 1 }]}
                                                placeholder="CVV"
                                                value={cvv}
                                                onChangeText={setCvv}
                                                keyboardType="numeric"
                                                secureTextEntry
                                                maxLength={4}
                                                placeholderTextColor="#999"
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Card Holder Name</Text>
                                    <TextInput
                                        style={styles.inputSingle}
                                        placeholder="Name on Card"
                                        value={accountName}
                                        onChangeText={setAccountName}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Account Name</Text>
                                    <TextInput
                                        style={styles.inputSingle}
                                        placeholder="Full Name"
                                        value={accountName}
                                        onChangeText={setAccountName}
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{isBank ? 'Account Number' : 'Mobile Number'}</Text>
                                    <TextInput
                                        style={styles.inputSingle}
                                        placeholder={isBank ? 'Account Number' : '0912 345 6789'}
                                        value={accountNumber}
                                        onChangeText={setAccountNumber}
                                        keyboardType="numeric"
                                        placeholderTextColor="#999"
                                    />
                                </View>

                                {isBank && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Bank Name</Text>
                                        <TextInput
                                            style={styles.inputSingle}
                                            placeholder="e.g. BDO, BPI"
                                            value={bankName}
                                            onChangeText={setBankName}
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                )}
                            </>
                        )}

                        <View style={styles.footerRow}>
                            <View style={{ flex: 1 }}>
                                {isCard && (
                                    <Text style={styles.finePrint}>
                                        PHP1.00 will be deducted as verification fee. It will be refunded within 14 days.
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={styles.cancelButtonBottom}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonBottomText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.submitButton, saving && styles.submitButtonDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Submit</Text>}
                            </Pressable>
                        </View>

                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFAF9',
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 32,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        ...theme.shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 14,
    },
    cancelButton: {
        padding: 8,
        marginRight: -8,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
    },
    cancelButtonBottom: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonBottomText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    securityBanner: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderRadius: 4,
        padding: 12,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    securityTextContainer: {
        flex: 1,
    },
    securityTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 2,
    },
    securityText: {
        fontSize: 12,
        color: '#388E3C',
        lineHeight: 16,
    },
    formContent: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    inputSingle: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        padding: 12,
        fontSize: 14,
        color: '#333',
        height: 48,
        outlineStyle: 'none' as any,
    },
    cardInputContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    input: {
        padding: 12,
        fontSize: 14,
        color: '#333',
        height: 48,
        backgroundColor: 'white',
        outlineStyle: 'none' as any,
    },
    inputTop: {
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    rowInputs: {
        flexDirection: 'row',
    },
    inputBottomLeft: {

    },
    inputBottomRight: {

    },
    footerRow: {
        marginTop: 10,
        marginBottom: 20,
    },
    finePrint: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    submitButton: {
        backgroundColor: '#B36979',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
