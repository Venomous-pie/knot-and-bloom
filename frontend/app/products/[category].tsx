import ProductCard from "@/components/ProductCard";
import { categoryTitles } from "@/constants/categories";
import { useProducts } from "@/hooks/useProducts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, ChevronDown, SlidersHorizontal } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from "react-native";
import { theme } from '@/constants/theme';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'bestselling';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Best Selling', value: 'bestselling' },
];

export default function ProductCategoryPage() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const router = useRouter();
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Determine filter parameters based on category slug
    const filterParams = useMemo(() => {
        const baseSort = { sort: sortBy };

        if (category === 'new-arrival') {
            return { newArrival: true, limit: 20, ...baseSort };
        }
        if (category === 'all-products') {
            return { limit: 20, ...baseSort };
        }
        if (category === 'popular') {
            return { sort: 'bestselling' as const, limit: 20 };
        }

        const matchedTitle = categoryTitles[category as string];
        const apiCategory = matchedTitle || category;

        return { category: apiCategory, limit: 20, ...baseSort };
    }, [category, sortBy]);

    const { products, loading, total, loadMore, refresh } = useProducts(filterParams);

    const categoryTitle = category === 'all-products' ? 'All Products'
        : category === 'popular' ? 'Popular Products'
        : category === 'new-arrival' ? 'New Arrivals'
        : categoryTitles[category as string]
        || category?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || "Products";

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;

    const numColumns = isDesktop ? 4 : (isTablet ? 3 : 2);
    const gap = theme.spacing.md;

    const containerWidth = Math.min(width, 1200);
    const horizontalPadding = isDesktop ? theme.spacing['2xl'] : theme.spacing.lg;
    const gridAreaWidth = containerWidth - (horizontalPadding * 2);
    const cardWidth = Math.max(100, (gridAreaWidth - (numColumns - 1) * gap) / numColumns);

    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort By';

    const renderContent = () => {
        if (loading && products.length === 0) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        return (
            <FlatList
                key={`grid-${numColumns}`}
                data={products}
                renderItem={({ item }) => <ProductCard product={item} style={{ width: cardWidth }} />}
                keyExtractor={(item) => item.uid.toString()}
                numColumns={numColumns}
                columnWrapperStyle={[styles.columnWrapper, { gap }]}
                contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
                onEndReached={() => loadMore()}
                onEndReachedThreshold={0.5}
                refreshing={loading}
                onRefresh={refresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No products found in this category.</Text>
                        <Text style={styles.emptySubText}>Check back soon — new items are added regularly!</Text>
                    </View>
                }
                ListFooterComponent={
                    products.length > 0 ? (
                        <View style={styles.footer}>
                            <View style={styles.footerDivider} />
                            <Text style={styles.footerText}>
                                {products.length >= total
                                    ? `All ${total} products shown`
                                    : `Showing ${products.length} of ${total} products`}
                            </Text>
                            {products.length < total && (
                                <Pressable style={styles.loadMoreButton} onPress={() => loadMore()}>
                                    <Text style={styles.loadMoreText}>Load More</Text>
                                </Pressable>
                            )}
                            <View style={styles.footerMoreSection}>
                                <Text style={styles.footerMoreTitle}>Explore More Categories</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.footerChipsRow}>
                                    {Object.entries(categoryTitles).map(([slug, title]) => (
                                        <Pressable
                                            key={slug}
                                            style={[styles.categoryChip, category === slug && styles.categoryChipActive]}
                                            onPress={() => router.push(`/products/${slug}` as any)}
                                        >
                                            <Text style={[styles.categoryChipText, category === slug && styles.categoryChipTextActive]}>
                                                {title}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    ) : null
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.pageWrapper}>
                {/* Top Header Bar */}
                <View style={styles.headerBar}>
                    <View style={styles.headerLeft}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={20} color={theme.colors.textSecondary} />
                        </Pressable>
                        <View>
                            <Text style={styles.title}>{categoryTitle}</Text>
                            {!loading && (
                                <Text style={styles.productCount}>
                                    Showing {products.length} of {total} products
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Filter / Sort Controls */}
                    <View style={styles.headerRight}>
                        <View style={styles.sortWrapper}>
                            <Pressable
                                style={styles.sortButton}
                                onPress={() => setShowSortMenu(prev => !prev)}
                            >
                                <SlidersHorizontal size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
                                <ChevronDown size={14} color={theme.colors.textSecondary} />
                            </Pressable>

                            {showSortMenu && (
                                <View style={styles.sortDropdown}>
                                    {SORT_OPTIONS.map(option => (
                                        <Pressable
                                            key={option.value}
                                            style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
                                            onPress={() => {
                                                setSortBy(option.value);
                                                setShowSortMenu(false);
                                            }}
                                        >
                                            <Text style={[styles.sortOptionText, sortBy === option.value && styles.sortOptionTextActive]}>
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Main Grid */}
                <View style={styles.mainContent}>
                    {renderContent()}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    pageWrapper: {
        flex: 1,
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
    },
    backButton: {
        padding: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.backgroundAlt,
    },
    title: {
        fontSize: theme.typography.sizes['2xl'],
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        letterSpacing: -0.5,
    },
    productCount: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    sortWrapper: {
        position: 'relative',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    sortButtonText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.weights.medium as any,
    },
    sortDropdown: {
        position: 'absolute',
        top: '110%',
        right: 0,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.md,
        zIndex: 100,
        minWidth: 180,
        overflow: 'hidden',
    },
    sortOption: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
    },
    sortOptionActive: {
        backgroundColor: theme.colors.primaryLight,
    },
    sortOptionText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
    },
    sortOptionTextActive: {
        color: theme.colors.primaryDark,
        fontWeight: theme.typography.weights.semibold as any,
    },
    mainContent: {
        flex: 1,
    },
    listContent: {
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing['2xl'],
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing['2xl'],
        minHeight: 300,
    },
    emptyText: {
        fontSize: theme.typography.sizes.lg,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontWeight: theme.typography.weights.semibold as any,
        marginBottom: theme.spacing.sm,
    },
    emptySubText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    // Footer
    footer: {
        paddingTop: theme.spacing.xl,
        alignItems: 'center',
        gap: theme.spacing.lg,
    },
    footerDivider: {
        height: 1,
        width: '100%',
        backgroundColor: theme.colors.border,
    },
    footerText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
    },
    loadMoreButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing['2xl'],
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    loadMoreText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.weights.semibold as any,
    },
    footerMoreSection: {
        width: '100%',
        paddingTop: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: theme.spacing.md,
    },
    footerMoreTitle: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    footerChipsRow: {
        gap: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
    },
    categoryChip: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    categoryChipText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    },
    categoryChipTextActive: {
        color: theme.colors.primaryDark,
        fontWeight: theme.typography.weights.semibold as any,
    },
});
