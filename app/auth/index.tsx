import { authAPI } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RelativePathString, useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, AuthContextType } from '@/types/user';

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: async () => { },
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
                setUser(JSON.parse(userData));
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
            const { token, data: user } = response.data;

            if (token && user) {
                await AsyncStorage.setItem('authToken', token);
                await AsyncStorage.setItem('authUser', JSON.stringify(user));
                setUser(user);
                router.replace('/');
            }
        } catch (error) {
            throw error;
        }
    };

    const register = async (data: any) => {
        try {
            await authAPI.register(data);
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

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
