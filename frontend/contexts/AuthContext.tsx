import api, { authAPI } from '@/api/api';
import { authEvents } from '@/utils/authEvents';
import type { AuthContextType, User } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RelativePathString, useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async (data: any, returnTo?: string) => { },
    register: async (data: any) => { },
    logout: async () => { },
    refreshUser: async () => { },
    loginWithGoogle: async (data: { token?: string, accessToken?: string }, returnTo?: string) => { },
    loginWithToken: async (token: string, returnTo?: string) => { },
    token: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        loadUser();

        // Subscribe to global auth events
        const unsubscribe = authEvents.subscribe((type) => {
            if (type === 'LOGOUT') {
                logout();
            }
        });

        return unsubscribe;
    }, []);

    // Frontend Route Guard
    useEffect(() => {
        if (!loading) {
            const inAuthGroup = segments[0] === 'auth';
            const isProtectedRoute = ['admin', 'checkout', 'profile', 'secure', 'seller', 'seller-dashboard', 'wishlist'].includes(segments[0]);

            if (!user && isProtectedRoute) {
                // Unauthenticated user trying to access a protected route
                const returnTo = encodeURIComponent('/' + segments.join('/'));
                router.replace(`/auth/login?returnTo=${returnTo}` as RelativePathString);
            } else if (user && inAuthGroup) {
                // Authenticated user trying to access auth screens (login/register)
                router.replace('/');
            }
        }
    }, [user, segments, loading]);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const userData = await AsyncStorage.getItem('authUser');

            if (token && userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setToken(token);
                if (parsedUser.passwordResetRequired) {
                    router.replace('/auth/reset-password' as RelativePathString);
                }
            }
        } catch (error) {
            console.error("Failed to load user", error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (data: any, returnTo?: string) => {
        try {
            const response = await authAPI.login(data);
            const { token, refreshToken, customer, data: legacyUser } = response.data;
            const user = customer || legacyUser;

            if (token && user) {
                await AsyncStorage.setItem('authToken', token);
                if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('authUser', JSON.stringify(user));
                setUser(user);
                setToken(token);

                if (user.passwordResetRequired) {
                    router.replace('/auth/reset-password' as RelativePathString);
                } else if (returnTo) {
                    router.replace(returnTo as RelativePathString);
                } else {
                    router.replace('/');
                }
            }
        } catch (error) {
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            const response = await authAPI.register(data);
            const { token, refreshToken, data: user, customer } = response.data;
            const finalUser = user || customer;

            if (token && finalUser) {
                await AsyncStorage.setItem('authToken', token);
                if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('authUser', JSON.stringify(finalUser));
                setUser(finalUser);
                setToken(token);
                router.replace('/');
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
                // Revoke refresh token server-side (best effort, don't block on failure)
                authAPI.logout(refreshToken).catch(() => {});
            }
        } catch (e) { /* ignore */ }
        await AsyncStorage.multiRemove(['authToken', 'authUser', 'refreshToken']);
        setUser(null);
        setToken(null);
        router.replace('/auth/login' as RelativePathString);
    };

    const refreshUser = async () => {
        try {
            const currentToken = await AsyncStorage.getItem('authToken');
            if (!currentToken) return;

            const response = await api.get('/customers/profile');
            const userData = response.data.data || response.data;
            const newToken = response.data.token;

            if (userData) {
                await AsyncStorage.setItem('authUser', JSON.stringify(userData));
                setUser(userData);
            }
            if (newToken) {
                await AsyncStorage.setItem('authToken', newToken);
                setToken(newToken);
            }
        } catch (error) {
            console.error("Failed to refresh user", error);
        }
    };

    const loginWithGoogle = async (data: { token?: string, accessToken?: string }, returnTo?: string) => {
        try {
            const response = await authAPI.loginWithGoogle(data);
            const { token: authToken, refreshToken, customer, data: legacyUser, isNewUser } = response.data;
            const user = customer || legacyUser;

            if (authToken && user) {
                await AsyncStorage.setItem('authToken', authToken);
                if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
                await AsyncStorage.setItem('authUser', JSON.stringify(user));
                setUser(user);
                setToken(authToken);

                if (user.passwordResetRequired) {
                    router.replace('/auth/reset-password' as RelativePathString);
                } else if (returnTo) {
                    router.replace(returnTo as RelativePathString);
                } else {
                    router.replace('/');
                }
            }
        } catch (error) {
            throw error;
        }
    };

    const loginWithToken = async (token: string, returnTo?: string) => {
        try {
            if (token) {
                await AsyncStorage.setItem('authToken', token);
                setToken(token);
                // We need to fetch the user profile now
                await refreshUser();

                // If refreshUser updates 'user' state, we can redirect.
                // Ideally refreshUser returns the user or we fetch it explicitly here.
                // Re-implementing fetch here for clarity/safety:

                const response = await api.get('/customers/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const userData = response.data.data || response.data;
                const newToken = response.data.token || token;

                if (userData) {
                    await AsyncStorage.setItem('authToken', newToken);
                    setToken(newToken);
                    await AsyncStorage.setItem('authUser', JSON.stringify(userData));
                    setUser(userData);
                    if (returnTo) {
                        router.replace(returnTo as RelativePathString);
                    } else {
                        router.replace('/');
                    }
                }
            }
        } catch (error) {
            console.error('Login with token error', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, loginWithGoogle, loginWithToken, token }}>
            {children}
        </AuthContext.Provider>
    );
};
