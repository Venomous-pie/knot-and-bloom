import api, { authAPI } from '@/api/api';
import type { AuthContextType, User } from '@/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RelativePathString, useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            const userData = await AsyncStorage.getItem('authUser');

            if (token && userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
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

    const login = async (data: any) => {
        try {
            const response = await authAPI.login(data);
            const { token, customer, data: legacyUser } = response.data;
            // Support both 'customer' key (from updated backend) and 'data' key (legacy or potential interceptor)
            const user = customer || legacyUser;

            if (token && user) {
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('authUser', JSON.stringify(user));
                setUser(user);

                if (user.passwordResetRequired) {
                    router.replace('/auth/reset-password' as RelativePathString);
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
            const { token, data: user, customer } = response.data;
            const finalUser = user || customer;

            if (token && finalUser) {
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('authUser', JSON.stringify(finalUser));
                setUser(finalUser);
                router.replace('/');
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('authUser');
        setUser(null);
        router.replace('/auth/login' as RelativePathString);
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/customers/profile');
            const userData = response.data;
            if (userData) {
                await AsyncStorage.setItem('authUser', JSON.stringify(userData));
                setUser(userData);
            }
        } catch (error) {
            console.error("Failed to refresh user", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// Default export required for expo-router
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
