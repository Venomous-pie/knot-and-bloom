import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, ChevronLeft, Search, X } from "lucide-react-native";
import React, { useMemo, useState, useEffect } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { theme } from '@/constants/theme';
import ProductCard from "@/components/product/ProductCard";
import { productAPI } from '@/services/api';
import { Product } from "@/types/products";
import { normalizeSearchQuery } from "@/utils/searchUtils";
import { categoryTitles, CATEGORY_REGISTRY } from "@/constants/categories";

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'bestselling';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Best Selling', value: 'bestselling' },
];

export default function SearchResultsPage() {
    const { q } = useLocalSearchParams<{ q: string }>();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const LIMIT = 20;

    const normalizedQuery = useMemo(() => normalizeSearchQuery(q || ''), [q]);

    const fetchResults = async (pageNum: number, reset: boolean) => {
        if (!normalizedQuery) {
            setProducts([]);
            setLoading(false);
            setHasMore(false);
            return;
        }

        try {
            if (reset) {
                setLoading(true);
                setProducts([]);
            }
            setError(null);

            const response = await productAPI.getProducts({
                searchTerm: normalizedQuery,
                sort: sortBy,
                limit: LIMIT,
                offset: (pageNum - 1) * LIMIT
            });

            if (reset) {
                setProducts(response.data.products);
            } else {
                setProducts(prev => [...prev, ...response.data.products]);
            }

            if (response.data.pagination) {
                setHasMore(response.data.pagination.hasMore);
            } else {
                setHasMore(response.data.products.length === LIMIT);
            }
        } catch (err: any) {
            console.error('Error fetching search results:', err);
            setError('Failed to load search results.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchResults(1, true);
    }, [normalizedQuery, sortBy]);

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchResults(nextPage, false);
        }
    };

    const numColumns = useMemo(() => {
        if (width >= 1280) return 4;
        if (width >= 1024) return 3;
        if (width >= 768) return 3;
        if (width >= 480) return 2;
        return 2;
    }, [width]);

    // Did you mean? Helper
    const suggestedCategories = useMemo(() => {
        if (products.length > 3) return []; // Only suggest if results are sparse

        // Find categories that loosely match the original or normalized query
        const queryWords = (q || '').toLowerCase().split(' ');
        const matches = CATEGORY_REGISTRY.filter(cat => {
            const titleWords = cat.title.toLowerCase().split(' ');
            return queryWords.some(w => titleWords.includes(w) || cat.tags.some(t => t.includes(w)));
        }).slice(0, 3);

        return matches;
    }, [q, products.length]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={[styles.header, isDesktop && styles.headerDesktop]}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color={theme.colors.text} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            Results for "{normalizedQuery || q}"
                        </Text>
                        {!loading && (
                            <Text style={styles.headerSubtitle}>
                                {products.length} {products.length === 1 ? 'item' : 'items'} found
                            </Text>
                        )}
                    </View>

                    {/* Desktop Sort Dropdown */}
                    {isDesktop && (
                        <View style={{ position: 'relative', zIndex: 50 }}>
                            <Pressable
                                style={styles.sortButton}
                                onPress={() => setShowSortMenu(!showSortMenu)}
                            >
                                <Text style={styles.sortButtonText}>
                                    Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                                </Text>
                                <ChevronDown size={16} color={theme.colors.textSecondary} />
                            </Pressable>

                            {showSortMenu && (
                                <>
                                    <Pressable
                                        style={[styles.menuOverlay]}
                                        onPress={() => setShowSortMenu(false)}
                                    />
                                    <View style={styles.sortMenu}>
                                        {SORT_OPTIONS.map((option) => (
                                            <Pressable
                                                key={option.value}
                                                style={[styles.sortMenuItem, sortBy === option.value && styles.sortMenuItemActive]}
                                                onPress={() => {
                                                    setSortBy(option.value);
                                                    setShowSortMenu(false);
                                                }}
                                            >
                                                <Text style={[styles.sortMenuItemText, sortBy === option.value && styles.sortMenuItemTextActive]}>
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Mobile Sort Menu Trigger */}
            {!isDesktop && (
                <View style={styles.mobileToolbar}>
                    <Pressable style={styles.mobileToolbarButton} onPress={() => setShowSortMenu(true)}>
                        <Text style={styles.mobileToolbarText}>Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</Text>
                        <ChevronDown size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                </View>
            )}

            {/* Content */}
            <View style={[styles.content, isDesktop && styles.contentDesktop]}>
                {loading && page === 1 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable style={styles.retryButton} onPress={() => fetchResults(1, true)}>
                            <Text style={styles.retryText}>Retry</Text>
                        </Pressable>
                    </View>
                ) : products.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Search size={64} color={theme.colors.subtle} style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyTitle}>No results found</Text>
                        <Text style={styles.emptySubtitle}>We couldn't find anything matching "{q}".</Text>

                        <Pressable
                            style={styles.browseButton}
                            onPress={() => router.push('/products/all-products')}
                        >
                            <Text style={styles.browseButtonText}>Browse All Products</Text>
                        </Pressable>
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        keyExtractor={(item) => String(item.uid)}
                        numColumns={numColumns}
                        key={`grid-${numColumns}`}
                        contentContainerStyle={styles.listContent}
                        columnWrapperStyle={styles.columnWrapper}
                        ListHeaderComponent={
                            suggestedCategories.length > 0 ? (
                                <View style={styles.didYouMeanContainer}>
                                    <Text style={styles.didYouMeanTitle}>Did you mean?</Text>
                                    <View style={styles.chipsContainer}>
                                        {suggestedCategories.map(cat => (
                                            <Pressable
                                                key={cat.slug}
                                                style={[styles.chip, { backgroundColor: cat.bgColor }]}
                                                onPress={() => router.setParams({ q: cat.title })}
                                            >
                                                <Text style={[styles.chipText, { color: cat.color }]}>
                                                    {cat.title}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            ) : null
                        }
                        renderItem={({ item }) => (
                            <View style={{ flex: 1 / numColumns, maxWidth: `${100 / numColumns}%` }}>
                                <ProductCard product={item} />
                            </View>
                        )}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            loading && page > 1 ? (
                                <View style={{ padding: 20 }}>
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* Mobile Bottom Sheet for Sort */}
            {!isDesktop && showSortMenu && (
                <Pressable
                    style={styles.mobileBottomSheetOverlay}
                    onPress={() => setShowSortMenu(false)}
                >
                    <Pressable style={styles.mobileBottomSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>Sort By</Text>
                            <Pressable onPress={() => setShowSortMenu(false)} style={{ padding: 5 }}>
                                <X size={20} color={theme.colors.textLight} />
                            </Pressable>
                        </View>
                        {SORT_OPTIONS.map((option) => (
                            <Pressable
                                key={option.value}
                                style={styles.bottomSheetItem}
                                onPress={() => {
                                    setSortBy(option.value);
                                    setShowSortMenu(false);
                                }}
                            >
                                <Text style={[styles.bottomSheetItemText, sortBy === option.value && styles.bottomSheetItemTextActive]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </Pressable>
                </Pressable>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 15,
        gap: 15,
    },
    headerDesktop: {
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
    },
    backButton: {
        padding: 5,
        marginLeft: -5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    headerSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    contentDesktop: {
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    listContent: {
        padding: 15,
    },
    columnWrapper: {
        gap: 15,
        marginBottom: 15,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    emptySubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    browseButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    browseButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    errorText: {
        fontSize: 16,
        color: theme.colors.error,
        marginBottom: 16,
    },
    retryButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
    },
    retryText: {
        color: theme.colors.text,
        fontWeight: '600',
    },

    // Desktop Sort
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
    },
    sortButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    menuOverlay: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
    },
    sortMenu: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 5,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.colors.subtle,
        minWidth: 180,
        zIndex: 50,
        overflow: 'hidden',
    },
    sortMenuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    sortMenuItemActive: {
        backgroundColor: theme.colors.subtle,
    },
    sortMenuItemText: {
        fontSize: 14,
        color: theme.colors.text,
    },
    sortMenuItemTextActive: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },

    // Mobile Toolbar
    mobileToolbar: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    mobileToolbarButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
    },
    mobileToolbarText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },

    // Mobile Bottom Sheet
    mobileBottomSheetOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    mobileBottomSheet: {
        backgroundColor: 'white',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 30, // Safe area padding
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    bottomSheetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    bottomSheetItem: {
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    bottomSheetItemText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    bottomSheetItemTextActive: {
        fontWeight: 'bold',
        color: theme.colors.primary,
    },

    // Did you mean
    didYouMeanContainer: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    didYouMeanTitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 10,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
