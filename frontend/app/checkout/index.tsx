import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Truck } from 'lucide-react-native';

import { CheckoutProvider, useCheckout } from '@/contexts/CheckoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { addressAPI } from '@/api/api';
import AddressSelector from '@/components/checkout/AddressSelector';
import AddressForm from '@/components/checkout/AddressForm';
import { Address } from '@/components/checkout/AddressCard';
import { theme } from '@/constants/theme';
import { FREE_SHIPPING_THRESHOLD } from '../cart';

import { CheckoutAddressSection } from '@/components/checkout/CheckoutAddressSection';
import { CheckoutProductList } from '@/components/checkout/CheckoutProductList';
import { AddressMapPicker } from '@/components/checkout/AddressMapPicker';
import { CheckoutSessionExpiredDialog } from '@/components/checkout/CheckoutSessionExpiredDialog';
import { CheckoutPaymentSection } from '@/components/checkout/CheckoutPaymentSection';
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary';

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
    const { items } = useLocalSearchParams();
    const { user } = useAuth();
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

        statusMessage,
        initiateCheckout,
        completeCheckout,
        sellerMetrics,
        codInfo, // NEW
        expiresAt,
        cancelCheckout,
    } = useCheckout();

    // COD Eligibility & Deposit
    const isCodAllowed = codInfo?.allowed !== false;
    const codDepositPercent = codInfo?.depositPercent ?? 0;

    // Shipping Fee Logic
    const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : 60.00;
    const hasFreeShipping = shippingFee === 0;


    // Dynamic Delivery Estimate
    const { shipTimeStr, deliveryDateStr } = React.useMemo(() => {
        const maxShipHours = lockedPrices.reduce((max, item) => {
            // sellerId might be missing or null, handle safely
            const sId = item.sellerId;
            const metrics = (sId && sellerMetrics) ? sellerMetrics[sId] : null;
            return Math.max(max, metrics ? metrics.avgShipTimeHours : 24);
        }, 0) || 24;

        const shipDays = Math.ceil(maxShipHours / 24);
        const today = new Date();
        const start = new Date(today); start.setDate(today.getDate() + 3 + shipDays);
        const end = new Date(today); end.setDate(today.getDate() + 5 + shipDays);

        const dateStr = `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })}`;
        const timeStr = maxShipHours < 24 ? `~${Math.ceil(maxShipHours)}h` : `~${Math.ceil(maxShipHours / 24)} days`;

        return { shipTimeStr: timeStr, deliveryDateStr: dateStr };
    }, [sellerMetrics, lockedPrices]);

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
    const [addrFormMode, setAddrFormMode] = useState<'create' | 'edit'>('create');
    const [editingAddr, setEditingAddr] = useState<Address | null>(null);
    const [isSavingAddr, setIsSavingAddr] = useState(false);

    // Modal animation
    const modalVisible = viewMode !== 'checkout';
    const [modalMounted, setModalMounted] = useState(false);
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(60)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    // Freeze the view mode while animating out
    const lastViewModeRef = useRef(viewMode !== 'checkout' ? viewMode : 'address_selection');
    if (viewMode !== 'checkout') {
        lastViewModeRef.current = viewMode;
    }
    const displayMode = viewMode === 'checkout' ? lastViewModeRef.current : viewMode;

    useEffect(() => {
        if (modalVisible) {
            // Reset values to initial state before mounting so reopening always
            // starts from scratch (fixes stale-value bug on second open)
            backdropAnim.setValue(0);
            slideAnim.setValue(60);
            scaleAnim.setValue(0.96);
            setModalMounted(true);

            // Defer animation by one tick so the Modal has committed to the DOM
            // before we start animating (fixes race-condition flicker)
            const id = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(backdropAnim, {
                        toValue: 1,
                        duration: 220,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 280,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 280,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 0);
            return () => clearTimeout(id);
        } else {
            // Guard: only animate out if the modal is actually mounted
            if (!modalMounted) return;
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 40,
                    duration: 200,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.97,
                    duration: 180,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start(() => setModalMounted(false));
        }
    }, [modalVisible]);

    // Payment method
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'paymaya' | 'card'>('cod');
    const [deliveryNotes, setDeliveryNotes] = useState('');

    // Session Expiration State
    const [showExpirationDialog, setShowExpirationDialog] = useState(false);
    const expirationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --------------------------------------------------------------------------
    // Effects
    // --------------------------------------------------------------------------
    useEffect(() => {
        fetchAddresses();
    }, []);

    // --------------------------------------------------------------------------
    // Checkout Initialization
    // --------------------------------------------------------------------------
    useEffect(() => {
        const init = async () => {
            if (user?.uid && items && typeof items === 'string') {
                const itemIds = items.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                if (itemIds.length > 0) {
                    const success = await initiateCheckout(itemIds);
                    if (success) {
                        // Clear the param to prevent re-initiation on refresh if desired,
                        // OR keep it so refresh works (but idempotency key handles dupes).
                        // Let's clear it to be clean.
                        router.setParams({ items: undefined });
                    }
                }
            }
        };
        init();
    }, [user, items]);

    // --------------------------------------------------------------------------
    // Session Expiration Monitoring
    // --------------------------------------------------------------------------
    useEffect(() => {
        // Clear any existing timer
        if (expirationTimerRef.current) {
            clearTimeout(expirationTimerRef.current);
            expirationTimerRef.current = null;
        }

        if (!expiresAt) return;

        const expirationTime = new Date(expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expirationTime - now;

        if (timeUntilExpiry <= 0) {
            // Already expired
            setShowExpirationDialog(true);
        } else {
            // Set timer to trigger expiration dialog
            expirationTimerRef.current = setTimeout(() => {
                setShowExpirationDialog(true);
            }, timeUntilExpiry);
        }

        // Cleanup on unmount or when expiresAt changes
        return () => {
            if (expirationTimerRef.current) {
                clearTimeout(expirationTimerRef.current);
                expirationTimerRef.current = null;
            }
        };
    }, [expiresAt]);

    const handleExpirationDismiss = async () => {
        setShowExpirationDialog(false);
        await cancelCheckout();
        router.replace('/cart');
    };

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
            return res.data.addresses;
        } catch (e) {
            console.error(e);
            return [];
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
            // Automatically open address selection if missing
            setViewMode('address_selection');
            return;
        }

        if (!paymentMethod) {
            Alert.alert('Missing Info', 'Please select a payment method.');
            return;
        }

        // 1. Set Shipping Info
        const shippingData = {
            fullName: selectedAddress.fullName,
            address: selectedAddress.streetAddress, // simplified mapping
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            phone: selectedAddress.phone,
            notes: deliveryNotes,
        };
        setShippingInfo(shippingData);

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
            // Map frontend payment method to backend expected values
            let backendPaymentMethod = 'MOCK_WALLET'; // Default fallback
            if (paymentMethod === 'cod') backendPaymentMethod = 'COD';
            else if (paymentMethod === 'card') backendPaymentMethod = 'MOCK_CARD';
            else if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') backendPaymentMethod = 'MOCK_WALLET';

            const result = await processPayment(backendPaymentMethod);
            if (result) {
                // If payment successful (returns paymentId), complete the order
                const success = await completeCheckout(result, shippingData);
                if (success) {
                    router.replace('/checkout/success' as any);
                }
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
            province: data.state,
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
    const closeModal = () => {
        if (viewMode === 'map_picker') setViewMode('address_form');
        else setViewMode('checkout');
    };

    const renderAddressModal = () => {
        if (!modalMounted) return null;
        return (
            <Modal
                visible={modalMounted}
                animationType="none"
                transparent={true}
                onRequestClose={closeModal}
            >
                {/* Animated backdrop */}
                <Animated.View
                    style={[
                        styles.modalOverlay,
                        { opacity: backdropAnim },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />

                    {/* Animated modal panel */}
                    <Animated.View
                        style={[
                            styles.modalContent,
                            isDesktop && styles.modalContentDesktop,
                            {
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim },
                                ],
                            },
                        ]}
                    >
                        {displayMode === 'address_selection' ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Select Address</Text>
                                    <Pressable onPress={() => setViewMode('checkout')} style={styles.modalCloseBtn}>
                                        <Ionicons name="close" size={20} color={theme.colors.text} />
                                    </Pressable>
                                </View>
                                <ScrollView style={{ maxHeight: '100%' }} showsVerticalScrollIndicator={false}>
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
                                            const newAddresses = await fetchAddresses();
                                            if (selectedAddress?.uid === id) {
                                                if (newAddresses && newAddresses.length > 0) {
                                                    const def = newAddresses.find((a: Address) => a.isDefault);
                                                    setSelectedAddress(def || newAddresses[0]);
                                                } else {
                                                    setSelectedAddress(null);
                                                }
                                            }
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
                        ) : displayMode === 'address_form' ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <Pressable
                                        onPress={() => setViewMode('address_selection')}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    >
                                        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                                        <Text style={styles.modalTitle}>
                                            {addrFormMode === 'create' ? 'Add Address' : 'Edit Address'}
                                        </Text>
                                    </Pressable>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <AddressForm
                                        mode={addrFormMode}
                                        initialData={editingAddr ? {
                                            label: editingAddr.label ?? undefined,
                                            fullName: editingAddr.fullName,
                                            phone: editingAddr.phone,
                                            streetAddress: editingAddr.streetAddress,
                                            aptSuite: editingAddr.aptSuite ?? undefined,
                                            region: editingAddr.region ?? undefined,
                                            province: editingAddr.province ?? editingAddr.stateProvince ?? undefined,
                                            city: editingAddr.city,
                                            barangay: editingAddr.barangay ?? undefined,
                                            postalCode: editingAddr.postalCode,
                                            country: editingAddr.country,
                                            isDefault: editingAddr.isDefault,
                                        } : undefined}
                                        onSave={async (data) => {
                                            if (isSavingAddr) return;
                                            setIsSavingAddr(true);
                                            try {
                                                if (addrFormMode === 'create') await addressAPI.createAddress(data);
                                                else await addressAPI.updateAddress(editingAddr!.uid, data);
                                                await fetchAddresses();
                                                setViewMode('address_selection');
                                            } catch (e) { Alert.alert('Error', 'Failed to save address.'); }
                                            finally { setIsSavingAddr(false); }
                                        }}
                                        onCancel={() => setViewMode('address_selection')}
                                        onOpenMap={() => setViewMode('map_picker')}
                                        showSaveCheckbox
                                        isSaving={isSavingAddr}
                                        isFirstAddress={addresses.length === 0}
                                    />
                                </ScrollView>
                            </>
                        ) : (
                            <View style={{ flex: 1 }}>
                                <AddressMapPicker
                                    onClose={() => setViewMode('address_form')}
                                    onLocationSelect={handleMapLocationSelect}
                                />
                            </View>
                        )}
                    </Animated.View>
                </Animated.View>
            </Modal>
        );
    };

    // Main Single Page Checkout View
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Pressable
                        onPress={async () => {
                            await cancelCheckout();
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/cart');
                            }
                        }}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                        <Text style={styles.headerTitle}>Checkout</Text>
                    </Pressable>
                </View>
            </View>

            <CheckoutSessionExpiredDialog
                visible={showExpirationDialog}
                onDismiss={handleExpirationDismiss}
            />

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

                                {/* Professional Free Shipping Indicator */}
                                {hasFreeShipping && (
                                    <View style={{ marginBottom: 8 }}>
                                        <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: '500', fontFamily: theme.typography.fontFamily }}>Standard Local Shipping is on us.</Text>
                                    </View>
                                )}

                                <View style={[styles.shippingOptionRow, hasFreeShipping && styles.shippingOptionRowActive]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.shippingName}>Standard Local Delivery</Text>
                                            {hasFreeShipping && (
                                                <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '600', fontFamily: theme.typography.fontFamily, letterSpacing: 0.5 }}>FREE</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.shippingTime}>Get by {deliveryDateStr} (Seller ships in {shipTimeStr})</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {hasFreeShipping ? (
                                            <>
                                                <Text style={styles.shippingPriceStrikethrough}>₱60.00</Text>
                                                <Text style={styles.shippingPriceFreeProfessional}>₱0.00</Text>
                                            </>
                                        ) : (
                                            <Text style={styles.shippingPrice}>₱60.00</Text>
                                        )}
                                    </View>
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
                                    <Truck size={20} color={theme.colors.primary} />
                                    <Text style={styles.sectionTitle}>Payment Method</Text>
                                </View>
                                <CheckoutPaymentSection
                                    paymentMethod={paymentMethod}
                                    onSelect={setPaymentMethod}
                                    isCodAllowed={isCodAllowed}
                                    codDepositPercent={codDepositPercent}
                                    codReason={codInfo?.reason}
                                    totalAmount={totalAmount}
                                    shippingFee={shippingFee}
                                />
                            </View>

                            {/* 5. Order Summary */}
                            <CheckoutOrderSummary
                                totalAmount={totalAmount}
                                shippingFee={shippingFee}
                                hasFreeShipping={hasFreeShipping}
                                paymentMethod={paymentMethod}
                                codDepositPercent={codDepositPercent}
                                isProcessing={isProcessing}
                                onPlaceOrder={handlePlaceOrder}
                            />

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
    shippingPriceStrikethrough: {
        fontWeight: '400',
        color: theme.colors.textSecondary,
        fontSize: 12,
        textDecorationLine: 'line-through',
    },
    shippingPriceFreeProfessional: {
        fontWeight: '600',
        color: theme.colors.primary,
        fontSize: 14,
    },
    shippingOptionRowActive: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.primary,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginVertical: 8,
        borderBottomColor: theme.colors.primary, // Explicitly override base style
    },

    // Modal (address modal)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        width: '100%',
        maxWidth: 560,
        maxHeight: '90%',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 28,
        ...theme.shadows.lg,
    },
    modalContentDesktop: {
        width: 620,
        maxWidth: 620,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },

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
});
