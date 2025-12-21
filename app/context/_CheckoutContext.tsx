import { checkoutAPI, LockedPriceItem } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

// Generate a unique idempotency key
const generateIdempotencyKey = (): string => {
    return `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

export interface ShippingInfo {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    notes?: string;
}

export interface CheckoutState {
    step: CheckoutStep;
    sessionId: number | null;
    lockedPrices: LockedPriceItem[];
    totalAmount: number;
    expiresAt: string | null;
    shippingInfo: ShippingInfo | null;
    selectedPaymentMethod: string | null;
    paymentId: number | null;
    orderId: number | null;
    isProcessing: boolean;
    error: string | null;
    statusMessage: string | null;
    priceChanges: Array<{
        productName: string;
        variantName: string | null;
        oldPrice: number;
        newPrice: number;
    }> | null;
}

interface CheckoutContextType extends CheckoutState {
    initiateCheckout: (customerId: number, selectedItemIds: number[]) => Promise<boolean>;
    setShippingInfo: (info: ShippingInfo) => void;
    validateAndProceedToPayment: () => Promise<boolean>;
    processPayment: (paymentMethod: string) => Promise<number | null>;
    completeCheckout: (paymentIdOverride?: number) => Promise<boolean>;
    cancelCheckout: () => Promise<void>;
    setStep: (step: CheckoutStep) => void;
    clearError: () => void;
    resetCheckout: () => void;
}

const initialState: CheckoutState = {
    step: 'cart',
    sessionId: null,
    lockedPrices: [],
    totalAmount: 0,
    expiresAt: null,
    shippingInfo: null,
    selectedPaymentMethod: null,
    paymentId: null,
    orderId: null,
    isProcessing: false,
    error: null,
    statusMessage: null,
    priceChanges: null,
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<CheckoutState>(initialState);
    const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');
    const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState<string>('');

    // Restore session from storage on mount
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const savedSession = await AsyncStorage.getItem('checkoutSession');
                if (savedSession) {
                    const parsed = JSON.parse(savedSession);

                    // Check if session is still valid
                    if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
                        setState(prev => ({
                            ...prev,
                            ...parsed,
                        }));
                        setCheckoutIdempotencyKey(parsed.idempotencyKey || generateIdempotencyKey());
                    } else {
                        // Clear expired session
                        await AsyncStorage.removeItem('checkoutSession');
                    }
                }
            } catch (error) {
                console.error('Error restoring checkout session:', error);
            }
        };
        restoreSession();
    }, []);

    // Persist session to storage on state change
    useEffect(() => {
        const saveSession = async () => {
            if (state.sessionId) {
                await AsyncStorage.setItem('checkoutSession', JSON.stringify({
                    ...state,
                    idempotencyKey: checkoutIdempotencyKey,
                }));
            }
        };
        saveSession();
    }, [state, checkoutIdempotencyKey]);

    const setStep = useCallback((step: CheckoutStep) => {
        setState(prev => ({ ...prev, step, error: null }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const resetCheckout = useCallback(async () => {
        await AsyncStorage.removeItem('checkoutSession');
        setState(initialState);
        setCheckoutIdempotencyKey('');
        setPaymentIdempotencyKey('');
    }, []);

    const initiateCheckout = useCallback(async (customerId: number, selectedItemIds: number[]): Promise<boolean> => {
        try {
            setState(prev => ({
                ...prev,
                isProcessing: true,
                statusMessage: 'Validating cart...',
                error: null,
            }));

            const key = generateIdempotencyKey();
            setCheckoutIdempotencyKey(key);

            const response = await checkoutAPI.initiate(customerId, selectedItemIds, key);
            const data = response.data;

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    sessionId: data.sessionId,
                    lockedPrices: data.lockedPrices,
                    totalAmount: data.totalAmount,
                    expiresAt: data.expiresAt,
                    step: 'shipping',
                    isProcessing: false,
                    statusMessage: null,
                }));
                return true;
            } else {
                throw new Error('Failed to initiate checkout');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to start checkout';
            setState(prev => ({
                ...prev,
                isProcessing: false,
                statusMessage: null,
                error: errorMessage,
            }));
            return false;
        }
    }, []);

    const setShippingInfo = useCallback((info: ShippingInfo) => {
        setState(prev => ({
            ...prev,
            shippingInfo: info,
        }));
    }, []);

    const validateAndProceedToPayment = useCallback(async (): Promise<boolean> => {
        if (!state.sessionId) {
            setState(prev => ({ ...prev, error: 'No active checkout session' }));
            return false;
        }

        try {
            setState(prev => ({
                ...prev,
                isProcessing: true,
                statusMessage: 'Validating stock availability...',
                error: null,
            }));

            const response = await checkoutAPI.validate(state.sessionId);
            const data = response.data;

            if (data.success) {
                // Generate new payment idempotency key
                setPaymentIdempotencyKey(generateIdempotencyKey());

                setState(prev => ({
                    ...prev,
                    step: 'payment',
                    priceChanges: data.priceChanges || null,
                    isProcessing: false,
                    statusMessage: null,
                }));
                return true;
            } else {
                throw new Error('Validation failed');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Validation failed';
            setState(prev => ({
                ...prev,
                isProcessing: false,
                statusMessage: null,
                error: errorMessage,
            }));
            return false;
        }
    }, [state.sessionId]);

    const processPayment = useCallback(async (paymentMethod: string): Promise<number | null> => {
        if (!state.sessionId) {
            setState(prev => ({ ...prev, error: 'No active checkout session' }));
            return null;
        }

        try {
            setState(prev => ({
                ...prev,
                selectedPaymentMethod: paymentMethod,
                isProcessing: true,
                statusMessage: 'Processing payment...',
                error: null,
            }));

            const response = await checkoutAPI.pay(
                state.sessionId,
                paymentMethod,
                paymentIdempotencyKey || generateIdempotencyKey()
            );
            const data = response.data;

            if (data.success && data.paymentId) {
                setState(prev => ({
                    ...prev,
                    paymentId: data.paymentId!,
                    isProcessing: false,
                    statusMessage: null,
                }));
                return data.paymentId;
            } else {
                throw new Error(data.message || 'Payment failed');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Payment failed';
            setState(prev => ({
                ...prev,
                isProcessing: false,
                statusMessage: null,
                error: errorMessage,
            }));
            return null;
        }
    }, [state.sessionId, paymentIdempotencyKey]);

    const completeCheckout = useCallback(async (paymentIdOverride?: number): Promise<boolean> => {
        const paymentIdToUse = paymentIdOverride ?? state.paymentId;

        if (!state.sessionId || !paymentIdToUse) {
            setState(prev => ({ ...prev, error: 'Missing session or payment information' }));
            return false;
        }

        try {
            setState(prev => ({
                ...prev,
                isProcessing: true,
                statusMessage: 'Creating order...',
                error: null,
            }));

            const response = await checkoutAPI.complete(state.sessionId, paymentIdToUse);
            const data = response.data;

            if (data.success && data.orderId) {
                setState(prev => ({
                    ...prev,
                    orderId: data.orderId!,
                    step: 'confirmation',
                    isProcessing: false,
                    statusMessage: null,
                }));

                // Clear persisted session
                await AsyncStorage.removeItem('checkoutSession');

                return true;
            } else {
                throw new Error(data.message || 'Failed to complete order');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to complete order';
            setState(prev => ({
                ...prev,
                isProcessing: false,
                statusMessage: null,
                error: errorMessage,
            }));
            return false;
        }
    }, [state.sessionId, state.paymentId]);

    const cancelCheckout = useCallback(async () => {
        if (state.sessionId) {
            try {
                await checkoutAPI.cancel(state.sessionId);
            } catch (error) {
                console.error('Error cancelling checkout:', error);
            }
        }
        await resetCheckout();
    }, [state.sessionId, resetCheckout]);

    return (
        <CheckoutContext.Provider
            value={{
                ...state,
                initiateCheckout,
                setShippingInfo,
                validateAndProceedToPayment,
                processPayment,
                completeCheckout,
                cancelCheckout,
                setStep,
                clearError,
                resetCheckout,
            }}
        >
            {children}
        </CheckoutContext.Provider>
    );
};

export const useCheckout = (): CheckoutContextType => {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckout must be used within a CheckoutProvider');
    }
    return context;
};
