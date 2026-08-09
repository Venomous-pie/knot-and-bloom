import { apiClient } from './client';

export interface LoginPayload {
    email?: string;
    password?: string;
    [key: string]: any;
}

export interface RegisterPayload {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
}

export const authAPI = {
    login: (data: LoginPayload) => apiClient.post('/users/login', data),
    loginWithGoogle: (data: { token?: string, accessToken?: string }) => apiClient.post('/users/login/google', data),
    register: (data: RegisterPayload) => apiClient.post('/users/register', data),
    sendOTP: (target: string) => apiClient.post('/auth/send-otp', { target }),
    exchangeCode: (code: string) => apiClient.post<{ success: boolean; token: string }>('/auth/exchange-code', { code }),
    refreshToken: (refreshToken: string) => apiClient.post<{ success: boolean; token: string; refreshToken: string }>('/auth/refresh', { refreshToken }),
    logout: (refreshToken?: string) => apiClient.post('/auth/logout', { refreshToken }),
};
