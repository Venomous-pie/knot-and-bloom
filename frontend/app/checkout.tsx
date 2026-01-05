import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Check, ChevronRight, CreditCard, Truck } from 'lucide-react-native';

import { CheckoutProvider, useCheckout } from '@/app/context/_CheckoutContext';
import { useAuth } from '@/app/auth';
import { addressAPI } from '@/api/api';
import AddressSelector from '@/components/checkout/AddressSelector';
import AddressForm from '@/components/checkout/AddressForm';
import { Address } from '@/components/checkout/AddressCard';
import { theme } from '@/constants/theme';

// New Components
import { CheckoutAddressSection } from '@/components/checkout/CheckoutAddressSection';
import { CheckoutProductList } from '@/components/checkout/CheckoutProductList';
import { AddressMapPicker } from '@/components/checkout/AddressMapPicker';

export default function CheckoutPage() {
    return (
        <CheckoutProvider>
            <CheckoutContent />
        </CheckoutProvider>
    );
}

function CheckoutContent() {
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDesktop = width >= 1024;

    const {
        step,
        setStep,
        validateAndProceedToPayment,
        processPayment,
        isProcessing,
        totalAmount,
        lockedPrices,
        shippingInfo,
        setShippingInfo,
        error: checkoutError,
        statusMessage
    } = useCheckout();

    // --------------------------------------------------------------------------
    // Local State
    // --------------------------------------------------------------------------
    // Address Logic
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddr, setLoadingAddr] = useState(true);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

    // UI Mode: 'checkout' | 'address_selection' | 'address_form'
    const [viewMode, setViewMode] = useState<'checkout' | 'address_selection' | 'address_form' | 'map_picker'>('checkout');
    // Address Form Mode
    // Address Form Mode
    const [addrFormMode, setAddrFormMode] = useState<'create' | 'edit'>('create');
    const [editingAddr, setEditingAddr] = useState<Address | null>(null);

    // Payment Logic
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash'>('cod');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // --------------------------------------------------------------------------
    // Effects
    // --------------------------------------------------------------------------
    useEffect(() => {
        fetchAddresses();
    }, []);

    // --------------------------------------------------------------------------
    // Address Handlers
    // --------------------------------------------------------------------------
    const fetchAddresses = async () => {
        try {
            setLoadingAddr(true);
            const res = await addressAPI.getAddresses();
            setAddresses(res.data.addresses);

            // Auto-select default
            if (res.data.addresses.length > 0 && !selectedAddress) {
                const def = res.data.addresses.find((a: Address) => a.isDefault);
                setSelectedAddress(def || res.data.addresses[0]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAddr(false);
        }
    };

    const handleAddressSelect = (id: number) => {
        const addr = addresses.find(a => a.uid === id);
        if (addr) {
            setSelectedAddress(addr);
            setViewMode('checkout');
        }
    };

    const handlePlaceOrder = async () => {
        if (!selectedAddress) {
            Alert.alert('Missing Info', 'Please add a delivery address.');
            return;
        }

        // 1. Set Shipping Info in Context (if not already synced)
        // Ideally context uses ID, or we pass object. 
        // Based on previous refactor, setShippingInfo takes an object.
        setShippingInfo({
            fullName: selectedAddress.fullName,
            address: selectedAddress.streetAddress, // simplified mapping
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            phone: selectedAddress.phone,
            notes: deliveryNotes,
        });

        // 2. Process Payment
        // This will internally trigger 'validateAndProceedToPayment' equivalent if needed,
        // OR we might need to manually call setStep('payment') then process.
        // But since we are condensing steps, we might need to check context API.
        // Context separates 'validate' and 'pay'.
        // Step 1: Validate (lock inventory/prices again?). 
        // If context requires us to be in 'payment' step to pay, we assume 'shipping' is done.

        // HACK: Use 'processPayment' directly if context allows, or manually cycle steps.
        // Assuming context flow: initiate -> (step: shipping) -> validate -> (step: payment) -> pay -> complete.

        // Let's rely on `processPayment` handling usage or we call the chain.
        // Since we are single-page, we effectively "validate" just before paying.
        // BUT `_CheckoutContext` might check `step`.

        // For this refactor, let's assume we can interact with API directly or helper.
        // `processPayment` in context usually expects `step === 'payment'`.
        // So we might need to force step updates behind the scenes.

        // Direct Flow:
        // 1. Update State to 'payment' (Trigger validation?)
        // Actually, `useCheckout` exposes `validateAndProceedToPayment`.

        const valid = await validateAndProceedToPayment(); // Moves to 'payment' step
        if (valid) {
            const result = await processPayment(paymentMethod);
            if (result) {
                router.replace('/checkout/success' as any);
            }
        }
    };

    const handleMapLocationSelect = (data: any) => {
        // Map data usually comes as { fullAddress, street, city, state, zipCode, country, lat, lng }
        // Update editingAddr or create a temporary one for the form to digest
        setEditingAddr(prev => ({
            ...(prev || {}),
            uid: prev?.uid || Date.now(), // Temp ID if new
            fullName: prev?.fullName || '', // Preserve or empty
            phone: prev?.phone || '',
            streetAddress: data.street || data.fullAddress,
            city: data.city,
            stateProvince: data.state,
            postalCode: data.zipCode,
            country: data.country || 'Philippines',
            isDefault: prev?.isDefault ?? false,
            createdAt: prev?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        // Go back to form
        setViewMode('address_form');
    };

    // Address Selection Modal
    const renderAddressModal = () => (
        <Modal
            visible={viewMode !== 'checkout'}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
                if (viewMode === 'map_picker') setViewMode('address_form');
                else setViewMode('checkout');
            }}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
                    {viewMode === 'address_selection' ? (
                        <>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Address</Text>
                                <Pressable onPress={() => setViewMode('checkout')}>
                                    <Ionicons name="close" size={24} color={theme.colors.text} />
                                </Pressable>
                            </View>
                            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
                                <AddressSelector
                                    addresses={addresses}
                                    selectedId={selectedAddress?.uid ?? null}
                                    onSelect={(id) => {
                                        handleAddressSelect(id);
                                        setViewMode('checkout');
                                    }}
                                    onEdit={(addr) => {
                                        setEditingAddr(addr);
                                        setAddrFormMode('edit');
                                        setViewMode('address_form');
                                    }}
                                    onDelete={async (id) => {
                                        await addressAPI.deleteAddress(id);
                                        fetchAddresses();
                                    }}
                                    onSetDefault={async (id) => {
                                        await addressAPI.setDefaultAddress(id);
                                        fetchAddresses();
                                    }}
                                    onAddNew={() => {
                                        setEditingAddr(null);
                                        setAddrFormMode('create');
                                        setViewMode('address_form');
                                    }}
                                    isLoading={loadingAddr}
                                />
                            </ScrollView>
                        </>
                    ) : viewMode === 'address_form' ? (
                        <>
                            <View style={styles.modalHeader}>
                                <Pressable onPress={() => setViewMode('address_selection')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                                    <Text style={[styles.modalTitle, { marginLeft: 8 }]}>{addrFormMode === 'create' ? 'Add Address' : 'Edit Address'}</Text>
                                </Pressable>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <AddressForm
                                    mode={addrFormMode}
                                    initialData={editingAddr ? {
                                        ...editingAddr,
                                        label: editingAddr.label ?? undefined,
                                        aptSuite: editingAddr.aptSuite ?? undefined,
                                        stateProvince: editingAddr.stateProvince ?? undefined,
                                    } : undefined}
                                    onSave={async (data) => {
                                        try {
                                            if (addrFormMode === 'create') await addressAPI.createAddress(data);
                                            else await addressAPI.updateAddress(editingAddr!.uid, data);
                                            await fetchAddresses();
                                            setViewMode('address_selection');
                                        } catch (e) { Alert.alert('Error', 'Failed to save'); }
                                    }}
                                    onCancel={() => setViewMode('address_selection')}
                                    onOpenMap={() => setViewMode('map_picker')}
                                    showSaveCheckbox
                                />
                            </ScrollView>
                        </>
                    ) : (
                        /* Map Picker View */
                        <View style={{ flex: 1 }}>
                            <AddressMapPicker
                                onClose={() => setViewMode('address_form')}
                                onLocationSelect={handleMapLocationSelect}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    // Main Single Page Checkout View
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        <Text style={styles.headerTitle}>Checkout</Text>
                    </Pressable>
                </View>
            </View>

            {renderAddressModal()}

            <View style={styles.contentContainer}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={isDesktop ? styles.mainLayoutDesktop : styles.mainLayout}>

                        {/* Main Column */}
                        <View style={styles.leftColumn}>
                            {/* 1. Address Section */}
                            <CheckoutAddressSection
                                selectedAddress={selectedAddress}
                                onChange={() => setViewMode('address_selection')}
                            />

                            {/* 2. Product List */}
                            <CheckoutProductList items={lockedPrices} />

                            {/* 3. Shipping Options */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <Truck size={20} color={theme.colors.primary} />
                                    <Text style={styles.sectionTitle}>Shipping Option</Text>
                                </View>
                                <View style={styles.shippingOptionRow}>
                                    <View>
                                        <Text style={styles.shippingName}>Standard Local Delivery</Text>
                                        <Text style={styles.shippingTime}>Get by 22 Jan - 25 Jan</Text>
                                    </View>
                                    <Text style={styles.shippingPrice}>₱60.00</Text>
                                </View>
                                <TextInput
                                    placeholder="Message for seller/courier..."
                                    style={styles.messageInput}
                                    value={deliveryNotes}
                                    onChangeText={setDeliveryNotes}
                                />
                            </View>

                            {/* 4. Payment Method */}
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeader}>
                                    <CreditCard size={20} color={theme.colors.primary} />
                                    <Text style={styles.sectionTitle}>Payment Method</Text>
                                </View>
                                <View style={styles.paymentMethods}>
                                    <Pressable
                                        style={[styles.paymentChip, paymentMethod === 'cod' && styles.paymentChipSelected]}
                                        onPress={() => setPaymentMethod('cod')}
                                    >
                                        <Text style={[styles.paymentChipText, paymentMethod === 'cod' && styles.paymentChipTextSelected]}>Cash on Delivery</Text>
                                        {paymentMethod === 'cod' && <Check size={16} color="white" />}
                                    </Pressable>
                                    <Pressable
                                        style={[styles.paymentChip, paymentMethod === 'gcash' && styles.paymentChipSelected]}
                                        onPress={() => setPaymentMethod('gcash')}
                                    >
                                        <Text style={[styles.paymentChipText, paymentMethod === 'gcash' && styles.paymentChipTextSelected]}>GCash / E-Wallet</Text>
                                        {paymentMethod === 'gcash' && <Check size={16} color="white" />}
                                    </Pressable>
                                </View>
                            </View>

                            {/* 5. Order Totals (Integrated at bottom) */}
                            <View style={styles.totalsSection}>
                                <View style={styles.totalRow}>
                                    <Text style={styles.summaryLabel}>Merchandise Subtotal:</Text>
                                    <Text style={styles.summaryValue}>₱{totalAmount.toFixed(2)}</Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.summaryLabel}>Shipping Total:</Text>
                                    <Text style={styles.summaryValue}>₱60.00</Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Total Payment:</Text>
                                    <Text style={styles.totalAmount}>₱{(totalAmount + 60).toFixed(2)}</Text>
                                </View>

                                <View style={styles.actionRow}>
                                    <Pressable
                                        style={[styles.placeOrderButton, isProcessing && styles.disabledButton]}
                                        onPress={handlePlaceOrder}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? <ActivityIndicator color="white" /> : <Text style={styles.placeOrderText}>Place Order</Text>}
                                    </Pressable>
                                </View>
                            </View>

                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Error Banner */}
            {checkoutError && (
                <View style={styles.errorToast}>
                    <Text style={styles.errorText}>{checkoutError}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        alignItems: 'center', // Check centering
    },
    headerContent: {
        width: '100%',
        maxWidth: 1100,
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    contentContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    mainLayout: {
        flexDirection: 'column',
    },
    mainLayoutDesktop: {
        flexDirection: 'column',
        alignSelf: 'center',
        width: '100%',
        maxWidth: 1100, // Matches standard desktop container width
        padding: theme.spacing.lg,
        gap: theme.spacing.lg,
    },
    leftColumn: {
        width: '100%',
        gap: theme.spacing.lg,
    },
    sectionContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    messageInput: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 16,
        padding: 16,
        marginTop: 12,
        borderStyle: 'dashed',
        fontFamily: theme.typography.fontFamily,
        backgroundColor: theme.colors.subtle,
    },
    shippingOptionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    shippingName: { fontWeight: '600', color: theme.colors.text, fontSize: 14 },
    shippingTime: { color: theme.colors.textSecondary, fontSize: 12 },
    shippingPrice: { fontWeight: '600', color: theme.colors.text },

    paymentMethods: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    paymentChip: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paymentChipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight + '10', // 10% opacity
    },
    paymentChipText: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    paymentChipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },

    // Sticky Summary
    totalsSection: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
        borderRadius: 16,
        ...theme.shadows.sm,
        marginTop: theme.spacing.md,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 16,
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    summaryValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        minWidth: 80,
        textAlign: 'right',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginTop: 8,
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
        minWidth: 80,
        textAlign: 'right',
        marginTop: 8,
    },
    actionRow: {
        alignItems: 'flex-end',
        marginTop: 24,
    },
    placeOrderButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.md,
    },

    // Modal
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
        fontFamily: theme.typography.fontFamily,
    },
    placeOrderText: { color: 'white', fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, fontFamily: theme.typography.fontFamily },
    disabledButton: { opacity: 0.7 },

    // Confirmation
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8, fontFamily: theme.typography.fontFamily },

    errorToast: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: theme.colors.error,
        padding: 12,
        borderRadius: 8,
    },
    errorText: { color: 'white', textAlign: 'center' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    loadingText: { marginTop: 16, color: theme.colors.primary, fontWeight: '600' },
});
