import type { ProductPageProps } from "@/types/products";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import ProductCard from "./ProductCard";

export default function ProductPage({ category, title, products = [], loading, error }: ProductPageProps) {
    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>Loading products...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>❌ {error}</Text>
                <Text style={styles.errorSubtext}>Please try again later</Text>
            </View>
        );
    }

    if (!products || products.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>Check back soon for new items!</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{products.length} products available</Text>

            <FlatList
                data={products}
                keyExtractor={(item) => String(item.uid)}
                numColumns={2}
                contentContainerStyle={styles.productList}
                renderItem={({ item }) => (
                    <ProductCard product={item} />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginBottom: 8,
    },
    errorSubtext: {
        fontSize: 14,
        color: '#666',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
    productList: {
        paddingBottom: 20,
    },
});