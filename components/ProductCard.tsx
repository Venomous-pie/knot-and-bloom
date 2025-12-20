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

                    {(() => {
                        // Find the variant with the lowest price
                        let lowestPriceVariant: any = null;
                        let minPrice = Infinity;
                        let maxPrice = -Infinity;

                        if (product.variants && product.variants.length > 0) {
                            product.variants.forEach(v => {
                                const price = v.price || Number(product.basePrice);
                                if (price < minPrice) {
                                    minPrice = price;
                                    lowestPriceVariant = v;
                                }
                                if (price > maxPrice) {
                                    maxPrice = price;
                                }
                            });
                        }

                        // Use variant price if available, otherwise fallback to product price. Ensure it's a number.
                        let displayPrice = Number(lowestPriceVariant?.price || product.discountedPrice || product.basePrice);
                        let originalPrice = Number(product.basePrice); // Initialize with product base price
                        let hasDiscount = false;
                        let discountPercentage = 0;

                        // Check for variant-specific discount first
                        if (lowestPriceVariant && lowestPriceVariant.discountPercentage) {
                            originalPrice = Number(lowestPriceVariant.price || product.basePrice);
                            displayPrice = originalPrice * (1 - lowestPriceVariant.discountPercentage / 100);
                            hasDiscount = true;
                            discountPercentage = lowestPriceVariant.discountPercentage;
                        } else if (product.discountPercentage) {
                            // Variant has no specific discount, but Product has generic discount.
                            // Inherit product discount percentage applied to variant price.
                            originalPrice = Number(lowestPriceVariant?.price || product.basePrice);
                            displayPrice = originalPrice * (1 - product.discountPercentage / 100);
                            hasDiscount = true;
                            discountPercentage = product.discountPercentage;
                        } else if (product.discountedPrice) {
                            // Fallback for legacy data where only discountedPrice exists without percentage (unlikely but safe)
                            originalPrice = Number(product.basePrice);
                            displayPrice = Number(product.discountedPrice);
                            hasDiscount = true;
                            // Calculate inferred percentage for display
                            discountPercentage = Math.round(((originalPrice - displayPrice) / originalPrice) * 100);
                        }

                        // Check if we have variable prices
                        const hasVariablePrice = minPrice !== Infinity && maxPrice !== -Infinity && minPrice !== maxPrice;

                        // Stock logic: Check if any stock exists. 
                        // User preference: Just "In Stock" without count.
                        const hasStock = lowestPriceVariant ? lowestPriceVariant.stock > 0 : (Number((product as any).stock) > 0 || (product.variants && product.variants.some(v => v.stock > 0)));
                        // Note: product.stock check is a fallback; `some` check handles case where lowest variant might be 0 but others exist (unlikely for "from" price logic, but safe).
                        // Actually, if we show "From X", we usually imply availability of X. Let's stick to the stock of the displayed variant/product for consistency, OR check if *any* is in stock.
                        // Given the "lowest price" variant is the one being advertised:
                        const displayStockCount = lowestPriceVariant ? lowestPriceVariant.stock : 0;
                        // Simpler logic based on "lowest price variant" availability:
                        const isAvailable = lowestPriceVariant ? lowestPriceVariant.stock > 0 : true; // Default to true if no variant info (or handle product.stock if strictly needed)


                        // Determine if we show discount
                        // Already calculated above in hasDiscount

                        return (
                            <>
                                <View style={styles.priceContainer}>
                                    {hasDiscount ? (
                                        <View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.originalPrice}>
                                                    From ₱{originalPrice.toFixed(2)}
                                                </Text>
                                                <View style={styles.discountBadge}>
                                                    <Text style={styles.discountText}>
                                                        -{Number(discountPercentage)}%
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.discountedPrice}>
                                                To ₱{displayPrice.toFixed(2)}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.price}>
                                            {hasVariablePrice ? 'From ' : ''}₱{displayPrice.toFixed(2)}
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
