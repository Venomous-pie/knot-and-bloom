import { wishlistAPI } from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import ProductCard from '@/components/ProductCard';
import { theme } from '@/constants/theme';
import { Product } from '@/types/products';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WishlistPage() {
    const { user } = useAuth();
    const { wishlistedProductIds, refreshWishlist } = useWishlist();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;

    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlistItems = async () => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const res = await wishlistAPI.getWishlist(user.uid);
            if (res.data?.wishlist?.items) {
                const products = res.data.wishlist.items.map((item: any) => item.product);
                setItems(products);
            }
        } catch (error) {
            console.error('Failed to fetch wishlist items', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on focus (or when the user changes), but NOT on every wishlist toggle.
    // Optimistic removal from the list is handled by the useEffect below.
    useFocusEffect(
        useCallback(() => {
            fetchWishlistItems();
        }, [user])
    );

    // Keep local items in sync with context: remove items that were un-wishlisted
    // without triggering a network refetch (avoids the blink).
    React.useEffect(() => {
        setItems(prev => prev.filter(p => wishlistedProductIds.has(p.uid)));
    }, [wishlistedProductIds]);

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
            <Stack.Screen
                options={{
                    title: `Wishlist (${wishlistedProductIds.size})`,
                    headerTitleStyle: { fontFamily: theme.typography.fontFamily },
                    headerStyle: { backgroundColor: theme.colors.background }
                }}
            />

            {loading && items.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="heart-outline" size={64} color={theme.colors.primaryLight} />
                    </View>
                    <Text style={styles.title}>Your wishlist is empty</Text>
                    <Text style={styles.message}>
                        Save items you love so you can easily find them later.
                    </Text>
                    <Pressable style={styles.shopBtn} onPress={() => router.push('/')}>
                        <Text style={styles.shopBtnText}>Discover Products</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>My Saved Items</Text>
                    </View>
                    <View style={[styles.grid, { gap }]}>
                        {items.map((product) => (
                            <ProductCard
                                key={product.uid}
                                product={product}
                                style={{ width: itemWidth }}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
    scrollContent: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        padding: theme.spacing.lg,
        paddingBottom: 100,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    headerTitle: {
        fontSize: theme.typography.sizes['2xl'],
        fontFamily: theme.typography.fontFamily,
        fontWeight: 'bold',
        color: theme.colors.text,
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
        shadowColor: theme.shadows.md.shadowColor,
        shadowOffset: theme.shadows.md.shadowOffset,
        shadowOpacity: theme.shadows.md.shadowOpacity,
        shadowRadius: theme.shadows.md.shadowRadius,
        elevation: theme.shadows.md.elevation,
    },
    shopBtnText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: 'white',
    },
});
