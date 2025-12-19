import { Product } from "@/types/products";
import { Link, RelativePathString } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ProductCardProps {
    product: Product;
    onPress?: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
    return (
        <Link
            href={`/product/${product.uid}` as RelativePathString}
            asChild
        >
            <Pressable
                style={styles.productCard}
                onPress={onPress}
            >
                <View style={styles.imageContainer}>
                    {product.image ? (
                        <Text style={styles.imagePlaceholder}>🖼️</Text>
                    ) : (
                        <Text style={styles.imagePlaceholder}>📦</Text>
                    )}
                </View>

                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                    </Text>

                    <View style={styles.priceContainer}>
                        {Number(product.discountedPrice) ? (
                            <>
                                <Text style={styles.originalPrice}>
                                    ₱{Number(product.basePrice).toFixed(2)}
                                </Text>
                                <Text style={styles.discountedPrice}>
                                    ₱{Number(product.discountedPrice)?.toFixed(2)}
                                </Text>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>
                                        -{Number(product.discountPercentage)}%
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.price}>
                                ₱{Number(product.basePrice).toFixed(2)}
                            </Text>
                        )}
                    </View>

                    <Text style={styles.stock}>
                        {(() => {
                            const totalStock = product.variants?.reduce((acc, v) => acc + v.stock, 0) || 0;
                            return totalStock > 0 ? `In stock: ${totalStock}` : 'Out of stock';
                        })()}
                    </Text>
                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
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
