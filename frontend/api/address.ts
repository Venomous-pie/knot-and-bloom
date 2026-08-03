import { apiClient } from './client';

export interface Address {
    uid: number;
    label?: string | null;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string | null;
    region?: string | null;
    province?: string | null;
    city: string;
    barangay?: string | null;
    stateProvince?: string | null;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AddressInput {
    label?: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string;
    region?: string;
    province?: string;
    city: string;
    barangay?: string;
    stateProvince?: string;
    postalCode: string;
    country?: string;
    isDefault?: boolean;
}

export const addressAPI = {
    getAddresses: () =>
        apiClient.get<{ addresses: Address[] }>('/addresses/me'),

    createAddress: (data: AddressInput) =>
        apiClient.post<{ address: Address }>('/addresses/me', data),

    updateAddress: (addressId: number, data: Partial<AddressInput>) =>
        apiClient.put<{ address: Address }>(`/addresses/me/${addressId}`, data),

    deleteAddress: (addressId: number) =>
        apiClient.delete<{ success: boolean }>(`/addresses/me/${addressId}`),

    setDefaultAddress: (addressId: number) =>
        apiClient.patch<{ address: Address }>(`/addresses/me/${addressId}/default`),
};
