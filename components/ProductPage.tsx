import type { ProductPageProps } from "@/types/products";
import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

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
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.productList}
                renderItem={({ item }) => (
                    <View style={styles.productCard}>
                        <View style={styles.imageContainer}>
                            {item.image ? (
                                <Text style={styles.imagePlaceholder}>🖼️</Text>
                            ) : (
                                <Text style={styles.imagePlaceholder}>📦</Text>
                            )}
                        </View>

                        <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={2}>
                                {item.name}
                            </Text>

                            <View style={styles.priceContainer}>
                                {Number(item.discountedPrice) ? (
                                    <>
                                        <Text style={styles.originalPrice}>
                                            ₱{Number(item.basePrice).toFixed(2)}
                                        </Text>
                                        <Text style={styles.discountedPrice}>
                                            ₱{Number(item.discountedPrice)?.toFixed(2)}
                                        </Text>
                                        <View style={styles.discountBadge}>
                                            <Text style={styles.discountText}>
                                                -{Number(item.discountPercentage)}%
                                            </Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.price}>
                                        ₱{Number(item.basePrice).toFixed(2)}
                                    </Text>
                                )}
                            </View>

                            <Text style={styles.stock}>
                                {item.stock > 0 ? `In stock: ${item.stock}` : 'Out of stock'}
                            </Text>
                        </View>
                    </View>
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
    productCard: {
        flex: 1,
        margin: 8,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        maxWidth: '46%',
    },
    imageContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholder: {
        fontSize: 48,
    },
    productInfo: {
        padding: 12,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
        minHeight: 40,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    originalPrice: {
        fontSize: 12,
        color: '#999',
        textDecorationLine: 'line-through',
        marginRight: 6,
    },
    discountedPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginRight: 6,
    },
    discountBadge: {
        backgroundColor: '#d32f2f',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
    },
    stock: {
        fontSize: 12,
        color: '#666',
    },
});