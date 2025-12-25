import { Product } from "@/types/products";
import { findLowestPrice } from "@/utils/pricing";
import { Ionicons } from "@expo/vector-icons";
import { Link, RelativePathString, router } from "expo-router";
import { Star } from "lucide-react-native";
import React, { useState } from "react";
import {
    Image,
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
    useWindowDimensions,
} from "react-native";

interface ProductCardProps {
    product: Product;
    onPress?: () => void;
    onWishlistToggle?: (productId: number, isWishlisted: boolean) => void;
    isWishlisted?: boolean;
    style?: StyleProp<ViewStyle>;
}

// Theme colors from ProductPreview
const COLORS = {
    primary: "#B36979",
    background: "#FFFFFF",
    border: "#eee",
    text: "#333",
    muted: "#888",
    backgroundAlt: "#f9f9f9",
    success: "#4CAF50",
    error: "#E53935",
};

export default function ProductCard({
    product,
    onPress,
    onWishlistToggle,
    isWishlisted: externalWishlisted,
    style,
}: ProductCardProps) {
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 768;

    const [internalWishlisted, setInternalWishlisted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isWishlisted = externalWishlisted ?? internalWishlisted;

    // Pricing logic
    const { lowestPriceVariant } = findLowestPrice(product);
    // Default to lowest price variant for display
    const selectedVariant = lowestPriceVariant;

    // Calculate display price based on simple logic similar to Preview
    const basePrice = parseFloat(product.basePrice);
    const variantPrice = selectedVariant?.price ? parseFloat(selectedVariant.price.toString()) : basePrice;
    const discountPct = selectedVariant?.discountPercentage || product.discountPercentage || 0;

    const finalPrice = variantPrice * (1 - discountPct / 100);
    const hasDiscount = discountPct > 0;

    const isAvailable = selectedVariant?.stock ? selectedVariant.stock > 0 : true;

    // Images: specific variant image or default product image
    const displayImage = selectedVariant?.image || product.image;

    const handleWishlistPress = () => {
        const newWishlistState = !isWishlisted;
        if (onWishlistToggle) {
            onWishlistToggle(product.uid, newWishlistState);
        } else {
            setInternalWishlisted(newWishlistState);
        }
    };

    return (
        <Link
            href={`/product/${product.uid}` as RelativePathString}
            asChild
        >
            <Pressable
                style={StyleSheet.flatten([
                    styles.productCard,
                    style,
                    (isHovered) && styles.productCardHovered,
                ])}
                {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => setIsHovered(true),
                    onMouseLeave: () => setIsHovered(false),
                } : {})}
                onPress={onPress}
            >
                {/* Image Container */}
                <View style={styles.imageContainer}>
                    {displayImage ? (
                        <Image
                            source={{ uri: displayImage }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>-{Math.round(discountPct)}%</Text>
                        </View>
                    )}

                    {/* Wishlist Button (Presaved from old card) */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.wishlistButton,
                            pressed && styles.wishlistButtonPressed,
                        ]}
                        onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleWishlistPress();
                        }}
                    >
                        <Ionicons
                            name={isWishlisted ? "heart" : "heart-outline"}
                            size={18}
                            color={isWishlisted ? COLORS.primary : "#999"}
                        />
                    </Pressable>
                </View>

                {/* Product Info */}
                <View style={[styles.productInfo, isSmallScreen && styles.productInfoMobile]}>
                    {/* Categories */}
                    {product.categories?.length > 0 && (
                        <Text style={[styles.categoryText, isSmallScreen && styles.categoryTextMobile]} numberOfLines={1}>
                            {product.categories.slice(0, 2).join(' • ')}
                        </Text>
                    )}

                    {/* Name */}
                    <Text style={[styles.productName, isSmallScreen && styles.productNameMobile]} numberOfLines={2}>
                        {product.name}
                    </Text>

                    {/* Marketing / Rating Row */}
                    <View style={[styles.ratingRow, isSmallScreen && styles.ratingRowMobile]}>
                        {product.soldCount > 5 ? (
                            <>
                                <Ionicons name="flame" size={isSmallScreen ? 12 : 14} color="#FF6B6B" />
                                <Text style={[styles.ratingText, isSmallScreen && styles.ratingTextMobile, { color: "#FF6B6B", fontWeight: "600" }]}>
                                    {product.soldCount > 20 ? "Trending" : `${product.soldCount} bought recently`}
                                </Text>
                            </>
                        ) : isAvailable && selectedVariant?.stock && selectedVariant.stock < 5 ? (
                            <>
                                <Ionicons name="flash" size={isSmallScreen ? 12 : 14} color="#FFB800" />
                                <Text style={[styles.ratingText, isSmallScreen && styles.ratingTextMobile, { color: "#E0A800", fontWeight: "600" }]}>
                                    Only {selectedVariant.stock} left
                                </Text>
                            </>
                        ) : (Date.now() - new Date(product.uploaded).getTime()) < 1000 * 60 * 60 * 24 * 7 ? (
                            <>
                                <Ionicons name="sparkles" size={isSmallScreen ? 12 : 14} color={COLORS.primary} />
                                <Text style={[styles.ratingText, isSmallScreen && styles.ratingTextMobile, { color: COLORS.primary, fontWeight: "600" }]}>
                                    New Arrival
                                </Text>
                            </>
                        ) : (
                            <Text style={[styles.ratingText, isSmallScreen && styles.ratingTextMobile, { marginLeft: 0, fontStyle: 'italic' }]}>
                                {product.categories?.[0] || "Fresh Find"}
                            </Text>
                        )}
                    </View>

                    {/* Seller Attribution */}
                    {product.seller ? (
                        <Pressable
                            style={styles.sellerContainer}
                            onPress={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/seller/${product.seller?.slug}` as RelativePathString);
                            }}
                        >
                            <Text style={[styles.sellerText, isSmallScreen && styles.sellerTextMobile]}>
                                Sold by <Text style={
                                    product?.seller?.name === 'Knot & Bloom'
                                        ? { fontWeight: '600', color: COLORS.primary }
                                        : { textDecorationLine: 'underline' }
                                }>{product.seller.name}</Text>
                            </Text>
                        </Pressable>
                    ) : (
                        <View style={styles.sellerContainer}>
                            <Text style={[styles.sellerText, isSmallScreen && styles.sellerTextMobile]}>
                                Sold by <Text style={{ fontWeight: '600', color: COLORS.primary }}>Knot & Bloom</Text>
                            </Text>
                        </View>
                    )}

                    {/* Price */}
                    <View style={[styles.priceRow, isSmallScreen && styles.priceRowMobile]}>
                        <Text style={[styles.finalPrice, isSmallScreen && styles.finalPriceMobile]}>
                            ₱{finalPrice.toFixed(2)}
                        </Text>
                        {hasDiscount && (
                            <Text style={[styles.originalPrice, isSmallScreen && styles.originalPriceMobile]}>
                                ₱{variantPrice.toFixed(2)}
                            </Text>
                        )}
                    </View>

                    {/* Stock Status */}
                    <View style={[styles.stockRow, isSmallScreen && styles.stockRowMobile]}>
                        <View style={[
                            styles.stockIndicator,
                            isSmallScreen && styles.stockIndicatorMobile,
                            isAvailable ? styles.stockInStock : styles.stockOutOfStock
                        ]} />
                        <Text style={[styles.stockText, isSmallScreen && styles.stockTextMobile]}>
                            {isAvailable ? 'In stock' : 'Out of stock'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: "white",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    productCardHovered: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    imageContainer: {
        aspectRatio: 1,
        backgroundColor: "#f5f5f5",
        position: "relative",
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        color: "#999",
        fontSize: 14,
    },
    discountBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: COLORS.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    discountBadgeText: {
        color: "white",
        fontSize: 12,
        fontWeight: "700",
    },
    wishlistButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    wishlistButtonPressed: {
        opacity: 0.8,
    },
    productInfo: {
        padding: 16,
        gap: 8,
    },
    categoryText: {
        fontSize: 11,
        color: COLORS.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        fontFamily: "Quicksand", // Assuming font is available per request
        lineHeight: 22,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        color: COLORS.muted,
        marginLeft: 4,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    finalPrice: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: "#999",
        textDecorationLine: "line-through",
    },
    stockRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
    },
    stockIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stockInStock: {
        backgroundColor: COLORS.success,
    },
    stockOutOfStock: {
        backgroundColor: COLORS.error,
    },
    stockText: {
        fontSize: 12,
        color: "#666",
    },
    sellerContainer: {
        // Optional additional styling if needed
    },
    sellerText: {
        fontSize: 11,
        color: COLORS.muted,
    },
    // Mobile-specific styles
    productInfoMobile: {
        padding: 10,
        gap: 4,
    },
    categoryTextMobile: {
        fontSize: 9,
    },
    productNameMobile: {
        fontSize: 13,
        lineHeight: 18,
    },
    ratingRowMobile: {
        gap: 2,
    },
    ratingTextMobile: {
        fontSize: 10,
        marginLeft: 2,
    },
    sellerTextMobile: {
        fontSize: 9,
    },
    priceRowMobile: {
        gap: 6,
    },
    finalPriceMobile: {
        fontSize: 16,
    },
    originalPriceMobile: {
        fontSize: 11,
    },
    stockRowMobile: {
        gap: 4,
        marginTop: 2,
    },
    stockIndicatorMobile: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stockTextMobile: {
        fontSize: 10,
    },
});
