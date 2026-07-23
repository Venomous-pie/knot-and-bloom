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
import ProductCardSkeleton from "@/components/product/ProductCardSkeleton";
import { productAPI } from '@/api/api';
import { useWishlist } from "@/contexts/WishlistContext";
import { UNIVERSAL_TAGS } from '@/constants/tagSuggestions';

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

    const { wishlistedProductIds } = useWishlist();

    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [showAllCategories, setShowAllCategories] = useState(false);
    const MAX_CATEGORIES = 6;

    const [showAllTags, setShowAllTags] = useState(false);
    const MAX_TAGS = 6;

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await productAPI.getCategoryCounts();
                if (response.data?.success && response.data?.counts) {
                    const dynamicCats = Object.keys(response.data.counts);
                    const staticCats = Object.values(categoryTitles);
                    
                    const uniqueCatsMap = new Map<string, string>();
                    
                    // Add static categories first (Title format)
                    staticCats.forEach(c => {
                        const trimmed = c.trim();
                        uniqueCatsMap.set(trimmed.toLowerCase(), trimmed);
                    });

                    // Add dynamic categories, preferring existing Title formats if found
                    dynamicCats.forEach(c => {
                        const trimmed = c.trim();
                        const lower = trimmed.toLowerCase();
                        if (!uniqueCatsMap.has(lower)) {
                            // Try to find if it corresponds to a slug in categoryTitles
                            const foundTitle = categoryTitles[lower];
                            if (foundTitle) {
                                uniqueCatsMap.set(lower, foundTitle);
                            } else {
                                // Just format it nicely if not found
                                const formatted = trimmed.split(/[- ]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                uniqueCatsMap.set(lower, formatted);
                            }
                        }
                    });

                    setAvailableCategories(Array.from(uniqueCatsMap.values()).sort());
                } else {
                    setAvailableCategories(Object.values(categoryTitles).sort());
                }
            } catch (err) {
                console.error("Failed to fetch categories:", err);
                setAvailableCategories(Object.values(categoryTitles).sort());
            }
        };
        fetchCategories();
    }, []);

    // Determine filter parameters based on category slug
    const filterParams = useMemo(() => {
        const params: any = { sort: sortBy, limit: 20 };

        if (category === 'new-arrival') {
            params.newArrival = true;
        } else if (category === 'popular') {
            params.sort = 'bestselling';
        }

        if (selectedCategories.length > 0) {
            // Expand selected categories to include both Title and Slug variants to catch all matching DB entries
            const expandedCats = selectedCategories.flatMap(cat => {
                const slug = Object.entries(categoryTitles).find(([s, t]) => t === cat)?.[0] || cat.toLowerCase().replace(/[\s\/]+/g, '-');
                return [cat, slug];
            });
            // Deduplicate the expanded array
            params.categories = Array.from(new Set(expandedCats)).join(',');
        } else if (category && category !== 'new-arrival' && category !== 'popular' && category !== 'all-products') {
            const matchedTitle = categoryTitles[category as string];
            if (matchedTitle) {
                params.categories = [matchedTitle, category].join(',');
            } else {
                params.categories = category;
            }
        }

        if (debouncedPriceRange.min) params.minPrice = Number(debouncedPriceRange.min);
        if (debouncedPriceRange.max) params.maxPrice = Number(debouncedPriceRange.max);
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
            const skeletonData = Array.from({ length: numColumns * 3 }, (_, i) => i);
            return (
                <View style={styles.mainContentContainer}>
                    <FlatList
                        data={skeletonData}
                        keyExtractor={(item) => `skeleton-${item}`}
                        key={`grid-${numColumns}`}
                        numColumns={numColumns}
                        renderItem={({ item, index }) => (
                            <View style={{ 
                                width: cardWidth,
                                marginRight: (index % numColumns === numColumns - 1) ? 0 : gap
                            }}>
                                <ProductCardSkeleton />
                            </View>
                        )}
                        contentContainerStyle={styles.listContent}
                        columnWrapperStyle={styles.columnWrapper}
                        showsVerticalScrollIndicator={false}
                    />
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
            <View style={styles.mainContentContainer}>
                <View style={{ flex: 1 }}>
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
                            loading && products.length > 0 ? (
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
                </View>
            </View>
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
                <View style={{ gap: theme.spacing.sm }}>
                    {(showAllCategories ? availableCategories : availableCategories.slice(0, MAX_CATEGORIES)).map(cat => {
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
                    {availableCategories.length > MAX_CATEGORIES && (
                        <Pressable 
                            style={{ paddingTop: theme.spacing.xs }}
                            onPress={() => setShowAllCategories(!showAllCategories)}
                        >
                            <Text style={{ 
                                color: theme.colors.primary, 
                                fontSize: theme.typography.sizes.sm,
                                fontWeight: theme.typography.weights.medium as any 
                            }}>
                                {showAllCategories ? 'Show Less' : `+ Show ${availableCategories.length - MAX_CATEGORIES} More`}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Tags */}
            <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>TAGS</Text>
                <View style={{ gap: theme.spacing.sm }}>
                    {(showAllTags ? UNIVERSAL_TAGS : UNIVERSAL_TAGS.slice(0, MAX_TAGS)).map(tag => {
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
                                <Text style={styles.checkboxLabel}>
                                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                </Text>
                            </Pressable>
                        );
                    })}
                    {UNIVERSAL_TAGS.length > MAX_TAGS && (
                        <Pressable 
                            style={{ paddingTop: theme.spacing.xs }}
                            onPress={() => setShowAllTags(!showAllTags)}
                        >
                            <Text style={{ 
                                color: theme.colors.primary, 
                                fontSize: theme.typography.sizes.sm,
                                fontWeight: theme.typography.weights.medium as any 
                            }}>
                                {showAllTags ? 'Show Less' : `+ Show ${UNIVERSAL_TAGS.length - MAX_TAGS} More`}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Breadcrumb Bar */}
            <View style={styles.breadcrumbContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.breadcrumbItem}>
                        <Pressable onPress={() => router.push('/' as any)}>
                            <Text style={[styles.breadcrumbText, styles.breadcrumbTextClickable]}>
                                Home
                            </Text>
                        </Pressable>
                        <Text style={styles.breadcrumbSeparator}>/</Text>
                    </View>
                    <View style={styles.breadcrumbItem}>
                        <Text style={[styles.breadcrumbText, styles.breadcrumbTextActive]}>
                            {categoryTitle}
                        </Text>
                        {!loading && (
                            <Text style={[styles.breadcrumbText, styles.breadcrumbTextClickable]}>
                                {' '}· {total} {total === 1 ? 'product' : 'products'}
                            </Text>
                        )}
                    </View>
                </ScrollView>
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
    breadcrumbContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: 16,
        paddingBottom: 8,
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    breadcrumbTextClickable: {
        color: theme.colors.textSecondary,
    },
    breadcrumbTextActive: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    breadcrumbSeparator: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginHorizontal: 8,
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    sidebar: {
        width: 250,
        paddingTop: theme.spacing.sm,
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
        minWidth: 0,
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
        minWidth: 0,
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
        marginBottom: 0,
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
    mainContentContainer: {
        flex: 1,
        position: 'relative',
    },
    listContent: {
        paddingTop: theme.spacing.sm,
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
        fontSize: theme.typography.sizes.base,
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
        fontSize: theme.typography.sizes.base,
        fontWeight: theme.typography.weights.bold as any,
    },
});
