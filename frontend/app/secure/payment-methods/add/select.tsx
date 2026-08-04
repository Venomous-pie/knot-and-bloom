import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ChevronRight, CreditCard, Landmark, Smartphone, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PaymentMethodType } from '@/services/api';

interface PaymentOption {
    label: string;
    type: PaymentMethodType;
    subtype?: 'card' | 'wallet' | 'bank';
    icon: React.ReactNode;
}

export default function SelectPaymentMethodPage() {
    const router = useRouter();

    const options: PaymentOption[] = [
        {
            label: 'Credit / Debit Card',
            type: 'BANK',
            subtype: 'card',
            icon: <CreditCard size={24} color="#B36979" />,
        },
        {
            label: 'Link PayMaya',
            type: 'PAYMAYA',
            subtype: 'wallet',
            icon: <Smartphone size={24} color="#B36979" />,
        },
        {
            label: 'Link GCash',
            type: 'GCASH',
            subtype: 'wallet',
            icon: <Smartphone size={24} color="#B36979" />,
        },
        {
            label: 'Link Bank Account',
            type: 'BANK',
            subtype: 'bank',
            icon: <Landmark size={24} color="#B36979" />,
        },
    ];

    const handleSelect = (option: PaymentOption) => {
        router.push({
            pathname: '/secure/payment-methods/add/[type]', // Updated path
            params: { type: option.type, subtype: option.subtype }
        });
    };

    const handleCancel = () => {
        router.replace('/profile/account/payment-methods'); // Exit back to profile
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add Payment Method</Text>
                        {/* Cancel / Close Button */}
                        <Pressable onPress={handleCancel} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </Pressable>
                    </View>

                    <View style={styles.list}>
                        {options.map((option, index) => (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.optionItem,
                                    pressed && styles.optionItemPressed
                                ]}
                                onPress={() => handleSelect(option)}
                            >
                                <View style={styles.optionLeft}>
                                    <View style={styles.iconWrapper}>
                                        {option.icon}
                                    </View>
                                    <Text style={styles.optionLabel}>{option.label}</Text>
                                </View>
                                <ChevronRight size={20} color="#ccc" />
                            </Pressable>
                        ))}
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
        borderRadius: 16,
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
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
        textAlign: 'left',
    },
    closeButton: {
        padding: 8,
    },
    closeButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    list: {
        gap: 0,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionItemPressed: {
        opacity: 0.7,
        backgroundColor: '#f9f9f9',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Quicksand',
        fontWeight: '500',
    },
});
