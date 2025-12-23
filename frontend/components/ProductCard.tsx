import { Product } from "@/types/products";
import { calculatePrice, findLowestPrice } from "@/utils/pricing";
import { Ionicons } from "@expo/vector-icons";
import { Link, RelativePathString } from "expo-router";
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

// Theme colors - Knot & Bloom Branding
const COLORS = {
    card: "#FFFFFF",
    border: "#E8E8E8",
    primary: "#5A4A42", // Warm earthy brown (neutral, crafty feel)
    primaryForeground: "#FFFFFF",
    accent: "#C77D8E", // Dusty rose from logo (used sparingly)
    accentForeground: "#FFFFFF",
    muted: "#F5F5F5", // Light neutral gray
    mutedForeground: "#7A7A7A",
    foreground: "#2C2C2C", // Dark charcoal for text
    secondary: "#f9f5f7ff", // Warm off-white/cream
    secondaryForeground: "#5C5C5C",
    amber: "#D4A574", // Warm tan/beige for highlights
    error: "#DC2626",
    success: "#7BA381", // Soft sage green (crafty/natural)
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
    const [isPressed, setIsPressed] = useState(false);
    const isWishlisted = externalWishlisted ?? internalWishlisted;

    // Find lowest price and calculate discount
    const { lowestPriceVariant } = findLowestPrice(product);
    const priceCalc = calculatePrice(product, lowestPriceVariant);

    const isAvailable = lowestPriceVariant
        ? lowestPriceVariant.stock > 0
        : true;

    const handleWishlistPress = () => {
        const newWishlistState = !isWishlisted;
        if (onWishlistToggle) {
            onWishlistToggle(product.uid, newWishlistState);
        } else {
            setInternalWishlisted(newWishlistState);
        }
    };

    // Generate rating stars
    const renderStars = (rating: number = 0) => {
        return [...Array(5)].map((_, i) => (
            <Ionicons
                key={i}
                name={i < Math.floor(rating) ? "star" : "star-outline"}
                size={12}
                color={i < Math.floor(rating) ? COLORS.amber : COLORS.mutedForeground}
            />
        ));
    };

    // Get product tags from categories
    const tags = product.categories?.slice(0, 2) || [];

    // Check if new arrival (uploaded within last 7 days)
    const isNewArrival = () => {
        if (!product.uploaded) return false;
        const uploadDate = new Date(product.uploaded);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return uploadDate > sevenDaysAgo;
    };

    const badge = isNewArrival() ? "New!" : null;

    return (
        <Link
            href={`/product/${product.uid}` as RelativePathString}
            asChild
        >
            <Pressable
                style={StyleSheet.flatten([
                    styles.productCard,
                    style,
                    (isPressed || isHovered) && styles.productCardHovered,
                ])}
                {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => setIsHovered(true),
                    onMouseLeave: () => setIsHovered(false),
                } : {})}
                onPress={onPress}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
            >
                {/* Image Container */}
                <View style={styles.imageContainer}>
                    {/* ... (image logic) */}
                    {product.image ? (
                        <Image
                            source={{ uri: product.image }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Ionicons name="image-outline" size={isSmallScreen ? 28 : 38} color={COLORS.mutedForeground} />
                        </View>
                    )}

                    {/* Badge (New Arrival) */}
                    {badge && (
                        <View style={styles.badge}>
                            <Text style={[styles.badgeText, isSmallScreen && { fontSize: 9 }]}>{badge}</Text>
                        </View>
                    )}

                    {/* Discount Badge */}
                    {priceCalc.hasDiscount && (
                        <View style={[styles.discountBadge, badge ? styles.discountBadgeWithBadge : null]}>
                            <Text style={[styles.discountBadgeText, isSmallScreen && { fontSize: 9 }]}>
                                -{priceCalc.discountPercentage}%
                            </Text>
                        </View>
                    )}

                    {/* ... (wishlist button) */}
                    <Pressable
                        style={({ pressed }) => StyleSheet.flatten([
                            styles.wishlistButton,
                            pressed && styles.wishlistButtonPressed,
                            isSmallScreen && { width: 28, height: 28, borderRadius: 14 }
                        ])}
                        onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleWishlistPress();
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isWishlisted ? "heart" : "heart-outline"}
                            size={isSmallScreen ? 16 : 18}
                            color={isWishlisted ? COLORS.accent : COLORS.mutedForeground}
                        />
                    </Pressable>

                    {/* Out of Stock Overlay */}
                    {!isAvailable && (
                        <View style={styles.outOfStockOverlay}>
                            <Text style={[styles.outOfStockText, isSmallScreen && { fontSize: 10 }]}>Out of Stock</Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={[styles.productInfo, isSmallScreen && { padding: 10 }]}>
                    {/* Tags */}
                    {tags.length > 0 && (
                        <View style={[styles.tagsContainer, isSmallScreen && { height: 52, marginBottom: 4 }]}>
                            {tags.map((tag, index) => (
                                <View key={index} style={[styles.tag, isSmallScreen && { paddingVertical: 2, paddingHorizontal: 6 }]}>
                                    <Text style={[styles.tagText, isSmallScreen && { fontSize: 10 }]}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Name */}
                    <Text style={[styles.productName, isSmallScreen && { fontSize: 13, lineHeight: 18, marginBottom: 4 }]} numberOfLines={2}>
                        {product.name}
                    </Text>


                    {/* Seller Attribution */}
                    {/* Seller Attribution */}
                    {product.seller ? (
                        <Link href={`/seller/${product.seller.slug}` as RelativePathString} asChild>
                            <Pressable style={styles.sellerContainer}>
                                <Text style={[styles.sellerText, isSmallScreen && { fontSize: 9 }]}>
                                    Sold by <Text style={
                                        product.seller.name === 'Knot & Bloom'
                                            ? { fontWeight: '600', color: COLORS.primary }
                                            : { textDecorationLine: 'underline' }
                                    }>{product.seller.name}</Text>
                                </Text>
                            </Pressable>
                        </Link>
                    ) : (
                        <View style={styles.sellerContainer}>
                            <Text style={[styles.sellerText, isSmallScreen && { fontSize: 9 }]}>
                                Sold by <Text style={{ fontWeight: '600', color: COLORS.primary }}>Knot & Bloom</Text>
                            </Text>
                        </View>
                    )}


                    {/* Rating & Sold Count */}
                    {(product.variants?.length > 0 || product.soldCount > 0) && (
                        <View style={[styles.ratingContainer, isSmallScreen && { marginBottom: 4 }]}>
                            {product.variants?.length > 0 && (
                                <>
                                    <View style={styles.starsContainer}>
                                        {renderStars(4.5)}
                                    </View>
                                    <Text style={[styles.reviewCount, isSmallScreen && { fontSize: 9 }]}>
                                        ({product.variants.length})
                                    </Text>
                                </>
                            )}

                            {/* Separator if both exist */}
                            {product.variants?.length > 0 && product.soldCount > 0 && (
                                <Text style={[styles.reviewCount, { marginHorizontal: 4 }, isSmallScreen && { fontSize: 9 }]}>•</Text>
                            )}

                            {/* Sold Count */}
                            {product.soldCount > 0 && (
                                <Text style={[styles.soldText, isSmallScreen && { fontSize: 9 }]}>
                                    {product.soldCount >= 1000
                                        ? `${(product.soldCount / 1000).toFixed(1)}k sold`
                                        : `${product.soldCount} sold`}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Price */}
                    <View style={styles.priceContainer}>
                        {priceCalc.hasDiscount ? (
                            <View style={styles.priceRow}>
                                <Text style={[styles.currentPrice, isSmallScreen && { fontSize: 14 }]}>
                                    ₱{priceCalc.finalPrice.toFixed(2)}
                                </Text>
                                <Text style={[styles.originalPrice, isSmallScreen && { fontSize: 11 }]}>
                                    ₱{priceCalc.effectivePrice.toFixed(2)}
                                </Text>
                            </View>
                        ) : (
                            <Text style={[styles.currentPrice, isSmallScreen && { fontSize: 14 }]}>
                                ₱{priceCalc.finalPrice.toFixed(2)}
                            </Text>
                        )}

                        {priceCalc.hasDiscount && (
                            <View style={styles.saveBadge}>
                                <Text style={[styles.saveBadgeText, isSmallScreen && { fontSize: 9 }]}>
                                    Save ₱{(priceCalc.effectivePrice - priceCalc.finalPrice).toFixed(2)}!
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        // Enhanced generic shadow for all platforms
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 5,
        marginBottom: 16,
    },
    productCardHovered: {
        // Stronger shadow on hover
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 10,
        backgroundColor: "#FFFFFF",
    },
    imageContainer: {
        width: "100%",
        aspectRatio: 1,
        backgroundColor: COLORS.muted,
        position: "relative",
        overflow: "hidden",
    },
    productImage: {
        width: "100%",
        height: "100%",
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.muted,
    },
    badge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        color: COLORS.primaryForeground,
        fontSize: 6,
        fontWeight: 'bold',
    },
    discountBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: COLORS.accent,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountBadgeWithBadge: {
        top: 12,
        left: 60,
    },
    discountBadgeText: {
        color: COLORS.accentForeground,
        fontSize: 6,
        fontWeight: "700",
    },
    wishlistButton: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 28,
        height: 28,
        borderRadius: 18,
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
        opacity: 0.7,
    },
    outOfStockOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingVertical: 8,
        alignItems: "center",
    },
    outOfStockText: {
        color: "#FFFFFF",
        fontSize: 6,
        fontWeight: "600",
    },
    productInfo: {
        padding: 14,
        flex: 1, // Allow content to stretch
        flexDirection: "column",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 8,
        height: 48, // Fixed height for ~2 lines of tags. usage: (fontSize + padding) * 2 + gap
        overflow: "hidden", // Hide anything that exceeds 2 lines
    },
    tag: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 12,
        color: COLORS.secondaryForeground,
        fontWeight: "500",
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.foreground,
        marginBottom: 6,
        lineHeight: 20,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 4,
    },
    sellerContainer: {
        marginBottom: 6,
    },
    sellerText: {
        fontSize: 11,
        color: COLORS.mutedForeground,
        fontWeight: "400",
    },
    starsContainer: {
        flexDirection: "row",
        gap: 2,
    },
    reviewCount: {
        fontSize: 10,
        color: COLORS.mutedForeground,
    },
    soldText: {
        fontSize: 10,
        color: COLORS.mutedForeground,
        fontWeight: "500",
    },
    priceContainer: {
        gap: 4,
        marginTop: "auto", // Push to bottom
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    currentPrice: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    originalPrice: {
        fontSize: 13,
        color: COLORS.mutedForeground,
        textDecorationLine: "line-through",
    },
    saveBadge: {
        backgroundColor: `${COLORS.accent}33`, // 20% opacity
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        alignSelf: "flex-start",
    },
    saveBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.accent,
    },
});
