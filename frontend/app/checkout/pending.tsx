import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { checkoutAPI } from '@/services/api';
import { Loader2, ArrowRight } from 'lucide-react-native';
import { Image } from 'react-native';

export default function PendingCheckoutScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { session_id } = useLocalSearchParams();
    const { user } = useAuth();
    
    const [status, setStatus] = useState<string>('Polling for payment confirmation...');
    const [error, setError] = useState<string | null>(null);
    const [sessionData, setSessionData] = useState<any>(null);
    const [showTimeoutHelp, setShowTimeoutHelp] = useState(false);

    // Animation for spinner
    const spinAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        ).start();
    }, [spinAnim]);

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    // Timeout for help link
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowTimeoutHelp(true);
        }, 15000);
        return () => clearTimeout(timer);
    }, []);

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
                    setSessionData(session);
                    
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
                        const method = processingPayment.gatewayMethod || processingPayment.method || 'payment';
                        setStatus(`Confirming your ${method} payment...`);
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
                        {/* Logo Mark */}
                        <View style={styles.logoContainer}>
                            <Image 
                                source={require('../../assets/yarn.png')} 
                                style={{ width: 40, height: 40, resizeMode: 'contain' }} 
                            />
                        </View>

                        {/* Animated Ring */}
                        <Animated.View style={{ transform: [{ rotate: spin }], marginVertical: 32 }}>
                            <Loader2 size={48} color={theme.colors.primary} strokeWidth={2} />
                        </Animated.View>

                        {/* Status */}
                        <Text style={styles.statusText}>{status}</Text>

                        {/* Details */}
                        {sessionData && (
                            <Text style={styles.detailsText}>
                                Checkout #{session_id} · ₱{Number(sessionData.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                        )}

                        {/* Informational Box */}
                        <View style={styles.infoBox}>
                            <Text style={styles.infoBoxText}>
                                This usually takes under a minute.{'\n'}
                                Please don't close this page — closing it won't cancel your payment, we're just waiting to hear back.
                            </Text>
                        </View>

                        {/* Timeout Help */}
                        <View style={{ height: 60, marginTop: 24, justifyContent: 'center' }}>
                            {showTimeoutHelp && (
                                <Animated.View style={{ opacity: 1 /* can add fade in */ }}>
                                    <Text style={styles.helpText}>Taking longer than expected?</Text>
                                    <Pressable 
                                        onPress={() => router.replace('/profile/orders' as any)}
                                        style={styles.helpLinkBtn}
                                    >
                                        <Text style={styles.helpLink}>Check order status</Text>
                                        <ArrowRight size={14} color={theme.colors.primary} />
                                    </Pressable>
                                </Animated.View>
                            )}
                        </View>
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
                        fontSize: 20,
                        fontWeight: '600',
                        color: theme.colors.text,
                        textAlign: 'center',
                        fontFamily: theme.typography.fontFamily,
                        marginBottom: 8,
                    },
                    detailsText: {
                        fontSize: 15,
                        color: theme.colors.textSecondary,
                        textAlign: 'center',
                        fontFamily: theme.typography.fontFamily,
                        marginBottom: 32,
                    },
                    infoBox: {
                        borderTopWidth: 1,
                        borderBottomWidth: 1,
                        borderColor: theme.colors.border,
                        paddingVertical: 16,
                        width: '100%',
                    },
                    infoBoxText: {
                        fontSize: 14,
                        lineHeight: 20,
                        color: theme.colors.textSecondary,
                        textAlign: 'center',
                        fontFamily: theme.typography.fontFamily,
                    },
                    logoContainer: {
                        width: 72,
                        height: 72,
                        borderRadius: 36,
                        backgroundColor: theme.colors.primaryLight + '20',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                    },
                    helpText: {
                        fontSize: 14,
                        color: theme.colors.textSecondary,
                        textAlign: 'center',
                        fontFamily: theme.typography.fontFamily,
                        marginBottom: 4,
                    },
                    helpLinkBtn: {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                    },
                    helpLink: {
                        fontSize: 15,
                        fontWeight: '600',
                        color: theme.colors.primary,
                        fontFamily: theme.typography.fontFamily,
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
