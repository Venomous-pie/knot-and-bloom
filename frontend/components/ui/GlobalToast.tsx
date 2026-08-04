import React, { useEffect, useState, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { toastEvents, ToastPayload } from '@/utils/toastEvents';
import { theme } from '@/constants/theme';

export default function GlobalToast() {
    const [toast, setToast] = useState<ToastPayload | null>(null);
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const unsubscribe = toastEvents.subscribe((payload) => {
            setToast(payload);
            
            // Clear any existing timeout
            if (hideTimeout.current) {
                clearTimeout(hideTimeout.current);
            }

            // Animate in
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            // Auto hide
            hideTimeout.current = setTimeout(() => {
                hideToast();
            }, payload.duration || 3000);
        });

        return () => {
            unsubscribe();
            if (hideTimeout.current) clearTimeout(hideTimeout.current);
        };
    }, []);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setToast(null);
        });
    };

    if (!toast) return null;

    let Icon = Info;
    let bgColor = '#3B82F6';
    let textColor = '#FFFFFF';

    if (toast.type === 'SUCCESS') {
        Icon = CheckCircle2;
        bgColor = '#10B981';
    } else if (toast.type === 'ERROR') {
        Icon = AlertCircle;
        bgColor = '#EF4444';
    }

    return (
        <Animated.View style={[
            styles.container,
            {
                opacity,
                transform: [{ translateY }]
            }
        ]}>
            <View style={[styles.toast, { backgroundColor: bgColor }]}>
                <View style={styles.toastContent}>
                    <Icon size={20} color={textColor} />
                    <Text style={[styles.message, { color: textColor }]}>{toast.message}</Text>
                </View>
                {toast.onUndo && (
                    <TouchableOpacity 
                        style={styles.undoBtn}
                        onPress={() => {
                            toast.onUndo?.();
                            hideToast();
                        }}
                    >
                        <Text style={styles.undoText}>UNDO</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60, // Below header
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        minWidth: 300,
        maxWidth: 500,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    message: {
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Quicksand',
    },
    undoBtn: {
        marginLeft: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 4,
    },
    undoText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
        fontFamily: 'Quicksand',
    }
});
