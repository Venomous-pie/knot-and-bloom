import api, { authAPI, LoginPayload, RegisterPayload } from '@/services/api';
import { authEvents } from '@/utils/authEvents';
import type { AuthContextType, User } from '@/types/user';
import { RelativePathString, useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearSession, getAuthToken, getAuthUser, getRefreshToken, saveSession, isSessionPersisted } from '@/utils/tokenStore';

const PROTECTED_SEGMENTS = ['admin', 'checkout', 'profile', 'secure', 'cart', 'seller-dashboard', 'wishlist'];

function extractAuthUser(payload: any) {
    return payload.customer ?? payload.data;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async (data: LoginPayload, returnTo?: string, rememberMe?: boolean) => { },
    register: async (data: RegisterPayload) => { },
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
            const isProtectedRoute = PROTECTED_SEGMENTS.includes(segments[0]);

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
            const token = await getAuthToken();
            const userData = await getAuthUser();

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

    const login = async (data: LoginPayload, returnTo?: string, rememberMe: boolean = true) => {
        const response = await authAPI.login(data);
        const { token, refreshToken } = response.data;
        const user = extractAuthUser(response.data);

        if (!token || !user) {
            throw new Error('Unexpected login response shape');
        }

        await saveSession(token, JSON.stringify(user), refreshToken, rememberMe);
        setUser(user);
        setToken(token);

        if (user.passwordResetRequired) {
            router.replace('/auth/reset-password' as RelativePathString);
        } else if (returnTo) {
            router.replace(returnTo as RelativePathString);
        } else {
            router.replace('/');
        }
    };

    const register = async (data: RegisterPayload) => {
        const response = await authAPI.register(data);
        const { token, refreshToken } = response.data;
        const finalUser = extractAuthUser(response.data);

        if (!token || !finalUser) {
            throw new Error('Unexpected login response shape');
        }

        await saveSession(token, JSON.stringify(finalUser), refreshToken, true);
        setUser(finalUser);
        setToken(token);
        router.replace('/');
    };

    const logout = async () => {
        try {
            const refreshToken = await getRefreshToken();
            if (refreshToken) {
                authAPI.logout(refreshToken).catch((err) => {
                    if (__DEV__) console.warn('Logout request failed:', err);
                });
            }
        } catch (e) { /* ignore */ }
        await clearSession();
        setUser(null);
        setToken(null);
        router.replace('/auth/login' as RelativePathString);
    };

    const refreshUser = async () => {
        try {
            const currentToken = await getAuthToken();
            if (!currentToken) return;

            const response = await api.get('/users/profile');
            const userData = response.data.data || response.data;
            const newToken = response.data.token;

            if (userData) {
                const currentRefreshToken = await getRefreshToken();
                // Preserve the tier: persisted if AsyncStorage has a token, memory otherwise
                const isPersistedSession = await isSessionPersisted();
                await saveSession(
                    newToken || currentToken,
                    JSON.stringify(userData),
                    currentRefreshToken ?? undefined,
                    isPersistedSession,
                );
                setUser(userData);
                if (newToken) setToken(newToken);
            }
        } catch (error) {
            console.error("Failed to refresh user", error);
        }
    };

    const loginWithGoogle = async (data: { token?: string, accessToken?: string }, returnTo?: string) => {
        const response = await authAPI.loginWithGoogle(data);
        const { token: authToken, refreshToken } = response.data;
        const user = extractAuthUser(response.data);

        if (!authToken || !user) {
            throw new Error('Unexpected login response shape');
        }

        // Google sign-in always persists (user explicitly chose an account)
        await saveSession(authToken, JSON.stringify(user), refreshToken, true);
        setUser(user);
        setToken(authToken);

        if (user.passwordResetRequired) {
            router.replace('/auth/reset-password' as RelativePathString);
        } else if (returnTo) {
            router.replace(returnTo as RelativePathString);
        } else {
            router.replace('/');
        }
    };

    const loginWithToken = async (token: string, returnTo?: string) => {
        try {
            if (token) {
                // Fetch the user profile directly with the given token
                const response = await api.get('/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const userData = extractAuthUser(response.data) || response.data.data || response.data;
                const newToken = response.data.token || token;
                const newRefreshToken = response.data.refreshToken;

                if (!userData) {
                    throw new Error('Unexpected login response shape');
                }

                await saveSession(newToken, JSON.stringify(userData), newRefreshToken, true);
                setUser(userData);
                setToken(newToken);
                
                if (returnTo) {
                    router.replace(returnTo as RelativePathString);
                } else {
                    router.replace('/');
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
