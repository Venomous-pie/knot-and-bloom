import { Product } from "@/types/products";
import { findLowestPrice } from "@/utils/pricing";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Link, RelativePathString, router } from "expo-router";
import { Pin, Star } from "lucide-react-native";
import React, { useState } from "react";
import {
    LayoutChangeEvent,
    Platform,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
    Image,
} from "react-native";

interface ProductCardProps {
    product: Product;
    onPress?: () => void;
    onWishlistToggle?: (productId: number, isWishlisted: boolean) => void;
    isWishlisted?: boolean;
    onPinPress?: () => void;
    isPinned?: boolean;
    style?: StyleProp<ViewStyle>;
}

// All colors now sourced from theme.colors (constants/theme.ts)

// --- Proportional Scale System ---
// All values are expressed as a ratio of the card's measured width.
// This guarantees consistent proportions no matter where the card is rendered.
const SCALE = {
    // Padding & spacing
    padding: 0.07,       // 200px → 14px
    gap: 0.030,          // 200px → 6px
    gapSm: 0.015,        // 200px → 3px
    // Font sizes
    categoryFont: 0.050, // 200px → 10px
    nameFont: 0.075,     // 200px → 15px
    ratingFont: 0.055,   // 200px → 11px
    sellerFont: 0.050,   // 200px → 10px
    priceFont: 0.100,    // 200px → 20px
    origPriceFont: 0.065,// 200px → 13px
    // Icon sizes
    iconSm: 0.060,       // 200px → 12px
    iconMd: 0.075,       // 200px → 15px
    // Badge
    badgeFont: 0.055,    // 200px → 11px
    badgePadH: 0.035,    // 200px → 7px
    badgePadV: 0.018,    // 200px → 3.6px
    // Action button
    actionBtn: 0.145,    // 200px → 29px
    actionRight: 0.055,  // 200px → 11px
} as const;

// Clamp a value to avoid extremes on very small or very large cards
function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function scale(width: number, ratio: number, min: number, max: number) {
    return clamp(width * ratio, min, max);
}

export default function ProductCard({
    product,
    onPress,
    onWishlistToggle,
    isWishlisted: externalWishlisted,
    onPinPress,
    isPinned,
    style,
}: ProductCardProps) {
    const [cardWidth, setCardWidth] = useState(200); // Default 200px until measured
    const [isHovered, setIsHovered] = useState(false);
    const [internalWishlisted, setInternalWishlisted] = useState(false);
    const isWishlisted = externalWishlisted ?? internalWishlisted;

    const handleLayout = (e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setCardWidth(w);
    };

    const s = {
        padding:       scale(cardWidth, SCALE.padding,     7,  20),
        gap:           scale(cardWidth, SCALE.gap,         3,  10),
        gapSm:         scale(cardWidth, SCALE.gapSm,       2,  5),
        categoryFont:  scale(cardWidth, SCALE.categoryFont, 7, 12),
        nameFont:      scale(cardWidth, SCALE.nameFont,    10,  18),
        ratingFont:    scale(cardWidth, SCALE.ratingFont,   8,  13),
        sellerFont:    scale(cardWidth, SCALE.sellerFont,   7,  12),
        priceFont:     scale(cardWidth, SCALE.priceFont,   12,  24),
        origPriceFont: scale(cardWidth, SCALE.origPriceFont, 9, 15),
        iconSm:        scale(cardWidth, SCALE.iconSm,       9,  16),
        iconMd:        scale(cardWidth, SCALE.iconMd,      11,  19),
        badgeFont:     scale(cardWidth, SCALE.badgeFont,    8,  12),
        badgePadH:     scale(cardWidth, SCALE.badgePadH,    4,  9),
        badgePadV:     scale(cardWidth, SCALE.badgePadV,    2,  5),
        actionBtn:     scale(cardWidth, SCALE.actionBtn,   20,  36),
        actionRight:   scale(cardWidth, SCALE.actionRight,  7,  14),
    };

    // Pricing logic
    const { lowestPriceVariant } = findLowestPrice(product);
    const selectedVariant = lowestPriceVariant;
    const basePrice = parseFloat(product.basePrice);
    const variantPrice = selectedVariant?.price ? parseFloat(selectedVariant.price.toString()) : basePrice;
    const discountPct = selectedVariant?.discountPercentage || product.discountPercentage || 0;
    const finalPrice = variantPrice * (1 - discountPct / 100);
    const hasDiscount = discountPct > 0;
    const isAvailable = selectedVariant ? selectedVariant.stock > 0 : true;
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
        <Link href={`/product/${product.uid}` as RelativePathString} asChild>
            <Pressable
                onLayout={handleLayout}
                style={StyleSheet.flatten([
                    styles.productCard,
                    style,
                    isHovered && styles.productCardHovered,
                ])}
                {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => setIsHovered(true),
                    onMouseLeave: () => setIsHovered(false),
                } : {})}
                onPress={onPress}
            >
                {/* Image */}
                <View style={styles.imageContainer}>
                    {displayImage ? (
                        <Image
                            source={{ uri: displayImage }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={{ color: theme.colors.textLight, fontSize: s.ratingFont }}>No Image</Text>
                        </View>
                    )}

                    {/* Pending Badge — top-left */}
                    {product.status === 'PENDING' && (
                        <View style={[styles.badge, {
                            backgroundColor: theme.colors.badgePending,
                            top: s.actionRight,
                            left: s.actionRight,
                            paddingHorizontal: s.badgePadH,
                            paddingVertical: s.badgePadV,
                        }]}>
                            <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>Pending</Text>
                        </View>
                    )}

                    {/* Status Badge — top-left, same level as heart */}
                    {product.status !== 'PENDING' && (() => {
                        if (product.soldCount > 20)
                            return (
                                <View style={[styles.badge, styles.badgeStatus, {
                                    backgroundColor: theme.colors.badgeTrending,
                                    top: s.actionRight,
                                    left: s.actionRight,
                                    paddingHorizontal: s.badgePadH,
                                    paddingVertical: s.badgePadV,
                                    flexDirection: 'row', alignItems: 'center', gap: 3,
                                }]}>
                                    <Ionicons name="flame" size={s.badgeFont} color="white" />
                                    <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>Trending</Text>
                                </View>
                            );
                        if (product.soldCount > 5)
                            return (
                                <View style={[styles.badge, {
                                    backgroundColor: theme.colors.badgePopular,
                                    top: s.actionRight,
                                    left: s.actionRight,
                                    paddingHorizontal: s.badgePadH,
                                    paddingVertical: s.badgePadV,
                                    flexDirection: 'row', alignItems: 'center', gap: 3,
                                }]}>
                                    <Ionicons name="flame" size={s.badgeFont} color="white" />
                                    <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>Popular</Text>
                                </View>
                            );
                        if (isAvailable && selectedVariant?.stock && selectedVariant.stock < 5)
                            return (
                                <View style={[styles.badge, {
                                    backgroundColor: theme.colors.badgeLowStock,
                                    top: s.actionRight,
                                    left: s.actionRight,
                                    paddingHorizontal: s.badgePadH,
                                    paddingVertical: s.badgePadV,
                                    flexDirection: 'row', alignItems: 'center', gap: 3,
                                }]}>
                                    <Ionicons name="flash" size={s.badgeFont} color="white" />
                                    <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>Last {selectedVariant.stock}</Text>
                                </View>
                            );
                        if ((Date.now() - new Date(product.uploaded).getTime()) < 1000 * 60 * 60 * 24 * 7)
                            return (
                                <View style={[styles.badge, {
                                    backgroundColor: theme.colors.primary,
                                    top: s.actionRight,
                                    left: s.actionRight,
                                    paddingHorizontal: s.badgePadH,
                                    paddingVertical: s.badgePadV,
                                    flexDirection: 'row', alignItems: 'center', gap: 3,
                                }]}>
                                    <Ionicons name="sparkles" size={s.badgeFont} color="white" />
                                    <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>New</Text>
                                </View>
                            );
                        return null;
                    })()}

                    {/* Discount Badge — bottom-left */}
                    {hasDiscount && product.status !== 'PENDING' && (
                        <View style={[styles.badge, {
                            backgroundColor: theme.colors.error,
                            bottom: s.actionRight,
                            left: s.actionRight,
                            paddingHorizontal: s.badgePadH,
                            paddingVertical: s.badgePadV,
                        }]}>
                            <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>-{Math.round(discountPct)}%</Text>
                        </View>
                    )}

                    {/* Pin Button */}
                    {onPinPress && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.actionButton,
                                {
                                    right: s.actionRight + s.actionBtn + s.gapSm,
                                    top: s.actionRight,
                                    width: s.actionBtn,
                                    height: s.actionBtn,
                                    borderRadius: s.actionBtn / 2,
                                },
                                pressed && styles.actionButtonPressed,
                                isPinned && styles.actionButtonActive,
                            ]}
                            onPress={(e) => { e.preventDefault(); e.stopPropagation(); onPinPress(); }}
                        >
                            <Pin size={s.iconSm} fill={isPinned ? "white" : "none"} color={isPinned ? "white" : theme.colors.textSecondary} />
                        </Pressable>
                    )}

                    {/* Wishlist Button — top-right */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            {
                                right: s.actionRight,
                                top: s.actionRight,
                                width: s.actionBtn,
                                height: s.actionBtn,
                                borderRadius: s.actionBtn / 2,
                            },
                            pressed && styles.actionButtonPressed,
                        ]}
                        onPress={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlistPress(); }}
                    >
                        <Ionicons
                            name={isWishlisted ? "heart" : "heart-outline"}
                            size={s.iconMd}
                            color={isWishlisted ? theme.colors.primary : theme.colors.textLight}
                        />
                    </Pressable>
                </View>

                {/* Product Info — compact, max 4 rows */}
                <View style={{ padding: s.padding, gap: s.gap }}>

                    {/* Row 1: Category */}
                    {product.categories?.length > 0 && (
                        <Text style={{
                            fontSize: s.categoryFont,
                            color: theme.colors.textLight,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                        }} numberOfLines={1}>
                            {product.categories.slice(0, 2).join(' • ')}
                        </Text>
                    )}

                    {/* Row 2: Name */}
                    <Text style={{
                        fontSize: s.nameFont,
                        fontWeight: "600",
                        color: theme.colors.text,
                        fontFamily: "Quicksand",
                        lineHeight: s.nameFont * 1.25,
                    }} numberOfLines={2}>
                        {product.name}
                    </Text>

                    {/* Row 3: Seller only */}
                    {product.seller ? (
                        <Pressable
                            onPress={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/seller/${product.seller?.slug}` as RelativePathString);
                            }}
                        >
                            <Text style={{ fontSize: s.sellerFont, color: theme.colors.textLight }} numberOfLines={1}>
                                <Text style={
                                    product?.seller?.name === 'Knot & Bloom'
                                        ? { fontWeight: '600', color: theme.colors.primary }
                                        : { textDecorationLine: 'underline' }
                                }>{product.seller.name}</Text>
                            </Text>
                        </Pressable>
                    ) : (
                        <Text style={{ fontSize: s.sellerFont, fontWeight: '600', color: theme.colors.primary }} numberOfLines={1}>
                            Knot & Bloom
                        </Text>
                    )}

                    {/* Row 4: Price */}
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: s.gap }}>
                        <Text style={{ fontSize: s.priceFont, fontWeight: "700", color: theme.colors.primary }}>
                            ₱{finalPrice.toFixed(2)}
                        </Text>
                        {hasDiscount && (
                            <Text style={{ fontSize: s.origPriceFont, color: theme.colors.textLight, textDecorationLine: "line-through" }}>
                                ₱{variantPrice.toFixed(2)}
                            </Text>
                        )}
                    </View>

                </View>
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    productCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    productCardHovered: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    imageContainer: {
        aspectRatio: 1,
        backgroundColor: theme.colors.backgroundAlt,
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
    badge: {
        position: "absolute",
        borderRadius: 6,
    },
    badgeText: {
        color: "white",
        fontWeight: "700",
    },
    badgeStatus: {
        // Status badges (Trending, New, etc.) have slightly rounded pill shape
        borderRadius: 20,
    },
    actionButton: {
        position: "absolute",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButtonPressed: {
        opacity: 0.8,
    },
    actionButtonActive: {
        backgroundColor: theme.colors.primary,
    },
});
