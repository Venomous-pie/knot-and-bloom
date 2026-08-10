import { wishlistAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/product/ProductCard';
import { theme } from '@/constants/theme';
import { Product } from '@/types/products';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton';

export default function WishlistPage() {
    const { user } = useAuth();
    const { wishlistedProductIds, wishlistProducts } = useWishlist();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false); // No longer loading from network on mount

    // Keep local items in sync with context, filtering by wishlistedProductIds for optimistic deletes
    React.useEffect(() => {
        setItems(wishlistProducts.filter(p => wishlistedProductIds.has(p.uid)));
    }, [wishlistProducts, wishlistedProductIds]);

    // Calculate grid layout
    const containerWidth = Math.min(width, 1200);
    const padding = theme.spacing.lg * 2;
    const gap = theme.spacing.md;
    const availableWidth = containerWidth - padding;

    // On mobile we can show 2 columns for product cards if they are small, or 1 column. ProductCard scales based on width.
    // Let's use 2 columns on mobile, 3 on tablet, 4 on desktop
    const numColumns = isMobile ? 2 : width < 1024 ? 3 : 4;
    const itemWidth = (availableWidth - (gap * (numColumns - 1))) / numColumns;

    if (!user) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Stack.Screen options={{ title: 'Wishlist', headerTitleAlign: 'center' }} />
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ title: 'Wishlist', headerTitleAlign: 'center' }} />
            <ScrollView contentContainerStyle={[styles.scrollContent, items.length === 0 && { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerSubtitle}>
                        {wishlistedProductIds.size} {wishlistedProductIds.size === 1 ? 'item' : 'items'} saved
                    </Text>
                </View>

                {loading && items.length === 0 ? (
                    <View style={[styles.grid, { gap, paddingHorizontal: theme.spacing.lg }]}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <ProductCardSkeleton key={i} style={{ width: itemWidth }} />
                        ))}
                    </View>
                ) : items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="heart" size={80} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
                        <Text style={styles.emptyMessage}>
                            Save items you love so you can easily find them later.
                        </Text>
                        <Pressable style={styles.shopBtn} onPress={() => router.push('/')}>
                            <Text style={styles.shopBtnText}>Discover Products</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={[styles.grid, { gap, paddingHorizontal: theme.spacing.lg }]}>
                        {items.map((product) => (
                            <ProductCard
                                key={product.uid}
                                product={product}
                                style={{ width: itemWidth }}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: 100,
    },
    header: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Quicksand',
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Quicksand',
        color: theme.colors.textSecondary,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing['2xl'],
    },
    emptyIconContainer: {
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
    emptyTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    emptyMessage: {
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
        transform: [{ scale: 1 }],
    },
    shopBtnText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 0.5,
    },
});
