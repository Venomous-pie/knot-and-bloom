import { categoryTitles } from "@/constants/categories";
import { useProducts } from "@/hooks/useProducts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, SlidersHorizontal, Check, X } from "lucide-react-native";
import React, { useMemo, useState, useEffect } from "react";
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
    useWindowDimensions,
    Modal
} from "react-native";
import { theme } from '@/constants/theme';
import ProductCard from "@/components/product/ProductCard";

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

    // Mobile Filters State
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    // Sidebar Filters State
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [debouncedPriceRange, setDebouncedPriceRange] = useState(priceRange);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedPriceRange(priceRange);
        }, 500);
        return () => clearTimeout(timer);
    }, [priceRange]);

    // Determine filter parameters based on category slug
    const filterParams = useMemo(() => {
        const params: any = { sort: sortBy, limit: 20 };

        if (category === 'new-arrival') {
            params.newArrival = true;
        } else if (category === 'popular') {
            params.sort = 'bestselling';
        } else if (category !== 'all-products') {
            const matchedTitle = categoryTitles[category as string];
            params.category = matchedTitle || category;
        }

        if (debouncedPriceRange.min) params.minPrice = Number(debouncedPriceRange.min);
        if (debouncedPriceRange.max) params.maxPrice = Number(debouncedPriceRange.max);
        if (selectedCategories.length > 0) params.categories = selectedCategories.join(',');
        if (selectedTags.length > 0) params.tags = selectedTags.join(',');

        return params;
    }, [category, sortBy, debouncedPriceRange, selectedCategories, selectedTags]);

    const { products, loading, total, loadMore, refresh } = useProducts(filterParams);

    const categoryTitle = useMemo(() => {
        if (category === 'new-arrival') return 'New Arrivals';
        if (category === 'all-products') return 'All Products';
        if (category === 'popular') return 'Popular';
        return categoryTitles[category as string] || category;
    }, [category]);

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;

    const numColumns = isDesktop ? 4 : (isTablet ? 3 : 2);
    // Use a smaller gap if they want less margin-x
    const gap = theme.spacing.sm; 

    const containerWidth = Math.min(width, 1200);
    const paddingX = theme.spacing.lg * 2;
    const sidebarW = width >= 768 ? 250 : 0;
    const gridAreaWidth = containerWidth - paddingX - sidebarW;
    
    // Slight adjustment to avoid fractional pixel wrapping issues
    const cardWidth = Math.max(100, (gridAreaWidth - (numColumns - 1) * gap) / numColumns) - 0.5;

    const renderContent = () => {
        if (loading && products.length === 0) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        if (products.length === 0) {
            return (
                <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>No products found in this category.</Text>
                </View>
            );
        }

        return (
            <FlatList
                data={products}
                keyExtractor={(item) => item.uid.toString()}
                key={`grid-${numColumns}`}
                numColumns={numColumns}
                renderItem={({ item, index }) => (
                    <View style={{ 
                        width: cardWidth,
                        marginRight: (index % numColumns === numColumns - 1) ? 0 : gap
                    }}>
                        <ProductCard product={item} />
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loading ? (
                        <View style={styles.footer}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    ) : !hasMore && products.length > 0 ? (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>You've reached the end of the list</Text>
                        </View>
                    ) : null
                }
            />
        );
    };

    const hasMore = products.length < total;

    const filterContent = (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScrollContent}>
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
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Breadcrumb Bar (Full Width) */}
            <View style={styles.headerBar}>
                <View style={styles.headerBarContent}>
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
            </View>

            <Modal
                visible={showMobileFilters}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowMobileFilters(false)}
            >
                <SafeAreaView style={styles.modalSafeArea}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filters</Text>
                        <Pressable onPress={() => setShowMobileFilters(false)} style={styles.modalCloseButton}>
                            <X size={24} color={theme.colors.text} />
                        </Pressable>
                    </View>
                    <View style={styles.modalContent}>
                        {filterContent}
                    </View>
                    <View style={styles.modalFooter}>
                        <Pressable style={styles.modalApplyButton} onPress={() => setShowMobileFilters(false)}>
                            <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>

            <View style={styles.pageWrapper}>
                {/* Main Content Layout */}
                <View style={styles.mainLayout}>
                    {/* Left Sidebar Filter (Desktop/Tablet) */}
                    {width >= 768 && isSidebarVisible && (
                        <View style={styles.sidebar}>
                            {filterContent}
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
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    headerBar: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerBarContent: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
    },
    breadcrumbLink: {
        color: theme.colors.textLight,
    },
    breadcrumbSeparator: {
        color: theme.colors.border,
        marginHorizontal: theme.spacing.xs,
    },
    breadcrumbCurrent: {
        color: theme.colors.text,
        fontWeight: theme.typography.weights.medium as any,
    },
    breadcrumbCount: {
        color: theme.colors.textLight,
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    sidebar: {
        width: 250,
        paddingTop: theme.spacing.xl,
        paddingRight: theme.spacing.lg,
    },
    sidebarScrollContent: {
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
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
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing['2xl'],
    },
    emptyText: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    footer: {
        paddingTop: theme.spacing.xl,
        alignItems: 'center',
        gap: theme.spacing.lg,
    },
    footerText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
    },
    categoryChipTextActive: {
        color: theme.colors.primaryDark,
        fontWeight: theme.typography.weights.semibold as any,
    },
    modalSafeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
    },
    modalCloseButton: {
        padding: theme.spacing.xs,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
    },
    modalFooter: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    modalApplyButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    modalApplyButtonText: {
        color: '#fff',
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.bold as any,
    },
});
