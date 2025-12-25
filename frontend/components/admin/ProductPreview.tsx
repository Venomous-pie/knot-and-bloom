import { isMobile } from '@/constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { Eye, Smartphone, Monitor } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

interface ProductPreviewProps {
    name: string;
    description: string;
    basePrice: string;
    discountPercentage: string;
    image: string;
    images?: { uri: string }[];
    categories: string[];
    variants: {
        name: string;
        price: string;
        discountPercentage: string;
        stock: string;
        color?: string;
    }[];
    activeVariantIndex?: number | null;
    sellerName?: string;
}

export default function ProductPreview({
    name,
    description,
    basePrice,
    discountPercentage,
    image,
    images = [],
    categories,
    variants,
    activeVariantIndex,
    sellerName,
}: ProductPreviewProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [selectedVariant, setSelectedVariant] = useState(0);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    // Calculate actual display price
    const variant = variants[selectedVariant];
    const price = variant?.price ? parseFloat(variant.price) : parseFloat(basePrice) || 0;
    const discount = variant?.discountPercentage
        ? parseFloat(variant.discountPercentage)
        : parseFloat(discountPercentage) || 0;
    const finalPrice = price * (1 - discount / 100);

    // Get display image
    const displayImages = images.length > 0 ? images : (image ? [{ uri: image }] : []);
    const currentImage = displayImages[selectedImageIndex]?.uri;

    const previewWidth = viewMode === 'mobile' ? 280 : mobile ? width - 40 : 350;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Eye size={18} color="#B36979" />
                    <Text style={styles.headerTitle}>Live Preview</Text>
                </View>
                <View style={styles.viewToggle}>
                    <Pressable
                        style={[styles.viewButton, viewMode === 'desktop' && styles.viewButtonActive]}
                        onPress={() => setViewMode('desktop')}
                    >
                        <Monitor size={14} color={viewMode === 'desktop' ? '#B36979' : '#888'} />
                    </Pressable>
                    <Pressable
                        style={[styles.viewButton, viewMode === 'mobile' && styles.viewButtonActive]}
                        onPress={() => setViewMode('mobile')}
                    >
                        <Smartphone size={14} color={viewMode === 'mobile' ? '#B36979' : '#888'} />
                    </Pressable>
                </View>
            </View>

            {/* Preview Card */}
            <ScrollView
                contentContainerStyle={styles.previewContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={[
                    styles.productCard,
                    { width: previewWidth },
                    viewMode === 'mobile' && styles.productCardMobile
                ]}>
                    {/* Product Image */}
                    <View style={styles.imageContainer}>
                        {currentImage ? (
                            <Image
                                source={{ uri: currentImage }}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={styles.placeholderText}>No Image</Text>
                            </View>
                        )}

                        {/* Discount Badge */}
                        {discount > 0 && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountBadgeText}>-{Math.round(discount)}%</Text>
                            </View>
                        )}
                    </View>

                    {/* Image Thumbnails */}
                    {displayImages.length > 1 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbnailRow}
                        >
                            {displayImages.map((img, idx) => (
                                <Pressable
                                    key={idx}
                                    style={[
                                        styles.thumbnail,
                                        selectedImageIndex === idx && styles.thumbnailSelected
                                    ]}
                                    onPress={() => setSelectedImageIndex(idx)}
                                >
                                    <Image
                                        source={{ uri: img.uri }}
                                        style={styles.thumbnailImage}
                                        resizeMode="cover"
                                    />
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}

                    {/* Product Info */}
                    <View style={[styles.productInfo, viewMode === 'mobile' && styles.productInfoMobile]}>
                        {/* Categories */}
                        {categories.length > 0 && (
                            <Text style={[styles.categoryText, viewMode === 'mobile' && styles.categoryTextMobile]} numberOfLines={1}>
                                {categories.slice(0, 2).join(' • ')}
                            </Text>
                        )}

                        {/* Name */}
                        <Text style={[styles.productName, viewMode === 'mobile' && styles.productNameMobile]} numberOfLines={2}>
                            {name || 'Product Name'}
                        </Text>

                        {/* Marketing / Status Row (matching ProductCard) */}
                        <View style={[styles.ratingRow, viewMode === 'mobile' && styles.ratingRowMobile]}>
                            <Ionicons name="sparkles" size={viewMode === 'mobile' ? 12 : 14} color="#B36979" />
                            <Text style={[styles.ratingText, viewMode === 'mobile' && styles.ratingTextMobile, { color: '#B36979', fontWeight: '600' }]}>
                                New Arrival
                            </Text>
                        </View>

                        {/* Seller Attribution */}
                        <View style={styles.sellerContainer}>
                            <Text style={[styles.sellerText, viewMode === 'mobile' && styles.sellerTextMobile]}>
                                Sold by <Text style={
                                    sellerName === 'Knot & Bloom'
                                        ? { fontWeight: '600', color: '#B36979' }
                                        : { textDecorationLine: 'underline' }
                                }>{sellerName || 'Your Store'}</Text>
                            </Text>
                        </View>

                        {/* Price */}
                        <View style={[styles.priceRow, viewMode === 'mobile' && styles.priceRowMobile]}>
                            <Text style={[styles.finalPrice, viewMode === 'mobile' && styles.finalPriceMobile]}>
                                ₱{finalPrice.toFixed(2)}
                            </Text>
                            {discount > 0 && (
                                <Text style={[styles.originalPrice, viewMode === 'mobile' && styles.originalPriceMobile]}>
                                    ₱{price.toFixed(2)}
                                </Text>
                            )}
                        </View>

                        {/* Variant Selector */}
                        {variants.length > 1 && (
                            <View style={styles.variantSection}>
                                <Text style={styles.variantLabel}>Variants</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.variantRow}
                                >
                                    {variants.map((v, idx) => (
                                        <Pressable
                                            key={idx}
                                            style={[
                                                styles.variantChip,
                                                selectedVariant === idx && styles.variantChipSelected,
                                                activeVariantIndex === idx && styles.variantChipEditing,
                                                v.color ? { borderColor: v.color } : {}
                                            ]}
                                            onPress={() => setSelectedVariant(idx)}
                                        >
                                            {activeVariantIndex === idx && (
                                                <View style={styles.editingIndicator} />
                                            )}
                                            {v.color && (
                                                <View style={[styles.variantColor, { backgroundColor: v.color }]} />
                                            )}
                                            <Text style={[
                                                styles.variantChipText,
                                                selectedVariant === idx && styles.variantChipTextSelected,
                                                activeVariantIndex === idx && styles.variantChipTextEditing
                                            ]}>
                                                {v.name || `Variant ${idx + 1}`}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Stock Status */}
                        <View style={[styles.stockRow, viewMode === 'mobile' && styles.stockRowMobile]}>
                            <View style={[
                                styles.stockIndicator,
                                viewMode === 'mobile' && styles.stockIndicatorMobile,
                                parseInt(variant?.stock || '0') > 0
                                    ? styles.stockInStock
                                    : styles.stockOutOfStock
                            ]} />
                            <Text style={[styles.stockText, viewMode === 'mobile' && styles.stockTextMobile]}>
                                {parseInt(variant?.stock || '0') > 0
                                    ? `${variant?.stock} in stock`
                                    : 'Out of stock'}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    viewButton: {
        padding: 6,
        borderRadius: 6,
    },
    viewButtonActive: {
        backgroundColor: 'white',
    },
    previewContainer: {
        padding: 16,
        alignItems: 'center',
    },
    productCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    productCardMobile: {
        maxWidth: 280,
    },
    imageContainer: {
        aspectRatio: 1,
        backgroundColor: '#f5f5f5',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#999',
        fontSize: 14,
    },
    discountBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#E53935',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    discountBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    thumbnailRow: {
        flexDirection: 'row',
        gap: 8,
        padding: 12,
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    thumbnailSelected: {
        borderColor: '#B36979',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    productInfo: {
        padding: 16,
        gap: 8,
    },
    productInfoMobile: {
        padding: 10,
        gap: 4,
    },
    categoryText: {
        fontSize: 11,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryTextMobile: {
        fontSize: 9,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
        lineHeight: 22,
    },
    productNameMobile: {
        fontSize: 13,
        lineHeight: 18,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingRowMobile: {
        gap: 2,
    },
    ratingText: {
        fontSize: 12,
        color: '#888',
        marginLeft: 4,
    },
    ratingTextMobile: {
        fontSize: 10,
        marginLeft: 2,
    },
    sellerContainer: {
        // Container for seller attribution
    },
    sellerText: {
        fontSize: 11,
        color: '#888',
    },
    sellerTextMobile: {
        fontSize: 9,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    priceRowMobile: {
        gap: 6,
    },
    finalPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#B36979',
    },
    finalPriceMobile: {
        fontSize: 16,
    },
    originalPrice: {
        fontSize: 14,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    originalPriceMobile: {
        fontSize: 11,
    },
    variantSection: {
        gap: 8,
    },
    variantLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    variantRow: {
        flexDirection: 'row',
        gap: 8,
    },
    variantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    variantChipSelected: {
        backgroundColor: '#E8D5D9',
        borderColor: '#B36979',
    },
    variantColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    variantChipText: {
        fontSize: 12,
        color: '#666',
    },
    variantChipTextSelected: {
        color: '#B36979',
        fontWeight: '600',
    },
    variantChipEditing: {
        borderWidth: 2,
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    variantChipTextEditing: {
        color: '#2E7D32',
        fontWeight: '600',
    },
    editingIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4CAF50',
    },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    stockRowMobile: {
        gap: 4,
        marginTop: 2,
    },
    stockIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stockIndicatorMobile: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    stockInStock: {
        backgroundColor: '#4CAF50',
    },
    stockOutOfStock: {
        backgroundColor: '#E53935',
    },
    stockText: {
        fontSize: 12,
        color: '#666',
    },
    stockTextMobile: {
        fontSize: 10,
    },
    descriptionSection: {
        gap: 4,
        marginTop: 8,
    },
    descriptionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    descriptionText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 18,
        maxHeight: 54,
        overflow: 'hidden',
    },
    mockButton: {
        backgroundColor: '#B36979',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    mockButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});
