import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const CartEmptyState = () => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="cart-outline" size={64} color={theme.colors.primaryLight} />
            </View>
            <Text style={styles.title}>Your cart is empty</Text>
            <Text style={styles.message}>
                Looks like you haven't added anything to your cart yet.
                Start shopping to fill it up!
            </Text>
            <Pressable style={styles.shopBtn} onPress={() => router.push('/')}>
                <Text style={styles.shopBtnText}>Start Shopping</Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing['2xl'],
        marginTop: theme.spacing['2xl'],
    },
    iconContainer: {
        width: 120,
        height: 120,
        backgroundColor: theme.colors.subtle,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.xl,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    message: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        lineHeight: 24,
    },
    shopBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        ...theme.shadows.md,
    },
    shopBtnText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: 'white',
    },
});
