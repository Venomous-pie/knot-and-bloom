import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const CartEmptyState = () => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name="cart" size={80} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>Your cart is empty</Text>
            <Text style={styles.message}>
                Looks like you haven't added anything to your cart yet.
                Start shopping to fill it up!
            </Text>
            <Pressable style={styles.shopBtn} onPress={() => router.push('/products/all-products')}>
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
    },
    iconContainer: {
        width: 140,
        height: 140,
        backgroundColor: 'white',
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    message: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginBottom: theme.spacing['2xl'],
        lineHeight: 24,
        maxWidth: 300,
    },
    shopBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing['2xl'],
        paddingVertical: 16,
        borderRadius: theme.borderRadius.full,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    shopBtnText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },
});
