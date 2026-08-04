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
    subtotal: number;
    platformFee: number;
    expiresAt: string | null;
    shippingInfo: ShippingInfo | null;
    selectedPaymentMethod: string | null;
    paymentId: number | null;
    orderId: number | null; // Keep for legacy, but prefer orderIds
    orderIds?: number[] | null;
    isProcessing: boolean;
    error: string | null;
    statusMessage: string | null;
    priceChanges: Array<{
        productName: string;
        variantName: string | null;
        oldPrice: number;
        newPrice: number;
    }> | null;
    sellerMetrics: Record<number, { avgShipTimeHours: number; successRate: number }> | null;
    codInfo: {
        allowed: boolean;
        depositPercent: number;
        disabledBy?: string[] | null;
        reason?: string | null;
    } | null;
    choices: Record<number, string>;
    shippingEstimates: Record<number, any> | null;
}

interface CheckoutContextType extends CheckoutState {
    initiateCheckout: (selectedItemIds: number[]) => Promise<boolean>;
    setShippingInfo: (info: ShippingInfo) => void;
    validateAndProceedToPayment: () => Promise<boolean>;
    processPayment: (paymentMethod: string) => Promise<number | null>;
    completeCheckout: (paymentIdOverride?: number, shippingInfoOverride?: ShippingInfo) => Promise<boolean>;
    cancelCheckout: () => Promise<void>;
    setStep: (step: CheckoutStep) => void;
    clearError: () => void;
    resetCheckout: () => void;
    setChoices: (choices: Record<number, string>) => void;
    estimateShipping: (address: any) => Promise<void>;
}

const initialState: CheckoutState = {
    step: 'cart',
    sessionId: null,
    lockedPrices: [],
    totalAmount: 0,
    subtotal: 0,
    platformFee: 0,
    expiresAt: null,
    shippingInfo: null,
    selectedPaymentMethod: null,
    paymentId: null,
    orderId: null,
    orderIds: null,
    isProcessing: false,
    error: null,
    statusMessage: null,
    priceChanges: null,
    sellerMetrics: null,
    codInfo: null,
    choices: {},
    shippingEstimates: null,
};

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<CheckoutState>(initialState);
    const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');
    const [paymentIdempotencyKey, setPaymentIdempotencyKey] = useState<string>('');
    const [completeIdempotencyKey, setCompleteIdempotencyKey] = useState<string>('');

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
                            isProcessing: false,
                            statusMessage: null,
                            error: null,
                        }));
                        setCheckoutIdempotencyKey(parsed.idempotencyKey || generateIdempotencyKey());
                        setPaymentIdempotencyKey(parsed.paymentIdempotencyKey || generateIdempotencyKey());
                        setCompleteIdempotencyKey(parsed.completeIdempotencyKey || generateIdempotencyKey());
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
                // Strip transient UI state from being persisted to prevent being stuck on reload
                const { isProcessing, statusMessage, error, ...stateToSave } = state;
                
                await AsyncStorage.setItem('checkoutSession', JSON.stringify({
                    ...stateToSave,
                    idempotencyKey: checkoutIdempotencyKey,
                    paymentIdempotencyKey: paymentIdempotencyKey,
                    completeIdempotencyKey: completeIdempotencyKey,
                }));
            }
        };
        saveSession();
    }, [state, checkoutIdempotencyKey, paymentIdempotencyKey, completeIdempotencyKey]);

    const setStep = useCallback((step: CheckoutStep) => {
        setState(prev => ({ ...prev, step, error: null }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const setChoices = useCallback((newChoices: Record<number, string>) => {
        setState(prev => ({ ...prev, choices: { ...prev.choices, ...newChoices } }));
    }, []);

    const estimateShipping = useCallback(async (address: any) => {
        if (!state.sessionId) return;
        try {
            // Always request DELIVERY estimates (by passing empty choices) so the frontend 
            // always has the delivery fee to fall back to if the user toggles back from PICKUP.
            // Note: This intentionally ignores user's actual choices (e.g., PICKUP selection).
            const response = await checkoutAPI.estimateShipping(state.sessionId, address, {});
            if (response.data.success) {
                setState(prev => ({ ...prev, shippingEstimates: response.data.estimates, error: null }));
            }
        } catch (error: any) {
            console.error('Error estimating shipping', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to estimate shipping';
            setState(prev => ({ ...prev, error: errorMessage }));
        }
    }, [state.sessionId]);

    const resetCheckout = useCallback(async () => {
        await AsyncStorage.removeItem('checkoutSession');
        setState(initialState);
        setCheckoutIdempotencyKey('');
        setPaymentIdempotencyKey('');
        setCompleteIdempotencyKey('');
    }, []);

    const initiateCheckout = useCallback(async (selectedItemIds: number[]): Promise<boolean> => {
        try {
            // Reset to initialState to prevent old session data from bleeding through
            setState({
                ...initialState,
                isProcessing: true,
                statusMessage: 'Validating cart...',
            });

            const key = generateIdempotencyKey();
            setCheckoutIdempotencyKey(key);
            setCompleteIdempotencyKey(generateIdempotencyKey());

            const response = await checkoutAPI.initiate(selectedItemIds, key);
            const data = response.data;

            if (data.success) {
                setState(prev => ({
                    ...prev,
                    sessionId: data.sessionId,
                    lockedPrices: data.lockedPrices,
                    totalAmount: data.totalAmount,
                    subtotal: data.subtotal || data.totalAmount,
                    platformFee: data.platformFee || 0,
                    expiresAt: data.expiresAt,
                    sellerMetrics: data.sellerMetrics || null,
                    codInfo: data.codInfo || null, // NEW
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
            // Clear old session from storage on failure to prevent stale data resurrecting
            await AsyncStorage.removeItem('checkoutSession');
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

    const completeCheckout = useCallback(async (paymentIdOverride?: number, shippingInfoOverride?: ShippingInfo): Promise<boolean> => {
        const paymentIdToUse = paymentIdOverride ?? state.paymentId;
        const shippingInfoToUse = shippingInfoOverride ?? state.shippingInfo;

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

            // Convert string keys to proper structure if needed, or just pass choices
            const stringifiedChoices: Record<string, string> = {};
            for (const [k, v] of Object.entries(state.choices)) {
                stringifiedChoices[k.toString()] = v;
            }

            const response = await checkoutAPI.complete(
                state.sessionId, 
                paymentIdToUse, 
                completeIdempotencyKey || generateIdempotencyKey(),
                shippingInfoToUse, 
                stringifiedChoices
            );
            const data = response.data;

            if (data.success && (data.orderId != null || data.orderIds != null)) {
                setState(prev => ({
                    ...prev,
                    orderId: data.orderId ?? (data.orderIds ? data.orderIds[0] : null),
                    orderIds: data.orderIds ?? (data.orderId != null ? [data.orderId] : []),
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
    }, [state.sessionId, state.paymentId, state.shippingInfo]);

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
                setChoices,
                estimateShipping,
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
