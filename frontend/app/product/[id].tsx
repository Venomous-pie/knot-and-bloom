import { cartAPI, productAPI, sellerAPI } from "@/api/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/types/products";
import { calculatePrice } from "@/utils/pricing";
import { router, useLocalSearchParams, Stack, Link } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { getCachedProduct, cacheProduct } from "@/utils/productCache";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { theme } from "@/constants/theme";
import { User } from "@/types/user";
import MakerCard from "@/components/product/MakerCard";
import Footer from "@/components/home/Footer";
import ProductPageSkeleton from "@/components/product/ProductPageSkeleton";

const MOCK_REVIEWS = [
    {
        id: "1",
        userName: "Sarah M.",
        rating: 5,
        date: "2 days ago",
        text: "Absolutely love this! The quality is amazing and it looks exactly like the pictures. Will definitely buy again.",
        helpful: 12
    },
    {
        id: "2",
        userName: "Jessica K.",
        rating: 4,
        date: "1 week ago",
        text: "Very cute and fits well. The material is slightly thinner than I expected, but still great for the price.",
        helpful: 5
    },
    {
        id: "3",
        userName: "Amanda T.",
        rating: 5,
        date: "2 weeks ago",
        text: "Perfect! Fast shipping and excellent packaging. Highly recommended shop.",
        helpful: 8
    }
];

export default function ProductDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const cachedProduct = getCachedProduct(id as string);
    const [product, setProduct] = useState<Product | null>(cachedProduct);
    const [loading, setLoading] = useState(!cachedProduct);
    const [error, setError] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [skuCopied, setSkuCopied] = useState(false);
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [makers, setMakers] = useState<User[]>([]);

    const allImages = React.useMemo(() => {
        if (!product) return [];
        const imgs: string[] = [];
        if (product.image) imgs.push(product.image);
        if (product.images) imgs.push(...product.images);
        product.variants?.forEach(v => {
            if (v.images && v.images.length > 0) {
                imgs.push(...v.images);
            }
        });
        return Array.from(new Set(imgs));
    }, [product]);

    useEffect(() => {
        if (selectedVariant && product) {
            const variant = product.variants.find(v => v.name === selectedVariant);
            if (variant && variant.images && variant.images.length > 0) {
                setSelectedImage(variant.images[0]);
            }
        }
    }, [selectedVariant, product]);

    const displayImage = selectedImage || product?.image || null;

    const { user } = useAuth();
    const { refreshCart, triggerCartAnimation, setCartCount, cartCount, cartItems } = useCart();
    const { wishlistedProductIds, toggleWishlist } = useWishlist();
    const buttonRef = useRef<View>(null);

    const isWishlisted = product ? wishlistedProductIds.has(product.uid) : false;

    const handleToggleWishlist = async () => {
        if (!user) {
            Alert.alert("Login Required", "Please log in to save items to your wishlist.", [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => router.push('/auth') }
            ]);
            return;
        }
        if (!product) return;
        await toggleWishlist(product.uid);
    };

    useEffect(() => {
        if (!id) {
            setError("Invalid product ID");
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                if (!cachedProduct) setLoading(true);
                setError(null);

                const response = await productAPI.getProductById(id);
                const fetchedProduct = response.data.product;
                setProduct(fetchedProduct);
                cacheProduct(fetchedProduct);

                if (fetchedProduct.variants && fetchedProduct.variants.length > 0) {
                    setSelectedVariant(fetchedProduct.variants[0].name);
                }
            } catch (err: any) {
                console.error("Error fetching product:", err);
                setError(err.response?.data?.message || "Failed to load product");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    // --- Heuristic Recommendation Algorithm ---
    // After the main product is loaded, fetch same-category products,
    // filter out the current product, sort by bestselling, and cap at 10.
    useEffect(() => {
        if (!product) return;

        const fetchRecommendations = async () => {
            try {
                const primaryCategory = product.categories?.[0];
                let response = await productAPI.getProducts({
                    category: primaryCategory,
                    sort: 'bestselling',
                    limit: 11, // Fetch 11 so we can filter out the current one and still have 10
                });

                let filtered = response.data.products
                    .filter((p: any) => p.uid !== product.uid)
                    .slice(0, 10);

                if (filtered.length === 0) {
                    response = await productAPI.getProducts({
                        sort: 'bestselling',
                        limit: 5,
                    });
                    filtered = response.data.products
                        .filter((p: any) => p.uid !== product.uid)
                        .slice(0, 5);
                }

                setRecommendations(filtered);
            } catch (e) {
                // Silently fail — recommendations are non-critical
                console.warn('Could not load recommendations', e);
            }
        };

        fetchRecommendations();
    }, [product?.uid]);

    // --- Meet the Maker Fetch ---
    useEffect(() => {
        const fetchMakers = async () => {
            try {
                const response = await sellerAPI.getActiveSellers();
                setMakers(response.data.slice(0, 5));
            } catch (err) {
                console.warn('Could not load makers', err);
            }
        };

        fetchMakers();
    }, []);

    const handleAddToCart = async () => {
        if (!product) return;

        if (product.variants.length > 0 && !selectedVariant) {
            Alert.alert("Select a Variant", "Please select a variant before adding to cart.");
            return;
        }

        if (!user) {
            Alert.alert("Login Required", "Please log in to add items to your cart.", [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => router.push('/auth') }
            ]);
            return;
        }

        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        const isInStock = totalStock > 0;

        if (!isInStock) {
            Alert.alert("Out of Stock", "This item is currently unavailable.");
            return;
        }

        if (selectedVariant) {
            const variant = product.variants.find(v => v.name === selectedVariant);
            if (variant && variant.stock <= 0) {
                Alert.alert("Out of Stock", "The selected variant is out of stock.");
                return;
            }
        }

        try {
            buttonRef.current?.measure((x, y, btnWidth, btnHeight, pageX, pageY) => {
                triggerCartAnimation({ x: pageX + btnWidth / 2, y: pageY + btnHeight / 2 });
            });

            const isNewItem = !cartItems.some((item: any) => 
                item.productId === product.uid && 
                (selectedVariant ? item.productVariant?.name === selectedVariant : true)
            );

            if (isNewItem) {
                setCartCount(cartCount + 1);
            }

            cartAPI.addToCart(user.uid, product.uid, 1, selectedVariant).then(response => {
                if (response.data && response.data.cartCount !== undefined) {
                    setCartCount(response.data.cartCount);
                }
                refreshCart();
            }).catch(error => {
                console.error("❌ API Failed:", error);
                if (isNewItem) setCartCount(cartCount);
                Alert.alert("Error", "Failed to add item to cart. Please try again.");
            });

            setTimeout(() => {
                Alert.alert(
                    "Added to Cart",
                    `${product.name} ${selectedVariant ? `(${selectedVariant})` : ''} has been added to your cart.`,
                    [
                        { text: "Continue Shopping", style: "cancel" },
                        { text: "View Cart", onPress: () => router.push('/cart') }
                    ]
                );
            }, 800);
        } catch (error: any) {
            console.error("❌ Error:", error);
            Alert.alert("Error", "Something went wrong.");
        }
    };

    if (loading) {
        return <ProductPageSkeleton />;
    }

    if (error || !product) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textLight} style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>{error || "Product not found"}</Text>
                <Pressable style={styles.backToProductsButton} onPress={() => router.back()}>
                    <Text style={styles.backToProductsText}>← Back to Products</Text>
                </Pressable>
            </View>
        );
    }

    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    const isInStock = totalStock > 0;

    const handleCopySKU = async (sku: string) => {
        if (!sku) return;
        await Clipboard.setStringAsync(sku);
        setSkuCopied(true);
        setTimeout(() => setSkuCopied(false), 2000);
    };

    const selectedVariantObj = selectedVariant
        ? product.variants.find(v => v.name === selectedVariant)
        : null;
    // Always display the main product's base price
    const priceCalc = calculatePrice(product, null);

    const renderSellerInfo = () => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Store / Seller Info</Text>
            <View style={styles.sellerInfoContent}>
                <View style={styles.sellerAvatar}>
                    <Text style={styles.sellerAvatarText}>
                        {(product.seller?.name || 'Knot & Bloom')[0]}
                    </Text>
                </View>
                <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{product.seller?.name || 'Knot & Bloom'}</Text>
                    <View style={styles.sellerRatingRow}>
                        <Ionicons name="star" size={12} color={theme.colors.starGold} />
                        <Text style={styles.sellerRatingText}>
                            {(product.seller as any)?.rating && Number((product.seller as any).rating) > 0 
                                ? `${(product.seller as any).rating}/5.0` 
                                : 'New Seller'}
                        </Text>
                    </View>
                </View>
                <Pressable
                    style={styles.visitStoreButton}
                    onPress={() => {
                        if (product.seller?.slug) {
                            router.push(`/seller/${product.seller.slug}` as any);
                        }
                    }}
                >
                    <Text style={styles.visitStoreText}>Visit Store</Text>
                </Pressable>
            </View>
        </View>
    );

    const renderBreadcrumbs = () => {
        if (!product) return null;

        const crumbs: { label: string, href: string | null }[] = [
            { label: 'Home', href: '/' }
        ];

        if (product.categories && product.categories.length > 0) {
            // We use up to 2 categories so it doesn't get ridiculously long
            const visibleCats = product.categories.slice(0, 2);
            visibleCats.forEach(cat => {
                crumbs.push({ label: cat, href: `/products/${encodeURIComponent(cat)}` });
            });
        } else {
            crumbs.push({ label: 'Products', href: '/products/All' });
        }

        // Truncate product name if it's too long
        let truncatedName = product.name;
        if (truncatedName.length > 25) {
            truncatedName = truncatedName.substring(0, 25) + '...';
        }
        crumbs.push({ label: truncatedName, href: null });

        return (
            <View style={styles.breadcrumbContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {crumbs.map((crumb, index) => (
                        <View key={index} style={styles.breadcrumbItem}>
                            {crumb.href ? (
                                <Pressable onPress={() => router.push(crumb.href as any)}>
                                    <Text style={[styles.breadcrumbText, styles.breadcrumbTextClickable]}>
                                        {crumb.label}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text style={[styles.breadcrumbText, styles.breadcrumbTextActive]}>
                                    {crumb.label}
                                </Text>
                            )}
                            {index < crumbs.length - 1 && (
                                <Text style={styles.breadcrumbSeparator}>/</Text>
                            )}
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const renderReviews = () => (
        <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeaderRow, { marginBottom: 16 }]}>
                <Text style={styles.sectionTitle}>Customer Reviews ({MOCK_REVIEWS.length})</Text>
                <Pressable>
                    <Text style={styles.viewAllText}>View All &gt;</Text>
                </Pressable>
            </View>

            {MOCK_REVIEWS.map((review, index) => (
                <View key={review.id} style={[styles.reviewCard, index === MOCK_REVIEWS.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.reviewHeader}>
                        <View style={styles.reviewerAvatar}>
                            <Text style={styles.reviewerAvatarText}>{review.userName[0]}</Text>
                        </View>
                        <View style={styles.reviewerInfo}>
                            <Text style={styles.reviewerName}>{review.userName}</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Ionicons key={i} name={i <= review.rating ? "star" : "star-outline"} size={12} color={theme.colors.starGold} />
                                ))}
                            </View>
                        </View>
                        <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                    <Text style={styles.reviewText}>{review.text}</Text>
                    <View style={styles.reviewFooter}>
                        <Pressable style={styles.helpfulButton}>
                            <Ionicons name="thumbs-up-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
                        </Pressable>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ title: product.metaTitle || product.name || 'Product Details' }} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {renderBreadcrumbs()}

                <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>

                    {/* ================= LEFT COLUMN ================= */}
                    <View style={isDesktop ? styles.leftColumnDesktop : styles.leftColumnMobile}>

                        {/* Main Product Image */}
                        <View style={[styles.imageContainer, isDesktop && styles.imageContainerDesktop]}>
                            {displayImage ? (
                                <Image
                                    source={{ uri: displayImage }}
                                    style={styles.productImage}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={64} color={theme.colors.textLight} />
                                </View>
                            )}
                        </View>

                        {/* Thumbnail Strip */}
                        {allImages.length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStrip}>
                                {allImages.map((img, idx) => {
                                    const isActive = displayImage === img;
                                    return (
                                        <Pressable 
                                            key={idx} 
                                            style={[styles.thumbnailBox, isActive && styles.thumbnailBoxActive]}
                                            onPress={() => setSelectedImage(img)}
                                        >
                                            <Image source={{ uri: img }} style={styles.thumbnailImage} contentFit="cover" />
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Store / Seller Info */}
                        <View style={{ marginTop: 16 }}>
                            {renderSellerInfo()}
                        </View>

                    </View>

                    {/* ================= RIGHT COLUMN ================= */}
                    <View style={isDesktop ? styles.rightColumnDesktop : styles.rightColumnMobile}>

                        {/* Core Details: Name, Rating, Price */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.productName}>{product.name}</Text>

                            <View style={[styles.ratingSummary, { marginTop: 4, marginBottom: 12 }]}>
                                <View style={styles.starsRow}>
                                    {[1, 2, 3, 4, 5].map((i) => {
                                        const rating = product.rating || 0;
                                        const isFilled = i <= Math.floor(rating);
                                        const isHalf = !isFilled && i === Math.ceil(rating) && (rating % 1) !== 0;
                                        return (
                                            <Ionicons 
                                                key={i} 
                                                name={isFilled ? "star" : isHalf ? "star-half" : "star-outline"} 
                                                size={14} 
                                                color={theme.colors.starGold} 
                                            />
                                        );
                                    })}
                                </View>
                                <Text style={styles.ratingText}>
                                    {(product.rating || 0).toFixed(1)} ({(product.reviewCount || 0)} reviews) | {product.soldCount} Sold
                                </Text>
                            </View>

                            <View style={[styles.priceSection, { marginBottom: 0 }]}>
                                {priceCalc.hasDiscount ? (
                                    <View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.discountedPrice}>₱{priceCalc.finalPrice.toFixed(2)}</Text>
                                            <View style={styles.discountBadge}>
                                                <Text style={styles.discountText}>-{priceCalc.discountPercentage}%</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.originalPrice}>₱{priceCalc.effectivePrice.toFixed(2)}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.price}>₱{priceCalc.finalPrice.toFixed(2)}</Text>
                                )}
                            </View>
                        </View>

                        {/* Variant Selector */}
                        {product.variants.length > 0 && (
                            <View style={styles.sectionContainer}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>Variant</Text>
                                    <Text style={styles.selectedVariantLabel}>{selectedVariant || 'Select one'}</Text>
                                </View>

                                <View style={styles.variantsGrid}>
                                    {product.variants.map((variant) => {
                                        const isSelected = selectedVariant === variant.name;
                                        const isOutOfStock = variant.stock <= 0;

                                        return (
                                            <Pressable
                                                key={variant.uid}
                                                style={[
                                                    styles.variantChip,
                                                    isSelected && styles.variantChipSelected,
                                                    isOutOfStock && styles.variantChipDisabled
                                                ]}
                                                onPress={() => !isOutOfStock && setSelectedVariant(variant.name)}
                                                disabled={isOutOfStock}
                                            >
                                                <Text style={[
                                                    styles.variantChipText,
                                                    isSelected && styles.variantChipTextSelected,
                                                    isOutOfStock && styles.variantChipTextDisabled
                                                ]}>
                                                    {variant.name}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Inline Action Bar (CTA + Save) */}
                        <View style={styles.sectionContainer}>
                            {user ? (
                                <View style={styles.inlineActionRow}>
                                    <Pressable
                                        ref={buttonRef}
                                        style={({ pressed }) => [
                                            styles.inlineAddToCartButton,
                                            !isInStock && styles.disabledButton,
                                            pressed && { opacity: 0.8 }
                                        ]}
                                        disabled={!isInStock}
                                        onPress={handleAddToCart}
                                    >
                                        <Text style={styles.inlineAddToCartText}>
                                            {isInStock ? 'ADD TO CART' : 'OUT OF STOCK'}
                                        </Text>
                                    </Pressable>
                                    <Pressable style={styles.inlineSaveButton} onPress={handleToggleWishlist}>
                                        <Ionicons
                                            name={isWishlisted ? "heart" : "heart-outline"}
                                            size={26}
                                            color={isWishlisted ? theme.colors.primary : theme.colors.text}
                                        />
                                    </Pressable>
                                </View>
                            ) : (
                                <View style={styles.inlineActionRow}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.inlineAddToCartButton,
                                            { flexDirection: 'row', gap: 8 },
                                            pressed && { opacity: 0.8 }
                                        ]}
                                        onPress={() => router.push('/auth/login' as any)}
                                    >
                                        <Ionicons name="log-in-outline" size={22} color={theme.colors.surface} />
                                        <Text style={styles.inlineAddToCartText}>LOGIN OR SIGN UP</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>


                        {/* Product Highlights / Specifications */}
                        {(product.materials || product.isBundle || (product.tags && product.tags.length > 0)) && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Highlights</Text>
                                <View style={styles.highlightsContainer}>
                                    {!!product.materials && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="color-palette-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Materials:</Text> {product.materials}
                                            </Text>
                                        </View>
                                    )}
                                    {!!product.isBundle && !!product.bundleQuantity && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="gift-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Bundle set:</Text> Includes {product.bundleQuantity} items
                                            </Text>
                                        </View>
                                    )}
                                    {!!product.isCodAllowed && Number(product.basePrice) >= 200 && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="cash-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Payment:</Text> Cash on Delivery eligible
                                            </Text>
                                        </View>
                                    )}
                                    {!!product.fulfillmentType && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="cube-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Fulfillment:</Text> {product.fulfillmentType === 'MADE_TO_ORDER' ? 'Made to Order' : 'Ready Stock'}
                                            </Text>
                                        </View>
                                    )}
                                    {!!product.processingTime && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Processing Time:</Text> {product.processingTime}
                                            </Text>
                                        </View>
                                    )}
                                    {!!product.isCustomOrderAllowed && (
                                        <View style={styles.highlightRow}>
                                            <Ionicons name="color-wand-outline" size={18} color={theme.colors.textSecondary} />
                                            <Text style={styles.highlightText}>
                                                <Text style={{ fontWeight: '600' }}>Customization:</Text> Available upon request
                                            </Text>
                                        </View>
                                    )}
                                    {product.tags && product.tags.length > 0 && (
                                        <View style={[styles.highlightRow, { alignItems: 'flex-start' }]}>
                                            <Ionicons name="pricetags-outline" size={18} color={theme.colors.textSecondary} style={{ marginTop: 2 }} />
                                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                {product.tags.map(tag => (
                                                    <View key={tag} style={styles.tagBadge}>
                                                        <Text style={styles.tagBadgeText}>{tag}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Shipping Info */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>Shipping & Delivery</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
                            </View>
                            <View style={styles.shippingInfoBlock}>
                                <Ionicons name="airplane-outline" size={20} color={theme.colors.text} style={{ marginTop: 2 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.shippingInfoTitle}>Standard Shipping</Text>
                                    <Text style={styles.shippingInfoDesc}>
                                        {product.processingTime ? `Estimated Delivery: ${product.processingTime}` : 'Estimated Delivery: 3-5 Business Days'}
                                    </Text>
                                    <Text style={styles.shippingInfoPrice}>
                                        {product.shippingFeeOverride != null 
                                            ? `₱${Number(product.shippingFeeOverride).toFixed(2)}` 
                                            : ((product.seller as any)?.freeShippingEnabled 
                                                ? `Standard Rate (Free over ₱${(product.seller as any).freeShippingThreshold})` 
                                                : 'Standard Rate applies')}
                                    </Text>
                                </View>
                            </View>
                            {product.isLocalPickupAllowed && (
                                <View style={[styles.shippingInfoBlock, { marginTop: theme.spacing.md }]}>
                                    <Ionicons name="storefront-outline" size={20} color={theme.colors.text} style={{ marginTop: 2 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.shippingInfoTitle}>Local Pickup Available</Text>
                                        <Text style={styles.shippingInfoDesc}>
                                            {product.localPickupInstructions || ((product.seller as any)?.meetUpPoint ? `Available for pickup at: ${(product.seller as any).meetUpPoint}` : 'Available for local pickup at the seller\'s location.')}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                    </View>
                </View>

                {/* ================= FULL WIDTH SECTION: Details & Reviews ================= */}
                <View style={styles.fullWidthSection}>
                    {/* Product Description */}
                    {product.description && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Product Description</Text>
                            <Text
                                style={styles.descriptionText}
                                numberOfLines={isDescriptionExpanded ? undefined : 4}
                            >
                                {product.description}
                            </Text>
                            <Pressable
                                style={styles.readMoreButton}
                                onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            >
                                <Text style={styles.readMoreText}>
                                    {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                                </Text>
                                <Ionicons
                                    name={isDescriptionExpanded ? "chevron-up" : "chevron-down"}
                                    size={16}
                                    color={theme.colors.primary}
                                />
                            </Pressable>
                        </View>
                    )}

                    {/* Care Instructions */}
                    {product.careInstructions && (
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Care Instructions</Text>
                            <Text style={styles.descriptionText}>
                                {product.careInstructions}
                            </Text>
                        </View>
                    )}

                    {/* ================= YOU MIGHT ALSO LIKE ================= */}
                    {recommendations.length > 0 && (
                        <View>
                            <View style={styles.recommendationsHeader}>
                                <View style={styles.recommendationsTitleRow}>
                                    <Text style={styles.recommendationsTitle}>You Might Also Like</Text>
                                    <Text style={styles.recommendationsSubtitle}>
                                        {product.categories?.[0] ? `More from ${product.categories[0]}` : 'More picks for you'}
                                    </Text>
                                </View>
                                <Pressable onPress={() => router.push('/products/All' as any)}>
                                    <Text style={styles.viewAllText}>View All &gt;</Text>
                                </Pressable>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.recommendationsScrollContent}
                            >
                                {recommendations.map((rec) => (
                                    <ProductCard
                                        key={rec.uid}
                                        product={rec}
                                        style={styles.recommendationCard}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Customer Reviews */}
                    <View style={{ marginTop: 16 }}>
                        {renderReviews()}
                    </View>
                </View>

                {/* ================= MEET THE MAKER ================= */}
                {makers.length > 0 && (
                    <View style={styles.fullWidthSection}>
                        <View style={styles.recommendationsHeader}>
                            <View style={styles.recommendationsTitleRow}>
                                <Text style={styles.recommendationsTitle}>Meet the Maker</Text>
                                <Text style={styles.recommendationsSubtitle}>
                                    {product.categories?.[0] ? `More from ${product.categories[0]}` : 'More picks for you'}
                                </Text>
                            </View>
                            <Link href="/makers" asChild>
                                <Pressable style={styles.seeAllButton}>
                                    <Text style={styles.seeAllText}>See All</Text>
                                </Pressable>
                            </Link>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.recommendationsContent}
                            style={styles.recommendationsScroll}
                        >
                            {makers.slice(0, 5).map((maker) => (
                                <View key={maker.uid} style={styles.recommendationCardContainer}>
                                    <MakerCard maker={maker} />
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}


                {/* ================= FOOTER ================= */}
                <Footer />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 20,
        fontWeight: '600',
    },
    backToProductsButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
    },
    backToProductsText: {
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        fontWeight: '500',
    },
    scrollContent: {
        // paddingBottom: 60, removed so footer sits flush
    },
    recommendationsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 12,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    recommendationsTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10,
    },
    recommendationsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    recommendationsSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    recommendationsScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    recommendationCard: {
        width: 220,
        marginBottom: 0,
    },
    seeAllButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    recommendationsContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 16,
    },
    recommendationsScroll: {
        flexGrow: 0,
    },
    recommendationCardContainer: {
        width: 220, // slightly wider for maker cards
    },
    breadcrumbContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
    },
    breadcrumbItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breadcrumbText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    breadcrumbTextClickable: {
        color: theme.colors.textSecondary,
    },
    breadcrumbTextActive: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    breadcrumbSeparator: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginHorizontal: 8,
    },
    mainLayout: {
        flexDirection: 'column',
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 24,
        gap: 40, // Generous spacing between columns
    },
    fullWidthSection: {
        width: '100%',
        maxWidth: 1200,
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    leftColumnDesktop: {
        flex: 1,
        maxWidth: 550, // Slightly wider left column for prominent imagery
    },
    leftColumnMobile: {
        width: '100%',
    },
    rightColumnDesktop: {
        flex: 1,
    },
    rightColumnMobile: {
        width: '100%',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: theme.colors.surface,
    },
    imageContainerDesktop: {
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.subtle,
    },
    thumbnailStrip: {
        marginTop: 16,
        marginBottom: 8,
        flexDirection: 'row',
        flexGrow: 0,
        flexShrink: 0,
    },
    thumbnailBox: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: theme.colors.subtle,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbnailBoxActive: {
        borderColor: theme.colors.primary,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    sectionContainer: {
        backgroundColor: theme.colors.surface,
        padding: 16,
        marginBottom: 8,
    },
    sellerInfoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    sellerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sellerAvatarText: {
        color: theme.colors.primaryDark,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sellerDetails: {
        flex: 1,
        marginLeft: 12,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    sellerRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    sellerRatingText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    visitStoreButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    visitStoreText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    priceSection: {
        marginBottom: 12,
    },
    price: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    discountedPrice: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    originalPrice: {
        fontSize: 14,
        color: theme.colors.textLight,
        textDecorationLine: 'line-through',
        marginTop: 2,
    },
    discountBadge: {
        backgroundColor: '#FFE4E6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    discountText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    productName: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        lineHeight: 28,
        marginBottom: 4,
    },
    skuContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 12,
    },
    skuText: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: theme.typography.fontFamily,
    },
    ratingSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    ratingText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: theme.spacing.md,
    },
    selectedVariantLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    viewAllText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    variantsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    variantChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 60,
        alignItems: 'center',
    },
    variantChipSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    variantChipDisabled: {
        backgroundColor: theme.colors.subtle,
        borderColor: theme.colors.border,
        opacity: 0.5,
    },
    variantChipText: {
        fontSize: 14,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    variantChipTextSelected: {
        color: theme.colors.primaryDark,
        fontWeight: '600',
    },
    variantChipTextDisabled: {
        color: theme.colors.textLight,
    },
    inlineActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineSaveButton: {
        width: 48,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineAddToCartButton: {
        flex: 1,
        backgroundColor: theme.colors.primary, // Solid brand button
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.md,
    },
    disabledButton: {
        backgroundColor: theme.colors.textLight,
        elevation: 0,
        shadowOpacity: 0,
    },
    inlineAddToCartText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        fontFamily: theme.typography.fontFamily,
    },
    shippingInfoBlock: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    shippingInfoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 2,
    },
    shippingInfoDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 2,
    },
    shippingInfoPrice: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    descriptionText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        fontFamily: theme.typography.fontFamily,
    },
    readMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    readMoreText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },

    reviewCard: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    reviewerAvatarText: {
        color: theme.colors.primaryDark,
        fontWeight: 'bold',
        fontSize: 14,
    },
    reviewerInfo: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    reviewFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    helpfulButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    helpfulText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    highlightsContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 10,
    },
    highlightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    highlightText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    tagBadge: {
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tagBadgeText: {
        fontSize: 12,
        color: theme.colors.primaryDark,
        fontWeight: '500',
    },
});
