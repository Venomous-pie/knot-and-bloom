import { Address, addressAPI, AddressInput, checkoutAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import { CheckoutProvider, CheckoutStep, ShippingInfo, useCheckout } from "@/app/context/_CheckoutContext";
import { AddressForm } from "@/components/checkout/AddressForm";
import { AddressSelector } from "@/components/checkout/AddressSelector";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const { width } = Dimensions.get('window');

// Progress indicator component
const StepIndicator: React.FC<{ currentStep: CheckoutStep }> = ({ currentStep }) => {
    const steps: { key: CheckoutStep; label: string }[] = [
        { key: 'cart', label: 'Review' },
        { key: 'shipping', label: 'Shipping' },
        { key: 'payment', label: 'Payment' },
        { key: 'confirmation', label: 'Done' },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
        <View style={styles.stepIndicator}>
            {steps.map((step, index) => (
                <React.Fragment key={step.key}>
                    <View style={styles.stepItem}>
                        <View style={[
                            styles.stepCircle,
                            index <= currentIndex && styles.stepCircleActive,
                            index < currentIndex && styles.stepCircleCompleted,
                        ]}>
                            {index < currentIndex ? (
                                <Text style={styles.stepCheckmark}>✓</Text>
                            ) : (
                                <Text style={[
                                    styles.stepNumber,
                                    index <= currentIndex && styles.stepNumberActive,
                                ]}>{index + 1}</Text>
                            )}
                        </View>
                        <Text style={[
                            styles.stepLabel,
                            index <= currentIndex && styles.stepLabelActive,
                        ]}>{step.label}</Text>
                    </View>
                    {index < steps.length - 1 && (
                        <View style={[
                            styles.stepLine,
                            index < currentIndex && styles.stepLineActive,
                        ]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};

// Cart Review Step
const CartReviewStep: React.FC = () => {
    const { lockedPrices, totalAmount, isProcessing, error, setStep } = useCheckout();

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Order Summary</Text>
            <Text style={styles.stepSubtitle}>Review your items before proceeding</Text>

            <ScrollView style={styles.itemsList}>
                {lockedPrices.map((item) => (
                    <View key={item.itemUid} style={styles.itemCard}>
                        <View style={styles.itemImageContainer}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.itemImage} />
                            ) : (
                                <Text style={styles.itemImagePlaceholder}>📦</Text>
                            )}
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                            {item.variantName && (
                                <Text style={styles.itemVariant}>{item.variantName}</Text>
                            )}
                            <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                        </View>
                        <View style={styles.itemPriceContainer}>
                            {item.discountPercentage > 0 && (
                                <Text style={styles.itemOriginalPrice}>₱{item.unitPrice.toFixed(2)}</Text>
                            )}
                            <Text style={styles.itemPrice}>₱{item.finalPrice.toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.buttonRow}>
                <Pressable style={styles.cancelButton} onPress={() => router.back()}>
                    <Text style={styles.cancelButtonText}>Back to Cart</Text>
                </Pressable>
                <Pressable
                    style={[styles.primaryButton, isProcessing && styles.disabledButton]}
                    onPress={() => setStep('shipping')}
                    disabled={isProcessing}
                >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                </Pressable>
            </View>
        </View>
    );
};

// Shipping Step - Enhanced with Saved Addresses
const ShippingStep: React.FC = () => {
    const { shippingInfo, setShippingInfo, validateAndProceedToPayment, isProcessing, statusMessage, error, setStep } = useCheckout();
    const { user } = useAuth();

    // Address state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    const [addressError, setAddressError] = useState<string | null>(null);

    // Form mode: 'select' for returning users, 'add' for first-time or adding new
    const [mode, setMode] = useState<'select' | 'add' | 'edit'>('select');
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [isSavingAddress, setIsSavingAddress] = useState(false);

    // Delivery notes (separate from address)
    const [deliveryNotes, setDeliveryNotes] = useState(shippingInfo?.notes || '');

    // Fetch addresses on mount
    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) return;

            try {
                setIsLoadingAddresses(true);
                const response = await addressAPI.getAddresses();
                const fetchedAddresses = response.data.addresses;
                setAddresses(fetchedAddresses);

                // Auto-select default or first address
                if (fetchedAddresses.length > 0) {
                    const defaultAddr = fetchedAddresses.find(a => a.isDefault);
                    setSelectedAddressId(defaultAddr?.uid || fetchedAddresses[0].uid);
                    setMode('select');
                } else {
                    setMode('add');
                }
            } catch (err) {
                console.error('Error fetching addresses:', err);
                setAddressError('Failed to load addresses');
                setMode('add');
            } finally {
                setIsLoadingAddresses(false);
            }
        };

        fetchAddresses();
    }, [user]);

    // Convert Address to ShippingInfo for checkout context
    const addressToShippingInfo = useCallback((address: Address): ShippingInfo => ({
        fullName: address.fullName,
        phone: address.phone,
        address: `${address.streetAddress}${address.aptSuite ? `, ${address.aptSuite}` : ''}`,
        city: address.city,
        postalCode: address.postalCode,
        notes: deliveryNotes,
    }), [deliveryNotes]);

    // Handle continue to payment
    const handleContinue = async () => {
        if (mode === 'select' && selectedAddressId) {
            const selectedAddress = addresses.find(a => a.uid === selectedAddressId);
            if (selectedAddress) {
                setShippingInfo(addressToShippingInfo(selectedAddress));
                await validateAndProceedToPayment();
            }
        }
    };

    // Handle save new address
    const handleSaveAddress = async (data: any) => {
        setIsSavingAddress(true);
        try {
            const addressInput: AddressInput = {
                label: data.label,
                fullName: data.fullName,
                phone: data.phone,
                streetAddress: data.streetAddress,
                aptSuite: data.aptSuite,
                city: data.city,
                stateProvince: data.stateProvince,
                postalCode: data.postalCode,
                country: data.country || 'Philippines',
                isDefault: data.isDefault,
            };

            if (mode === 'edit' && editingAddress) {
                // Update existing
                const response = await addressAPI.updateAddress(editingAddress.uid, addressInput);
                setAddresses(prev => prev.map(a => a.uid === editingAddress.uid ? response.data.address : a));
            } else {
                // Create new
                const response = await addressAPI.createAddress(addressInput);
                setAddresses(prev => [...prev, response.data.address]);
                setSelectedAddressId(response.data.address.uid);
            }

            setMode('select');
            setEditingAddress(null);
        } catch (err: any) {
            console.error('Error saving address:', err);
            alert(err.response?.data?.error || 'Failed to save address');
        } finally {
            setIsSavingAddress(false);
        }
    };

    // Handle delete address
    const handleDeleteAddress = async (addressId: number) => {
        try {
            await addressAPI.deleteAddress(addressId);
            setAddresses(prev => prev.filter(a => a.uid !== addressId));

            // Select another address if deleted the selected one
            if (selectedAddressId === addressId) {
                const remaining = addresses.filter(a => a.uid !== addressId);
                if (remaining.length > 0) {
                    setSelectedAddressId(remaining[0].uid);
                } else {
                    setMode('add');
                }
            }
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete address');
        }
    };

    // Handle set default
    const handleSetDefault = async (addressId: number) => {
        try {
            await addressAPI.setDefaultAddress(addressId);
            setAddresses(prev => prev.map(a => ({
                ...a,
                isDefault: a.uid === addressId
            })));
        } catch (err) {
            console.error('Error setting default:', err);
        }
    };

    // Loading state
    if (isLoadingAddresses) {
        return (
            <View style={styles.stepContent}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <ActivityIndicator size="large" color="#7c3aed" />
                    <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading addresses...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Shipping Address</Text>
            <Text style={styles.stepSubtitle}>
                {mode === 'select' ? 'Select a delivery address' : mode === 'edit' ? 'Edit address' : 'Add your shipping address'}
            </Text>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {mode === 'select' ? (
                    <>
                        <AddressSelector
                            addresses={addresses}
                            selectedId={selectedAddressId}
                            onSelect={setSelectedAddressId}
                            onEdit={(address) => {
                                setEditingAddress(address);
                                setMode('edit');
                            }}
                            onDelete={handleDeleteAddress}
                            onSetDefault={handleSetDefault}
                            onAddNew={() => setMode('add')}
                        />

                        {/* Delivery Notes */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Delivery Notes (Optional)</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 60 }]}
                                value={deliveryNotes}
                                onChangeText={setDeliveryNotes}
                                placeholder="Any special instructions?"
                                multiline
                                numberOfLines={2}
                            />
                        </View>
                    </>
                ) : (
                    <AddressForm
                        initialData={editingAddress ? {
                            label: editingAddress.label || undefined,
                            fullName: editingAddress.fullName,
                            phone: editingAddress.phone,
                            streetAddress: editingAddress.streetAddress,
                            aptSuite: editingAddress.aptSuite || undefined,
                            city: editingAddress.city,
                            stateProvince: editingAddress.stateProvince || undefined,
                            postalCode: editingAddress.postalCode,
                            country: editingAddress.country,
                            isDefault: editingAddress.isDefault,
                        } : undefined}
                        onSave={handleSaveAddress}
                        onCancel={addresses.length > 0 ? () => {
                            setMode('select');
                            setEditingAddress(null);
                        } : undefined}
                        showSaveCheckbox={false}
                        isSaving={isSavingAddress}
                        mode={mode === 'edit' ? 'edit' : 'create'}
                    />
                )}
            </ScrollView>

            {statusMessage && (
                <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
            )}

            {(error || addressError) && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error || addressError}</Text>
                </View>
            )}

            {mode === 'select' && (
                <View style={styles.buttonRow}>
                    <Pressable style={styles.cancelButton} onPress={() => setStep('cart')}>
                        <Text style={styles.cancelButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.primaryButton, (isProcessing || !selectedAddressId) && styles.disabledButton]}
                        onPress={handleContinue}
                        disabled={isProcessing || !selectedAddressId}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Continue to Payment</Text>
                        )}
                    </Pressable>
                </View>
            )}
        </View>
    );
};

// Payment Step
const PaymentStep: React.FC = () => {
    const {
        totalAmount,
        priceChanges,
        processPayment,
        completeCheckout,
        isProcessing,
        statusMessage,
        error,
        setStep
    } = useCheckout();

    const { refreshCart } = useCart();
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
    const [showPriceChangeModal, setShowPriceChangeModal] = useState(!!priceChanges && priceChanges.length > 0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadPaymentMethods = async () => {
            try {
                const response = await checkoutAPI.getPaymentMethods();
                setPaymentMethods(response.data.methods);
                if (response.data.methods.length > 0) {
                    setSelectedMethod(response.data.methods[0]);
                }
            } catch (error) {
                console.error('Failed to load payment methods:', error);
                // Fallback
                setPaymentMethods(['MOCK_CARD', 'COD']);
                setSelectedMethod('MOCK_CARD');
            }
        };
        loadPaymentMethods();
    }, []);

    const getMethodLabel = (method: string): string => {
        switch (method) {
            case 'MOCK_CARD': return '💳 Credit/Debit Card (Demo)';
            case 'MOCK_WALLET': return '📱 E-Wallet (Demo)';
            case 'COD': return '💵 Cash on Delivery';
            default: return method;
        }
    };

    const handlePayment = async () => {
        if (!selectedMethod || isSubmitting) return;

        setIsSubmitting(true);

        const paymentId = await processPayment(selectedMethod);

        if (paymentId) {
            const orderSuccess = await completeCheckout(paymentId);
            if (orderSuccess) {
                // Refresh cart to reflect removed items
                await refreshCart();
            }
        }

        setIsSubmitting(false);
    };

    return (
        <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Payment</Text>
            <Text style={styles.stepSubtitle}>Select your payment method</Text>

            {/* Price Change Modal */}
            <Modal
                visible={showPriceChangeModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>⚠️ Price Update Notice</Text>
                        <Text style={styles.modalText}>
                            Some prices have changed since you started checkout.
                            You will be charged the original locked prices.
                        </Text>
                        {priceChanges?.map((change, index) => (
                            <View key={index} style={styles.priceChangeItem}>
                                <Text style={styles.priceChangeName}>
                                    {change.productName} {change.variantName ? `(${change.variantName})` : ''}
                                </Text>
                                <View style={styles.priceChangeRow}>
                                    <Text style={styles.priceChangeOld}>Current: ₱{change.newPrice.toFixed(2)}</Text>
                                    <Text style={styles.priceChangeLocked}>Your price: ₱{change.oldPrice.toFixed(2)}</Text>
                                </View>
                            </View>
                        ))}
                        <Pressable
                            style={styles.modalButton}
                            onPress={() => setShowPriceChangeModal(false)}
                        >
                            <Text style={styles.modalButtonText}>I Understand</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <View style={styles.paymentMethods}>
                {paymentMethods.map((method) => (
                    <Pressable
                        key={method}
                        style={[
                            styles.paymentMethodCard,
                            selectedMethod === method && styles.paymentMethodCardSelected,
                        ]}
                        onPress={() => setSelectedMethod(method)}
                    >
                        <View style={[
                            styles.paymentMethodRadio,
                            selectedMethod === method && styles.paymentMethodRadioSelected,
                        ]}>
                            {selectedMethod === method && <View style={styles.paymentMethodRadioInner} />}
                        </View>
                        <Text style={styles.paymentMethodLabel}>{getMethodLabel(method)}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.orderSummaryCard}>
                <Text style={styles.orderSummaryTitle}>Order Total</Text>
                <Text style={styles.orderSummaryAmount}>₱{totalAmount.toFixed(2)}</Text>
            </View>

            {statusMessage && (
                <View style={styles.statusContainer}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.errorHint}>Please try again or use a different payment method.</Text>
                </View>
            )}

            <View style={styles.buttonRow}>
                <Pressable
                    style={styles.cancelButton}
                    onPress={() => setStep('shipping')}
                    disabled={isProcessing || isSubmitting}
                >
                    <Text style={styles.cancelButtonText}>Back</Text>
                </Pressable>
                <Pressable
                    style={[
                        styles.primaryButton,
                        styles.payButton,
                        (isProcessing || isSubmitting || !selectedMethod) && styles.disabledButton
                    ]}
                    onPress={handlePayment}
                    disabled={isProcessing || isSubmitting || !selectedMethod}
                >
                    {(isProcessing || isSubmitting) ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Pay ₱{totalAmount.toFixed(2)}</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
};

// Confirmation Step
const ConfirmationStep: React.FC = () => {
    const { orderId, totalAmount, resetCheckout } = useCheckout();
    const { user } = useAuth();
    const [showSellerPrompt, setShowSellerPrompt] = useState(false);
    const [showDismissConfirm, setShowDismissConfirm] = useState(false);

    // Check if we should show the seller prompt (only for non-sellers, one time)
    useEffect(() => {
        const checkSellerPrompt = async () => {
            // Only show for users who are not sellers and haven't dismissed before
            if (!user || user.role === 'SELLER' || user.role === 'ADMIN' || user.sellerId) {
                return;
            }

            try {
                const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                const dismissed = await AsyncStorage.getItem('sellerPromptDismissed');
                if (!dismissed) {
                    // Show prompt after a short delay for better UX
                    setTimeout(() => setShowSellerPrompt(true), 1500);
                }
            } catch (error) {
                console.error('Error checking seller prompt:', error);
            }
        };
        checkSellerPrompt();
    }, [user]);

    const handleDone = async () => {
        await resetCheckout();
        router.replace('/');
    };

    const handleViewOrder = async () => {
        await resetCheckout();
        router.replace('/profile/orders');
    };

    const handleBecomeSeller = async () => {
        setShowSellerPrompt(false);
        await resetCheckout();
        router.push('/seller/apply');
    };

    const handleDismissPrompt = () => {
        setShowDismissConfirm(true);
    };

    const handleConfirmDismiss = async () => {
        try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.setItem('sellerPromptDismissed', 'true');
        } catch (error) {
            console.error('Error saving dismiss preference:', error);
        }
        setShowDismissConfirm(false);
        setShowSellerPrompt(false);
    };

    const handleCancelDismiss = () => {
        setShowDismissConfirm(false);
    };

    return (
        <View style={styles.stepContent}>
            {/* Seller Promotion Modal */}
            <Modal
                visible={showSellerPrompt}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxWidth: 380 }]}>
                        {!showDismissConfirm ? (
                            <>
                                <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🧶✨</Text>
                                <Text style={[styles.modalTitle, { fontSize: 20, textAlign: 'center' }]}>
                                    Have a Talent for Crafting?
                                </Text>
                                <Text style={[styles.modalText, { textAlign: 'center', lineHeight: 22 }]}>
                                    Turn your passion into profit! Join our community of artisans and share your handmade creations with customers who appreciate quality craftsmanship.
                                </Text>
                                <View style={{ gap: 10, marginTop: 16 }}>
                                    <Pressable
                                        style={[styles.primaryButton, { backgroundColor: '#C88EA7' }]}
                                        onPress={handleBecomeSeller}
                                    >
                                        <Text style={styles.primaryButtonText}>🏪 Start Selling Today</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.cancelButton, { borderColor: '#ddd' }]}
                                        onPress={handleDismissPrompt}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: '#888' }]}>Maybe Later</Text>
                                    </Pressable>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🤔</Text>
                                <Text style={[styles.modalTitle, { fontSize: 18, textAlign: 'center' }]}>
                                    Are you sure?
                                </Text>
                                <Text style={[styles.modalText, { textAlign: 'center' }]}>
                                    You won't see this prompt again. You can contact customer support if you change your mind.
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                    <Pressable
                                        style={[styles.cancelButton, { flex: 1 }]}
                                        onPress={handleCancelDismiss}
                                    >
                                        <Text style={styles.cancelButtonText}>Go Back</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.primaryButton, { flex: 1, backgroundColor: '#666' }]}
                                        onPress={handleConfirmDismiss}
                                    >
                                        <Text style={styles.primaryButtonText}>I'm Sure</Text>
                                    </Pressable>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            <View style={styles.confirmationContainer}>
                <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                </View>
                <Text style={styles.confirmationTitle}>Order Placed!</Text>
                <Text style={styles.confirmationSubtitle}>Thank you for your purchase</Text>

                <View style={styles.orderDetailsCard}>
                    <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Order ID</Text>
                        <Text style={styles.orderDetailValue}>#{orderId}</Text>
                    </View>
                    <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Total Paid</Text>
                        <Text style={styles.orderDetailValue}>₱{totalAmount.toFixed(2)}</Text>
                    </View>
                </View>

                <Text style={styles.confirmationNote}>
                    A confirmation email has been sent to your registered email address.
                </Text>

                <View style={styles.confirmationButtons}>
                    <Pressable style={styles.viewOrderButton} onPress={handleViewOrder}>
                        <Text style={styles.viewOrderButtonText}>View Orders</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={handleDone}>
                        <Text style={styles.primaryButtonText}>Continue Shopping</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

// Main Checkout Content
const CheckoutContent: React.FC = () => {
    const { user } = useAuth();
    const { step, sessionId, isProcessing, initiateCheckout, cancelCheckout } = useCheckout();
    const params = useLocalSearchParams<{ items?: string }>();
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const init = async () => {
            if (!user) {
                router.replace('/auth');
                return;
            }

            // If no session exists, initialize from params
            if (!sessionId && params.items) {
                const itemIds = params.items.split(',').map(id => parseInt(id, 10));
                await initiateCheckout(user.uid, itemIds);
            }

            setIsInitializing(false);
        };
        init();
    }, [user, sessionId, params.items]);

    if (!user) {
        return (
            <View style={styles.centered}>
                <Text style={styles.messageText}>Please log in to checkout.</Text>
                <Pressable style={styles.loginButton} onPress={() => router.push('/auth')}>
                    <Text style={styles.loginButtonText}>Go to Login</Text>
                </Pressable>
            </View>
        );
    }

    if (isInitializing || (isProcessing && !sessionId)) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Setting up checkout...</Text>
            </View>
        );
    }

    if (!sessionId && step !== 'confirmation') {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorTextLarge}>Unable to start checkout</Text>
                <Text style={styles.messageText}>Please go back to cart and try again.</Text>
                <Pressable style={styles.loginButton} onPress={() => router.replace('/cart')}>
                    <Text style={styles.loginButtonText}>Back to Cart</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    style={styles.headerBackButton}
                    onPress={() => {
                        if (typeof window !== 'undefined') {
                            const confirmed = window.confirm('Are you sure you want to cancel checkout?');
                            if (confirmed) {
                                cancelCheckout();
                                router.replace('/cart');
                            }
                        }
                    }}
                >
                    <Text style={styles.headerBackText}>← Cancel</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Checkout</Text>
                <View style={{ width: 60 }} />
            </View>

            <StepIndicator currentStep={step} />

            {step === 'cart' && <CartReviewStep />}
            {step === 'shipping' && <ShippingStep />}
            {step === 'payment' && <PaymentStep />}
            {step === 'confirmation' && <ConfirmationStep />}
        </View>
    );
};

// Export wrapped with provider
export default function CheckoutPage() {
    return (
        <CheckoutProvider>
            <CheckoutContent />
        </CheckoutProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerBackButton: {
        padding: 8,
    },
    headerBackText: {
        fontSize: 16,
        color: '#6b7280',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        backgroundColor: 'white',
    },
    stepItem: {
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepCircleActive: {
        backgroundColor: '#8b5cf6',
    },
    stepCircleCompleted: {
        backgroundColor: '#10b981',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    stepNumberActive: {
        color: 'white',
    },
    stepCheckmark: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepLabel: {
        fontSize: 12,
        color: '#9ca3af',
    },
    stepLabelActive: {
        color: '#111827',
        fontWeight: '500',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: '#e5e7eb',
        marginHorizontal: 8,
        marginBottom: 20,
    },
    stepLineActive: {
        backgroundColor: '#10b981',
    },
    stepContent: {
        flex: 1,
        padding: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
    },
    itemsList: {
        flex: 1,
        marginBottom: 16,
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    itemImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    itemImagePlaceholder: {
        fontSize: 24,
    },
    itemInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    itemVariant: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    itemQuantity: {
        fontSize: 12,
        color: '#9ca3af',
    },
    itemPriceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    itemOriginalPrice: {
        fontSize: 12,
        color: '#9ca3af',
        textDecorationLine: 'line-through',
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10b981',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
    },
    primaryButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    payButton: {
        flex: 2,
    },
    disabledButton: {
        backgroundColor: '#d1d5db',
    },
    formGroup: {
        marginBottom: 16,
    },
    formRow: {
        flexDirection: 'row',
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    formInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    formInputError: {
        borderColor: '#ef4444',
    },
    fieldError: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    statusText: {
        fontSize: 16,
        color: '#6b7280',
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        padding: 16,
        borderRadius: 12,
        marginVertical: 12,
    },
    errorText: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: '500',
    },
    errorHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    errorTextLarge: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#dc2626',
        marginBottom: 8,
    },
    paymentMethods: {
        marginBottom: 24,
    },
    paymentMethodCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    paymentMethodCardSelected: {
        borderColor: '#8b5cf6',
        backgroundColor: '#faf5ff',
    },
    paymentMethodRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#d1d5db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paymentMethodRadioSelected: {
        borderColor: '#8b5cf6',
    },
    paymentMethodRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#8b5cf6',
    },
    paymentMethodLabel: {
        fontSize: 16,
        color: '#111827',
    },
    orderSummaryCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    orderSummaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    orderSummaryAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#10b981',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 16,
    },
    priceChangeItem: {
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    priceChangeName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400e',
        marginBottom: 4,
    },
    priceChangeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priceChangeOld: {
        fontSize: 12,
        color: '#b45309',
    },
    priceChangeLocked: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
    },
    modalButton: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 16,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmationContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successIconText: {
        fontSize: 40,
        color: 'white',
        fontWeight: 'bold',
    },
    confirmationTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    confirmationSubtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 32,
    },
    orderDetailsCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        width: '100%',
        marginBottom: 24,
    },
    orderDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    orderDetailLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    orderDetailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    confirmationNote: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 32,
    },
    confirmationButtons: {
        width: '100%',
        gap: 12,
    },
    viewOrderButton: {
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#8b5cf6',
        alignItems: 'center',
    },
    viewOrderButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8b5cf6',
    },
    messageText: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 16,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
        marginTop: 16,
    },
    loginButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
