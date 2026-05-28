import ProductCard from "@/components/product/ProductCard";
import { categoryTitles } from "@/constants/categories";
import { useProducts } from "@/hooks/useProducts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, SlidersHorizontal, Check } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

    // Sidebar Filters State
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    const sidebarWidth = width >= 768 ? 280 : 0;
    const horizontalPadding = isDesktop ? theme.spacing['2xl'] : theme.spacing.lg;
    const gridAreaWidth = containerWidth - sidebarWidth - (horizontalPadding * 2);
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
                {/* Breadcrumb & Controls Bar */}
                <View style={styles.headerBar}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.breadcrumbText}>
                            <Text style={styles.breadcrumbLink} onPress={() => router.push('/' as any)}>Home</Text>
                            <Text style={styles.breadcrumbSeparator}> › </Text>
                            <Text style={styles.breadcrumbCurrent}>{categoryTitle}</Text>
                            {!loading && (
                                <Text style={styles.breadcrumbCount}>
                                    {' '}· {total} {total === 1 ? 'product' : 'products'}
                                </Text>
                            )}
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Pressable style={styles.filterButton}>
                            <SlidersHorizontal size={14} color={theme.colors.text} />
                            <Text style={styles.filterButtonText}>Filter</Text>
                        </Pressable>

                        <View style={styles.sortWrapper}>
                            <Pressable
                                style={styles.sortButton}
                                onPress={() => setShowSortMenu(prev => !prev)}
                            >
                                <Text style={styles.sortButtonText}>{currentSortLabel}</Text>
                                <ChevronDown size={14} color={theme.colors.text} />
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

                {/* Main Content Layout */}
                <View style={styles.mainLayout}>
                    {/* Left Sidebar Filter (Desktop/Tablet) */}
                    {width >= 768 && (
                        <View style={styles.sidebar}>
                            {/* Price Range */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterTitle}>PRICE RANGE</Text>
                                <View style={styles.priceRow}>
                                    <View style={styles.priceInputWrapper}>
                                        <Text style={styles.currencySymbol}>₱</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={theme.colors.textLight}
                                            value={priceRange.min}
                                            onChangeText={v => setPriceRange(p => ({ ...p, min: v }))}
                                        />
                                    </View>
                                    <Text style={styles.priceDivider}>-</Text>
                                    <View style={styles.priceInputWrapper}>
                                        <Text style={styles.currencySymbol}>₱</Text>
                                        <TextInput
                                            style={styles.priceInput}
                                            keyboardType="numeric"
                                            placeholder="500"
                                            placeholderTextColor={theme.colors.textLight}
                                            value={priceRange.max}
                                            onChangeText={v => setPriceRange(p => ({ ...p, max: v }))}
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Category */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterTitle}>CATEGORY</Text>
                                {['Crochet', 'Fuzzy Wire Art', 'Accessories', 'Hair Ties', 'Stuffed Toys'].map(cat => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <Pressable
                                            key={cat}
                                            style={styles.checkboxRow}
                                            onPress={() => setSelectedCategories(prev =>
                                                isSelected ? prev.filter(c => c !== cat) : [...prev, cat]
                                            )}
                                        >
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                {isSelected && <Check size={12} color="#fff" />}
                                            </View>
                                            <Text style={styles.checkboxLabel}>{cat}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Tags */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterTitle}>TAGS</Text>
                                {['Trending', 'New arrival', 'Custom order'].map(tag => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <Pressable
                                            key={tag}
                                            style={styles.checkboxRow}
                                            onPress={() => setSelectedTags(prev =>
                                                isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                            )}
                                        >
                                            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                                {isSelected && <Check size={12} color="#fff" />}
                                            </View>
                                            <Text style={styles.checkboxLabel}>{tag}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Main Grid */}
                    <View style={styles.mainContent}>
                        {renderContent()}
                    </View>
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
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    headerLeft: {
        flex: 1,
        justifyContent: 'center',
    },
    breadcrumbText: {
        fontSize: theme.typography.sizes.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbLink: {
        color: theme.colors.textSecondary,
    },
    breadcrumbSeparator: {
        color: theme.colors.textLight,
    },
    breadcrumbCurrent: {
        color: theme.colors.text,
        fontWeight: theme.typography.weights.medium as any,
    },
    breadcrumbCount: {
        color: theme.colors.textLight,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    filterButtonText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        fontWeight: theme.typography.weights.medium as any,
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
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    sortButtonText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
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
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    sidebar: {
        width: 280,
        paddingTop: theme.spacing.xl,
        paddingLeft: theme.spacing.xl,
        paddingRight: theme.spacing.md,
        gap: theme.spacing.md,
    },
    filterSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterTitle: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.textSecondary,
        letterSpacing: 1,
        marginBottom: theme.spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    priceInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.backgroundAlt,
    },
    currencySymbol: {
        color: theme.colors.textLight,
        fontSize: theme.typography.sizes.sm,
        marginRight: theme.spacing.xs,
    },
    priceInput: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        color: theme.colors.text,
        fontSize: theme.typography.sizes.sm,
        outlineStyle: 'none' as any,
    },
    priceDivider: {
        color: theme.colors.textLight,
        fontSize: theme.typography.sizes.sm,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundAlt,
    },
    checkboxSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    checkboxLabel: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
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
