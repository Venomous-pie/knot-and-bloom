import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface CheckoutSessionExpiredDialogProps {
    visible: boolean;
    onDismiss: () => void;
}

export function CheckoutSessionExpiredDialog({ visible, onDismiss }: CheckoutSessionExpiredDialogProps) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="time-outline" size={48} color={theme.colors.error} />
                    </View>
                    <Text style={styles.title}>Session Expired</Text>
                    <Text style={styles.message}>
                        Your checkout session has expired due to inactivity. The items in your cart may have been released.
                    </Text>
                    <Text style={styles.subtext}>
                        Please return to your cart to start a new checkout.
                    </Text>
                    <Pressable style={styles.button} onPress={onDismiss}>
                        <Text style={styles.buttonText}>Return to Cart</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    dialog: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        maxWidth: 400,
        width: '100%',
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.error + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    subtext: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        minWidth: 180,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
});
