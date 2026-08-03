import { apiClient } from './client';

export interface LockedPriceItem {
    itemUid: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    finalPrice: number;
    productName: string;
    variantName: string | null;
    image: string | null;
    sellerId: number | null;
    sellerName: string | null;
    sellerLocation: string | null;
}

export interface InitiateCheckoutResponse {
    success: boolean;
    sessionId: number;
    lockedPrices: LockedPriceItem[];
    totalAmount: number;
    subtotal?: number;
    platformFee?: number;
    expiresAt: string;
    message: string;
    isExisting?: boolean;
    sellerMetrics?: Record<number, { avgShipTimeHours: number; successRate: number }>;
    codInfo?: {
        allowed: boolean;
        depositPercent: number;
        disabledBy?: string[] | null;
        reason?: string | null;
    };
}

export interface CheckoutSessionResponse {
    success: boolean;
    session: {
        uid: number;
        status: string;
        lockedPrices: LockedPriceItem[];
        totalAmount: number;
        expiresAt: string;
    };
}

export interface ValidateCheckoutResponse {
    success: boolean;
    message: string;
    priceChanges?: Array<{
        productName: string;
        variantName: string | null;
        oldPrice: number;
        newPrice: number;
    }>;
    note?: string;
}

export interface PaymentResponse {
    success: boolean;
    paymentId?: number;
    gatewayRef?: string;
    message: string;
    error?: string;
    isExisting?: boolean;
}

export interface CompleteCheckoutResponse {
    success: boolean;
    orderId?: number;
    orderIds?: number[];
    message: string;
    isExisting?: boolean;
}

export const checkoutAPI = {
    initiate: (selectedItemIds: number[], idempotencyKey: string) =>
        apiClient.post<InitiateCheckoutResponse>('/checkout/initiate', {
            selectedItemIds,
            idempotencyKey,
        }),

    getSession: (sessionId: number) =>
        apiClient.get<CheckoutSessionResponse>(`/checkout/${sessionId}`),

    validate: (sessionId: number) =>
        apiClient.post<ValidateCheckoutResponse>(`/checkout/${sessionId}/validate`),

    pay: (sessionId: number, paymentMethod: string, idempotencyKey: string) =>
        apiClient.post<PaymentResponse>(`/checkout/${sessionId}/pay`, {
            paymentMethod,
            idempotencyKey,
        }),

    complete: (sessionId: number, paymentId: number, idempotencyKey: string, shippingInfo?: any, choices?: Record<string, string>) =>
        apiClient.post<CompleteCheckoutResponse>(`/checkout/${sessionId}/complete`, {
            paymentId,
            idempotencyKey,
            shippingAddress: shippingInfo,
            choices,
        }),

    estimateShipping: (sessionId: number, shippingAddress: any, choices: Record<string, string>) =>
        apiClient.post(`/checkout/${sessionId}/estimate-shipping`, {
            shippingAddress,
            choices,
        }),

    cancel: (sessionId: number) =>
        apiClient.delete(`/checkout/${sessionId}`),

    getPaymentMethods: () =>
        apiClient.get<{ success: boolean; methods: string[] }>('/checkout/methods/available'),
};
