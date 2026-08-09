import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutAPI } from '@/services/api';

export default function PendingCheckoutScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { session_id } = useLocalSearchParams();
    const { user } = useAuth();
    
    const [status, setStatus] = useState<string>('Polling for payment confirmation...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!session_id || !user) return;

        let interval: any;
        let attempts = 0;
        const maxAttempts = 60; // Poll for 3 minutes (every 3 seconds)

        const pollStatus = async () => {
            try {
                const res = await checkoutAPI.getSession(Number(session_id));
                const session: any = res.data.session;
                
                if (session) {
                    const isCompleted = session.status === 'COMPLETED';
                    const hasSuccessfulPayment = session.payments?.some((p: any) => p.status === 'SUCCEEDED');

                    if (isCompleted || hasSuccessfulPayment) {
                        setStatus('Payment confirmed! Creating your orders...');
                        clearInterval(interval);
                        
                        // Give it a brief delay before redirecting to success
                        setTimeout(() => {
                            router.replace('/checkout/success' as any);
                        }, 1500);
                        return;
                    }

                    if (session.status === 'EXPIRED' || session.status === 'FAILED') {
                        clearInterval(interval);
                        setError('Your checkout session has expired or failed.');
                        return;
                    }

                    // For PayMongo processing
                    const processingPayment = session.payments?.find((p: any) => p.status === 'PROCESSING' || p.status === 'PENDING');
                    if (processingPayment) {
                        setStatus('Waiting for payment provider confirmation...');
                    }
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    setError('Payment confirmation is taking longer than expected. Please check your orders page later.');
                }
            } catch (err) {
                console.error('Error polling session status:', err);
            }
        };

        // Start polling
        pollStatus(); // initial check
        interval = setInterval(pollStatus, 3000);

        return () => clearInterval(interval);
    }, [session_id, user, router]);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.card}>
                {error ? (
                    <>
                        <Text style={styles.errorText}>{error}</Text>
                        <Text style={styles.linkText} onPress={() => router.replace('/cart' as any)}>
                            Return to Cart
                        </Text>
                    </>
                ) : (
                    <>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.statusText}>{status}</Text>
                        <Text style={styles.subText}>Please do not close this page.</Text>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        width: '100%',
        maxWidth: 400,
    },
    statusText: {
        marginTop: 24,
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        textAlign: 'center',
    },
    subText: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.error,
        textAlign: 'center',
        marginBottom: 24,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary,
    },
});
