import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function AuthSuccess() {
    const { code, token, error } = useLocalSearchParams<{ code: string, token: string, error: string }>();
    const { loginWithToken } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const exchangeCode = async () => {
            // Wait a moment to see if WebBrowser closes this window (shorter delay for web performance)
            await new Promise(resolve => setTimeout(resolve, 50));
            try {
                if (code) {
                    // Security: Exchange one-time auth code for JWT via POST
                    const response = await apiClient.post('/auth/exchange-code', { code });
                    if (response.data?.token) {
                        if (response.data.refreshToken) {
                            // Save refresh token before loginWithToken fetches profile
                            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                            await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
                        }
                        loginWithToken(response.data.token);
                    } else {
                        throw new Error('No token received');
                    }
                } else if (token) {
                    // Backwards compatibility: direct token (legacy flow)
                    loginWithToken(token);
                } else if (error) {
                    alert(`Login failed: ${error}`);
                    router.replace('/auth/login');
                }
            } catch (err) {
                console.error('Auth code exchange failed:', err);
                alert('Login failed. Please try again.');
                router.replace('/auth/login');
            }
        };

        exchangeCode();
    }, [code, token, error]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#333" />
            <Text style={styles.text}>Finalizing login...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: '#666'
    }
});
