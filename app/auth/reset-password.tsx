import { authAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPasswordPage() {
    const { user, refreshUser } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call API to reset password
            // We need a new endpoint for "Force Reset" or just update profile
            // For MVP, we can use update profile if we add password support there, or dedicated endpoint.
            // Let's assume PUT /customers/profile supports password update

            await authAPI.updateProfile({ password: newPassword });

            // Refresh user to clear passwordResetRequired flag (backend should handle this)
            await refreshUser();

            Alert.alert("Success", "Password updated successfully!");
            router.replace('/');

        } catch (e: any) {
            console.error(e);
            setError(e.response?.data?.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                <View style={[styles.card, isDesktop ? { width: 400 } : { width: '90%' }]}>
                    <Text style={styles.title}>Reset Password Required</Text>
                    <Text style={styles.subtitle}>
                        For security reasons, please set a new password for your account.
                    </Text>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="New Password"
                        secureTextEntry
                    />

                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm Password"
                        secureTextEntry
                    />

                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                            loading && styles.buttonDisabled
                        ]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Set New Password</Text>}
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        alignSelf: 'flex-start',
        fontWeight: '600',
        marginBottom: 5,
        color: '#555',
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#fafafa',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    button: {
        width: '100%',
        backgroundColor: '#C88EA7',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
