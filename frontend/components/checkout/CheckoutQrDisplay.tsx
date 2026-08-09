import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, SafeAreaView, Pressable, Image, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { checkoutAPI } from '@/services/api';
import { useRouter } from 'expo-router';

interface CheckoutQrDisplayProps {
    visible: boolean;
    imageUrl: string | null;
    expiresAt: string | null;
    sessionId: number | null;
    onClose: () => void;
    onGenerateNew: () => void;
}

export function CheckoutQrDisplay({ visible, imageUrl, expiresAt, sessionId, onClose, onGenerateNew }: CheckoutQrDisplayProps) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);
    const [paymentDetected, setPaymentDetected] = useState(false);
    const router = useRouter();
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Countdown Timer
    useEffect(() => {
        if (!visible || !expiresAt) return;

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const expirationTime = new Date(expiresAt).getTime();
            const difference = expirationTime - now;

            if (difference > 0) {
                setTimeLeft(Math.floor(difference / 1000));
                setIsExpired(false);
            } else {
                setTimeLeft(0);
                setIsExpired(true);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [visible, expiresAt]);

    // Polling
    useEffect(() => {
        if (!visible || !sessionId || isExpired || paymentDetected) return;

        const pollStatus = async () => {
            try {
                const response = await checkoutAPI.getSession(sessionId, true);
                if (response.data.success) {
                    const session = response.data.session;
                    
                    // If session status is no longer awaiting payment/processing, or payments array shows success
                    // getSession actually talks to PayMongo for active payments in the backend.
                    if (session.status === 'COMPLETED') {
                        setPaymentDetected(true);
                        // Short delay before redirect
                        setTimeout(() => {
                            onClose();
                            router.replace('/checkout/success' as any);
                        }, 1500);
                    } else if (session.status === 'FAILED') {
                        Alert.alert('Payment Failed', 'The payment was not successful. Please try again.');
                        onClose();
                    } else {
                        // Check if payment detected but order not yet created
                        const hasSucceededPayment = (session as any).payments?.some((p: any) => p.status === 'SUCCEEDED');
                        if (hasSucceededPayment) {
                            setPaymentDetected(true);
                            setTimeout(() => {
                                onClose();
                                router.replace('/checkout/success' as any);
                            }, 1500);
                        }
                    }
                }
            } catch (e) {
                console.error('Error polling session status', e);
            }
        };

        pollTimerRef.current = setInterval(pollStatus, 4000);

        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [visible, sessionId, isExpired, paymentDetected, onClose, router]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!visible) return null;

    return (
        <Modal transparent={false} visible={visible} animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={theme.colors.text} />
                    </Pressable>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>Scan to Pay</Text>
                    <Text style={styles.subtitle}>Open your GCash or Maya app and scan this QR Ph code to complete your deposit.</Text>

                    {paymentDetected ? (
                        <View style={styles.detectedContainer}>
                            <Ionicons name="checkmark-circle" size={64} color={theme.colors.primary} />
                            <Text style={styles.detectedTitle}>Payment detected!</Text>
                            <Text style={styles.detectedSubtitle}>Confirming your order...</Text>
                        </View>
                    ) : (
                        <View style={styles.qrContainer}>
                            {imageUrl ? (
                                <Image 
                                    source={{ uri: imageUrl }} 
                                    style={[styles.qrImage, isExpired && { opacity: 0.3 }]} 
                                />
                            ) : (
                                <View style={styles.qrPlaceholder}>
                                    <Text style={{ color: theme.colors.textSecondary }}>Loading QR...</Text>
                                </View>
                            )}
                            
                            {isExpired && (
                                <View style={styles.expiredOverlay}>
                                    <Text style={styles.expiredText}>Code Expired</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {!paymentDetected && (
                        <View style={styles.timerContainer}>
                            {isExpired ? (
                                <>
                                    <Text style={styles.timerWarning}>This QR code has expired.</Text>
                                    <Pressable style={styles.btnPrimary} onPress={onGenerateNew}>
                                        <Text style={styles.btnPrimaryText}>Generate New Code</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <Text style={styles.timerText}>
                                    Code expires in <Text style={{ fontWeight: '700', color: theme.colors.primary }}>{formatTime(timeLeft)}</Text>
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
    },
    closeBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 12,
        fontFamily: theme.typography.fontFamily,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
        fontFamily: theme.typography.fontFamily,
    },
    qrContainer: {
        width: 260,
        height: 260,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    qrImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    qrPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expiredOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    expiredText: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
    },
    timerContainer: {
        marginTop: 40,
        alignItems: 'center',
        width: '100%',
    },
    timerText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    timerWarning: {
        fontSize: 16,
        color: theme.colors.error,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 20,
    },
    btnPrimary: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.full,
        width: '100%',
        alignItems: 'center',
    },
    btnPrimaryText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    detectedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    detectedTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 8,
    },
    detectedSubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    }
});
