import ProductCard from "@/components/ProductCard";
import { categoryTitles } from "@/constants/categories";
import { useProducts } from "@/hooks/useProducts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, SlidersHorizontal } from "lucide-react-native";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from "react-native";
import { theme } from '@/constants/theme';

export default function ProductCategoryPage() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const router = useRouter();

    // Determine filter parameters based on category slug
    const filterParams = useMemo(() => {
        if (category === 'new-arrival') {
            return { newArrival: true, limit: 20 };
        }

        const matchedTitle = categoryTitles[category as string];
        const apiCategory = matchedTitle || category; 

        return { category: apiCategory, limit: 20 };
    }, [category]);

    const { products, loading, loadMore, refresh } = useProducts(filterParams);

    const categoryTitle = categoryTitles[category as string]
        || category?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || "Products";

    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const isMobile = width < 768;

    const numColumns = isDesktop ? 3 : (isTablet ? 3 : 2);
    const gap = theme.spacing.lg;
    
    const containerWidth = Math.min(width, 1200);
    // Desktop: container - left/right padding(xl) - sidebar(250) - gap(2xl)
    const gridAreaWidth = isDesktop 
        ? containerWidth - (theme.spacing.xl * 2) - 250 - theme.spacing['2xl']
        : containerWidth - (theme.spacing.lg * 2);

    const cardWidth = Math.max(100, (gridAreaWidth - (numColumns - 1) * gap) / numColumns);

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
                contentContainerStyle={styles.listContent}
                onEndReached={() => loadMore()}
                onEndReachedThreshold={0.5}
                refreshing={loading}
                onRefresh={refresh}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No products found in this category.</Text>
                    </View>
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.pageWrapper}>
                {isDesktop ? (
                    <View style={styles.desktopLayout}>
                        {/* Sidebar */}
                        <View style={styles.sidebar}>
                            <Pressable onPress={() => router.back()} style={styles.backButton}>
                                <ArrowLeft size={20} color={theme.colors.textSecondary} />
                                <Text style={styles.backText}>Back</Text>
                            </Pressable>
                            
                            <Text style={styles.title}>{categoryTitle}</Text>
                            <Text style={styles.productCount}>{products.length} Items</Text>
                            
                            <View style={styles.filterSection}>
                                <View style={styles.filterHeader}>
                                    <SlidersHorizontal size={18} color={theme.colors.textSecondary} />
                                    <Text style={styles.filterTitle}>Filters</Text>
                                </View>
                                <Text style={styles.placeholderText}>Filtering options coming soon.</Text>
                            </View>
                        </View>
                        
                        {/* Main Grid Area */}
                        <View style={styles.mainContent}>
                            {renderContent()}
                        </View>
                    </View>
                ) : (
                    <View style={styles.mobileLayout}>
                        <View style={styles.headerMobile}>
                            <Pressable onPress={() => router.back()} style={styles.backButtonMobile}>
                                <ArrowLeft size={24} color={theme.colors.text} />
                            </Pressable>
                            <Text style={styles.titleMobile}>{categoryTitle}</Text>
                            <View style={{ width: 40 }} />
                        </View>
                        
                        <View style={[styles.mainContent, { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }]}>
                            {renderContent()}
                        </View>
                    </View>
                )}
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
    desktopLayout: {
        flex: 1,
        flexDirection: 'row',
        padding: theme.spacing.xl,
        gap: theme.spacing['2xl'],
    },
    mobileLayout: {
        flex: 1,
        flexDirection: 'column',
    },
    sidebar: {
        width: 250,
        borderRightWidth: 1,
        borderRightColor: theme.colors.border,
        paddingRight: theme.spacing.xl,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
        paddingVertical: theme.spacing.sm,
    },
    backText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.typography.weights.semibold as any,
    },
    title: {
        fontSize: theme.typography.sizes['3xl'],
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: theme.spacing.xs,
        letterSpacing: -0.5,
    },
    productCount: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        marginBottom: theme.spacing['2xl'],
    },
    filterSection: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.lg,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    filterTitle: {
        fontSize: theme.typography.sizes.base,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        letterSpacing: 1,
    },
    placeholderText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        lineHeight: 20,
    },
    mainContent: {
        flex: 1,
    },
    headerMobile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backButtonMobile: {
        padding: theme.spacing.xs,
    },
    titleMobile: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    listContent: {
        paddingBottom: theme.spacing['2xl'],
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        marginBottom: theme.spacing.lg,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing['2xl'],
    },
    emptyText: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
