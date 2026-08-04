import { apiClient } from './client';

export type PaymentMethodType = 'GCASH' | 'PAYMAYA' | 'BANK';

export interface PaymentMethod {
    uid: number;
    type: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    bankName?: string | null;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentMethodInput {
    type: PaymentMethodType;
    accountName: string;
    accountNumber: string;
    bankName?: string;
    isDefault?: boolean;
}

export const paymentMethodAPI = {
    getPaymentMethods: () =>
        apiClient.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods/me'),
    createPaymentMethod: (data: PaymentMethodInput) =>
        apiClient.post<{ paymentMethod: PaymentMethod }>('/payment-methods/me', data),
    updatePaymentMethod: (id: number, data: Partial<PaymentMethodInput>) =>
        apiClient.put<{ paymentMethod: PaymentMethod }>(`/payment-methods/me/${id}`, data),
    deletePaymentMethod: (id: number) =>
        apiClient.delete<{ success: boolean }>(`/payment-methods/me/${id}`),
    setDefaultPaymentMethod: (id: number) =>
        apiClient.patch<{ paymentMethod: PaymentMethod }>(`/payment-methods/me/${id}/default`),
};
