import { Product } from "@/types/products";
import { calculatePrice, findLowestPrice } from "@/utils/pricing";
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

                    {(() => {
                        // Find the lowest price variant using helper
                        const { lowestPrice, lowestPriceVariant } = findLowestPrice(product);
                        const priceCalc = calculatePrice(product, lowestPriceVariant);

                        // Determine if we should show "From" (multiple different prices)
                        const hasVariablePrice = product.variants && product.variants.length > 1 &&
                            product.variants.some(v => {
                                const vCalc = calculatePrice(product, v);
                                return vCalc.finalPrice !== lowestPrice;
                            });

                        // Check stock availability
                        const isAvailable = lowestPriceVariant
                            ? lowestPriceVariant.stock > 0
                            : true;

                        return (
                            <>
                                <View style={styles.priceContainer}>
                                    {priceCalc.hasDiscount ? (
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.originalPrice}>
                                                    {hasVariablePrice ? 'From ' : ''}₱{priceCalc.effectivePrice.toFixed(2)}
                                                </Text>
                                                <View style={styles.discountBadge}>
                                                    <Text style={styles.discountText}>
                                                        -{priceCalc.discountPercentage}%
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.discountedPrice}>
                                                {hasVariablePrice ? 'To ' : ''}₱{priceCalc.finalPrice.toFixed(2)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.price}>
                                            {hasVariablePrice ? 'From ' : ''}₱{priceCalc.finalPrice.toFixed(2)}
                                        </Text>
                                    )}
                                </View>

                                <Text style={styles.stock}>
                                    {isAvailable ? 'In Stock' : 'Out of stock'}
                                </Text>
                            </>
                        );
                    })()}
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
