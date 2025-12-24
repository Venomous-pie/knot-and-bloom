import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/app/auth';

export default function AuthSuccess() {
    const { token, error } = useLocalSearchParams<{ token: string, error: string }>();
    const { loginWithToken } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (token) {
            loginWithToken(token);
        } else if (error) {
            // Handle error display
            alert(`Login failed: ${error}`);
            router.replace('/auth/login');
        }
    }, [token, error]);

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
