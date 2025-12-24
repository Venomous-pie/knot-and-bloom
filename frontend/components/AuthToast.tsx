import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, X } from 'lucide-react-native';
import { Pressable } from 'react-native';

// Event emitter for auth errors
type AuthErrorListener = (message: string) => void;
const listeners: Set<AuthErrorListener> = new Set();

export const authErrorEmitter = {
    emit: (message: string) => {
        listeners.forEach(listener => listener(message));
    },
    subscribe: (listener: AuthErrorListener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
};

// Map backend errors to user-friendly messages
const getAuthErrorMessage = (error: string): string => {
    const errorLower = error.toLowerCase();

    if (errorLower.includes('expired')) {
        return 'Your session has expired. Please log in again.';
    }
    if (errorLower.includes('no token') || errorLower.includes('not authenticated')) {
        return 'Please log in to continue.';
    }
    if (errorLower.includes('invalid token') || errorLower.includes('invalid format')) {
        return 'Session error. Please log in again.';
    }
    if (errorLower.includes('insufficient permissions') || errorLower.includes('forbidden')) {
        return 'You don\'t have permission to access this resource.';
    }

    // Default message
    return 'Authentication error. Please log in again.';
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    toast: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        maxWidth: 450,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        backgroundColor: '#FEE2E2',
        borderRadius: 20,
        padding: 8,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: '#991B1B',
        fontFamily: 'Quicksand',
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        color: '#B91C1C',
        fontFamily: 'Quicksand',
    },
    closeButton: {
        padding: 4,
    },
});

export default function AuthToast() {
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const unsubscribe = authErrorEmitter.subscribe((errorMessage: string) => {
            const friendlyMessage = getAuthErrorMessage(errorMessage);
            setMessage(friendlyMessage);
            setVisible(true);

            // Redirect to login if session expired or authorized
            if (
                friendlyMessage.includes('session has expired') ||
                friendlyMessage.includes('log in') ||
                friendlyMessage.includes('Session error')
            ) {
                // Small delay to let user see toast if they are looking, but ensures redirect happens
                setTimeout(() => {
                    // Ensure we are not already on auth pages to avoid loops (though replace handles it well)
                    router.replace('/auth/login');
                }, 1500);
            }

            // Animate in
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true, // Native driver doesn't support width/height, but supports transform/opacity
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto dismiss after 5 seconds
            const timer = setTimeout(() => {
                dismiss();
            }, 5000);

            return () => clearTimeout(timer);
        });

        return unsubscribe;
    }, []);

    const dismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
        });
    };

    if (!visible) return null;

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View
                style={[
                    styles.toast,
                    {
                        transform: [{ translateY: slideAnim }],
                        opacity: opacityAnim,
                    }
                ]}
            >
                <View style={styles.iconContainer}>
                    <AlertCircle size={20} color="#DC2626" />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>Session Error</Text>
                    <Text style={styles.message}>{message}</Text>
                </View>
                <Pressable onPress={dismiss} style={styles.closeButton}>
                    <X size={18} color="#B91C1C" />
                </Pressable>
            </Animated.View>
        </View>
    );
}
