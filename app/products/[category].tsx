import ProductCard from "@/components/ProductCard";
import { categoryTitles } from "@/constants/categories";
import { useProducts } from "@/hooks/useProducts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function ProductCategoryPage() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const router = useRouter();

    // Determine filter parameters based on category slug
    const filterParams = useMemo(() => {
        if (category === 'new-arrival') {
            return { newArrival: true, limit: 20 };
        }

        // Map slug to Title for API query (DB stores Titles e.g. "Crochet")
        // Try to find exact match in keys first
        const matchedTitle = categoryTitles[category as string];
        const apiCategory = matchedTitle || category; // Fallback to slug if no match found (though keys should match)

        return { category: apiCategory, limit: 20 };
    }, [category]);

    const { products, loading, loadMore, refresh } = useProducts(filterParams);

    const categoryTitle = categoryTitles[category as string]
        || category?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || "Products";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </Pressable>
                <Text style={styles.title}>{categoryTitle}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && products.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#B36979" />
                </View>
            ) : (
                <FlatList
                    data={products}
                    renderItem={({ item }) => <ProductCard product={item} />}
                    keyExtractor={(item) => item.uid.toString()}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    onEndReached={() => loadMore()}
                    onEndReachedThreshold={0.5}
                    refreshing={loading}
                    onRefresh={refresh}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={styles.emptyText}>No products found in this category.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});
