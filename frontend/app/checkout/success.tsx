import { View, Text, StyleSheet, Pressable, ScrollView, Image, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Check, ShoppingBag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isMobile } from '@/constants/layout';
import { useEffect, useState } from 'react';
import { productAPI } from '@/api/api';
import { Product } from '@/types/products';
import { useCart } from '@/contexts/CartContext';

export default function CheckoutSuccessPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const mobile = isMobile(width);
    const { refreshCart } = useCart();

    // State for recommendations
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Refresh cart count after successful checkout (items were removed on backend)
        refreshCart();

        const fetchRecommendations = async () => {
            try {
                // Fetch random/latest products as recommendations
                // Fetch 12 products for "all newest" fill
                const response = await productAPI.getProducts({ limit: 12, sort: 'newest' });
                if (response && response.data && response.data.products) {
                    setRecommendedProducts(response.data.products);
                }
            } catch (error) {
                console.error('Failed to fetch recommendations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, []);

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
                    <Pressable style={styles.secondaryButton} onPress={() => router.push('/profile/orders' as any)}>
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

                {loading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <View style={[styles.grid, mobile ? styles.gridMobile : styles.gridDesktop]}>
                        {recommendedProducts.map(product => (
                            <Pressable
                                key={product.uid}
                                style={styles.productCard}
                                onPress={() => router.push(`/(tabs)/index?productId=${product.uid}` as any)}
                            >
                                <Image
                                    source={{ uri: product.image || 'https://via.placeholder.com/150' }}
                                    style={styles.productImage}
                                />
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                                    <Text style={styles.productPrice}>₱{Number(product.basePrice).toFixed(2)}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
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
