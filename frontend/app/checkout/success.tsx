import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Check, ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isMobile } from '@/constants/layout';

// Mock Recommended Products
const RECOMMENDED_PRODUCTS = [
    { id: 101, name: 'Velvet Yarn Bundle', price: '₱450.00', image: 'https://images.unsplash.com/photo-1605256486111-37f7c8976b25?auto=format&fit=crop&q=80&w=400' },
    { id: 102, name: 'Bamboo Knitting Needles', price: '₱180.00', image: 'https://images.unsplash.com/photo-1616603072230-ae3315a0c867?auto=format&fit=crop&q=80&w=400' },
    { id: 103, name: 'Pastel Cotton Thread', price: '₱120.00', image: 'https://images.unsplash.com/photo-1520465242858-54b9d5c80410?auto=format&fit=crop&q=80&w=400' },
    { id: 104, name: 'Ergonomic Crochet Hook Set', price: '₱850.00', image: 'https://images.unsplash.com/photo-1616603072382-3580436551e1?auto=format&fit=crop&q=80&w=400' },
];

export default function CheckoutSuccessPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const mobile = isMobile(width);

    return (
        <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>

            {/* Success Message Card */}
            <View style={styles.successCard}>
                <View style={styles.iconContainer}>
                    <Check size={48} color="white" />
                </View>
                <Text style={styles.title}>Order Placed Successfully!</Text>
                <Text style={styles.subtitle}>
                    Thank you for shopping with Knot & Bloom. Your order has been confirmed and will be shipped soon.
                </Text>

                <View style={styles.buttonRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => router.push('/orders')}>
                        <Text style={styles.secondaryButtonText}>View My Orders</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={() => router.push('/')}>
                        <Text style={styles.primaryButtonText}>Continue Shopping</Text>
                    </Pressable>
                </View>
            </View>

            {/* Recommendations */}
            <View style={styles.recommendations}>
                <View style={styles.sectionHeader}>
                    <SparklesIcon />
                    <Text style={styles.sectionTitle}>You Might Also Like</Text>
                </View>

                <View style={[styles.grid, mobile ? styles.gridMobile : styles.gridDesktop]}>
                    {RECOMMENDED_PRODUCTS.map(product => (
                        <Pressable key={product.id} style={styles.productCard}>
                            <Image source={{ uri: product.image }} style={styles.productImage} />
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                                <Text style={styles.productPrice}>{product.price}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>

        </ScrollView>
    );
}

const SparklesIcon = () => (
    <View style={{ marginRight: 8 }}>
        <ShoppingBag size={20} color={theme.colors.primary} />
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
        alignItems: 'center',
        paddingBottom: 40,
    },
    successCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 32,
        padding: theme.spacing.xl,
        alignItems: 'center',
        width: '100%',
        maxWidth: 600,
        ...theme.shadows.md,
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        ...theme.shadows.sm,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        fontFamily: theme.typography.fontFamily,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        minWidth: 160,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        fontFamily: theme.typography.fontFamily,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.border,
        minWidth: 160,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 16,
        fontFamily: theme.typography.fontFamily,
    },

    // Recommendations
    recommendations: {
        width: '100%',
        maxWidth: 1000,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    gridMobile: {
        // Just flex wrap
    },
    gridDesktop: {
        // Just flex wrap
    },
    productCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        width: 160,
        overflow: 'hidden',
        ...theme.shadows.sm,
        marginBottom: 16,
    },
    productImage: {
        width: '100%',
        height: 160,
        backgroundColor: theme.colors.subtle,
    },
    productInfo: {
        padding: 12,
    },
    productName: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 4,
        fontFamily: theme.typography.fontFamily,
    },
    productPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
});
