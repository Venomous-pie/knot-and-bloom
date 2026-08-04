import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authEvents } from '@/utils/authEvents';
import { getAuthToken, getRefreshToken, updateTokens, clearSession } from '@/utils/tokenStore';

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api`;

const api: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await getAuthToken();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            if (__DEV__) {
                console.error('Error retrieving token', error);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response) {
            if (__DEV__) {
                console.error('API Error:', error.response.status, error.response.data);
            }

            if (error.response.status === 401 && !originalRequest._retry) {
                const requestUrl = originalRequest?.url || '';
                const isAuthEndpoint = ['/users/login', '/users/register', '/users/login/google', '/auth/refresh'].some(
                    endpoint => requestUrl.includes(endpoint)
                );

                if (!isAuthEndpoint) {
                    if (isRefreshing) {
                        return new Promise((resolve, reject) => {
                            failedQueue.push({ resolve, reject });
                        }).then(token => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            return api(originalRequest);
                        }).catch(err => Promise.reject(err));
                    }

                    originalRequest._retry = true;
                    isRefreshing = true;

                    try {
                        const refreshToken = await getRefreshToken();
                        if (refreshToken) {
                            const response = await api.post('/auth/refresh', { refreshToken });
                            const { token: newToken, refreshToken: newRefreshToken } = response.data;

                            await updateTokens(newToken, newRefreshToken);

                            processQueue(null, newToken);
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                            return api(originalRequest);
                        } else {
                            processQueue(new Error('No refresh token'), null);
                        }
                    } catch (refreshError) {
                        processQueue(refreshError, null);
                        await clearSession();
                    } finally {
                        isRefreshing = false;
                    }

                    const errorMessage = error.response.data?.error || 'Session expired';
                    authEvents.emit('ERROR', { message: errorMessage });
                    authEvents.emit('LOGOUT');
                }
            }
        } else if (error.request) {
            if (__DEV__) {
                console.error('Network Error:', error.message);
            }
        } else {
            if (__DEV__) {
                console.error('Request Error:', error.message);
            }
        }
        return Promise.reject(error);
    }
);

export const apiClient = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.get<T>(url, config);
    },
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.post<T>(url, data, config);
    },
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.put<T>(url, data, config);
    },
    patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.patch<T>(url, data, config);
    },
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        return api.delete<T>(url, config);
    },
};

export default api;
