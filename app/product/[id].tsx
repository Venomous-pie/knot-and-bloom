import { cartAPI, productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import type { Product } from "@/types/products";
import { calculatePrice } from "@/utils/pricing";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

const { width } = Dimensions.get('window');

export default function ProductDetailPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (!id) {
            setError("Invalid product ID");
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await productAPI.getProductById(id);
                const fetchedProduct = response.data.product;
                setProduct(fetchedProduct);

                // Set first variant as selected if variants exist
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

    const { refreshCart, triggerCartAnimation } = useCart();
    const buttonRef = React.useRef<View>(null);

    const handleAddToCart = async () => {
        console.log("🔘 handleAddToCart: Function called");

        if (!product) {
            console.log("❌ Aborting - No product");
            return;
        }

        if (product.variants.length > 0 && !selectedVariant) {
            console.log("❌ Aborting - Variant not selected");
            Alert.alert("Select a Variant", "Please select a variant before adding to cart.");
            return;
        }

        if (!user) {
            console.log("❌ Aborting - No user logged in");
            Alert.alert("Login Required", "Please log in to add items to your cart.", [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => router.push('/auth') }
            ]);
            return;
        }

        // Calculate total stock from all variants
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        const isInStock = totalStock > 0;

        if (!isInStock) {
            Alert.alert("Out of Stock", "This item is currently unavailable.");
            return;
        }

        // Check variant specific stock if selected
        if (selectedVariant) {
            const variant = product.variants.find(v => v.name === selectedVariant);
            if (variant && variant.stock <= 0) {
                Alert.alert("Out of Stock", "The selected variant is out of stock.");
                return;
            }
        }

        try {
            // Trigger animation
            buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
                triggerCartAnimation({ x: pageX + width / 2, y: pageY + height / 2 });
            });

            console.log("📡 Sending API request...", {
                userId: user.uid,
                productId: product.uid,
                quantity: 1,
                variant: selectedVariant
            });

            const response = await cartAPI.addToCart(user.uid, product.uid, 1, selectedVariant);

            console.log("✅ API Success:", response.data);

            await refreshCart();

            Alert.alert(
                "Added to Cart",
                `${product.name} ${selectedVariant ? `(${selectedVariant})` : ''} has been added to your cart.`,
                [
                    { text: "Continue Shopping", style: "cancel" },
                    { text: "View Cart", onPress: () => router.push('/cart') }
                ]
            );
        } catch (error: any) {
            console.error("❌ API Failed:", error);
            if (error.response) {
                console.error("Error Response Data:", error.response.data);
                console.error("Error Status:", error.response.status);
            }
            Alert.alert("Error", "Failed to add item to cart. Please try again.");
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading product details...</Text>
            </View>
        );
    }

    if (error || !product) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorEmoji}>😔</Text>
                <Text style={styles.errorText}>{error || "Product not found"}</Text>
                <Text style={styles.errorSubtext}>The product you're looking for doesn't exist</Text>
                <Pressable
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Back to Products</Text>
                </Pressable>
            </View>
        );
    }

    const hasDiscount = product.discountedPrice && Number(product.discountedPrice) > 0;
    // Calculate total stock from all variants
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    const isInStock = totalStock > 0;

    return (
        <ScrollView style={styles.container}>
            {/* Image Section */}
            <View style={styles.imageContainer}>
                {product.image ? (
                    <Text style={styles.imagePlaceholder}>🖼️</Text>
                ) : (
                    <Text style={styles.imagePlaceholder}>📦</Text>
                )}
            </View>

            {/* Product Details */}
            <View style={styles.detailsContainer}>
                {/* Product Name */}
                <Text style={styles.productName}>{product.name}</Text>

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                        {product.categories.map((cat, index) => (
                            <View key={index} style={{
                                backgroundColor: '#E8D5D9',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 16,
                                marginRight: 8,
                                marginBottom: 8,
                            }}>
                                <Text style={{ color: '#B36979', fontSize: 12, fontWeight: '600' }}>
                                    {cat}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/*Price Section */}
                <View style={styles.priceSection}>
                    {(() => {
                        // Get selected variant object
                        const selectedVariantObj = selectedVariant
                            ? product.variants.find(v => v.name === selectedVariant)
                            : null;

                        // Use pricing helper to calculate price
                        const priceCalc = calculatePrice(product, selectedVariantObj);

                        if (priceCalc.hasDiscount) {
                            return (
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Text style={styles.originalPrice}>
                                            ₱{priceCalc.effectivePrice.toFixed(2)}
                                        </Text>
                                        <View style={styles.discountBadge}>
                                            <Text style={styles.discountText}>-{priceCalc.discountPercentage}%</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.discountedPrice}>
                                        ₱{priceCalc.finalPrice.toFixed(2)}
                                    </Text>
                                </View>
                            );
                        } else {
                            return (
                                <Text style={styles.price}>₱{priceCalc.finalPrice.toFixed(2)}</Text>
                            );
                        }
                    })()}
                </View>

                {/* Stock Status */}
                <View style={styles.stockContainer}>
                    <Text style={[
                        styles.stockText,
                        isInStock ? styles.inStockText : styles.outOfStockText
                    ]}>
                        {isInStock ? `✓ In Stock (${totalStock} available)` : '✗ Out of Stock'}
                    </Text>
                </View>

                {/* Variants Selection */}
                {product.variants.length > 0 && (
                    <View style={styles.variantsSection}>
                        <Text style={styles.sectionTitle}>Select Variant</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {product.variants.map((variant, index) => (
                                <Pressable
                                    key={variant.uid}
                                    style={[
                                        styles.variantButton,
                                        selectedVariant === variant.name && styles.selectedVariantButton
                                    ]}
                                    onPress={() => setSelectedVariant(variant.name)}
                                >
                                    <Text style={[
                                        styles.variantText,
                                        selectedVariant === variant.name && styles.selectedVariantText
                                    ]}>
                                        {variant.name}
                                    </Text>
                                    <Text style={[
                                        styles.variantStock,
                                        selectedVariant === variant.name && styles.selectedVariantStock,
                                        variant.stock === 0 && styles.outOfStockText
                                    ]}>
                                        {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Description */}
                {product.description && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{product.description}</Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Pressable
                        ref={buttonRef}
                        style={({ pressed }) => [
                            styles.addToCartButton,
                            !isInStock && styles.disabledButton,
                            pressed && { opacity: 0.6, transform: [{ scale: 0.98 }] }
                        ]}
                        disabled={!isInStock}
                        onPress={handleAddToCart}
                    >
                        <Text style={styles.addToCartText}>
                            {isInStock ? '🛒 Add to Cart' : 'Out of Stock'}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.backToProductsButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backToProductsText}>← Back to Products</Text>
                    </Pressable>
                </View>

                {/* Product Metadata */}
                <View style={styles.metadata}>
                    <Text style={styles.metadataText}>
                        Added: {new Date(product.uploaded).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    errorEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ef4444',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 24,
        textAlign: 'center',
    },
    imageContainer: {
        width: '100%',
        height: 300,
        backgroundColor: '#e5e7eb',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholder: {
        fontSize: 80,
    },
    detailsContainer: {
        padding: 20,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 12,
    },
    categoryText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    productName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
        lineHeight: 36,
    },
    sku: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 20,
    },
    priceSection: {
        marginBottom: 20,
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#10b981',
    },
    discountedPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    originalPrice: {
        fontSize: 20,
        color: '#9ca3af',
        textDecorationLine: 'line-through',
    },
    discountedPrice: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    discountBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    discountText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
    },
    stockBadge: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 24,
        alignSelf: 'flex-start',
    },
    inStockBadge: {
        backgroundColor: '#d1fae5',
    },
    outOfStockBadge: {
        backgroundColor: '#fee2e2',
    },
    stockText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inStockText: {
        color: '#065f46',
    },
    outOfStockText: {
        color: '#991b1b',
    },
    stockContainer: {
        marginBottom: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    variantsSection: {
        marginBottom: 24,
    },
    variantButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginRight: 12,
        minWidth: 100,
        alignItems: 'center',
    },
    selectedVariantButton: {
        borderColor: '#8b5cf6',
        backgroundColor: '#f5f3ff',
        borderWidth: 2,
    },
    variantText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    selectedVariantText: {
        color: '#8b5cf6',
    },
    variantStock: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 4,
    },
    selectedVariantStock: {
        color: '#8b5cf6',
    },
    description: {
        fontSize: 16,
        color: '#4b5563',
        lineHeight: 24,
    },
    buttonContainer: {
        marginTop: 8,
        marginBottom: 24,
        gap: 12,
    },
    addToCartButton: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
        shadowOpacity: 0,
        elevation: 0,
    },
    addToCartText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#8b5cf6',
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    backToProductsButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },
    backToProductsText: {
        color: '#8b5cf6',
        fontSize: 16,
        fontWeight: '600',
    },
    metadata: {
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    metadataText: {
        fontSize: 12,
        color: '#9ca3af',
    },
});
