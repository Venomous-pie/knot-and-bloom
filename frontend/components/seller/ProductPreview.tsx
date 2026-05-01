import { isMobile } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Eye, Heart, Monitor, ShoppingCart, Smartphone, Star, Clock } from 'lucide-react-native';
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
    sellerLogo?: string | null;
}

// Matches the proportional scale system from the real ProductCard
const SCALE = {
    padding: 0.07,
    gap: 0.030,
    gapSm: 0.015,
    categoryFont: 0.050,
    nameFont: 0.075,
    sellerFont: 0.050,
    ratingFont: 0.055,
    priceFont: 0.100,
    origPriceFont: 0.065,
    iconSm: 0.060,
    iconMd: 0.075,
    badgeFont: 0.055,
    badgePadH: 0.035,
    badgePadV: 0.018,
    actionBtn: 0.145,
    actionRight: 0.055,
} as const;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
function scale(width: number, ratio: number, min: number, max: number) {
    return clamp(width * ratio, min, max);
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
    sellerName,
    sellerLogo,
}: ProductPreviewProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

    // Mirror real ProductCard pricing logic: use lowest variant price
    const baseNum = parseFloat(basePrice) || 0;
    const lowestVariant = variants.reduce<{ price: string; discountPercentage: string; stock: string } | null>((acc, v) => {
        if (!acc) return v;
        const vp = parseFloat(v.price) || baseNum;
        const ap = parseFloat(acc.price) || baseNum;
        return vp < ap ? v : acc;
    }, null);

    const variantPrice = lowestVariant?.price ? parseFloat(lowestVariant.price) : baseNum;
    const discountPct = lowestVariant?.discountPercentage
        ? parseFloat(lowestVariant.discountPercentage)
        : parseFloat(discountPercentage) || 0;
    const finalPrice = variantPrice * (1 - discountPct / 100);
    const hasDiscount = discountPct > 0;

    // Get display image — primary image just like real card
    const displayImages = images.length > 0 ? images : (image ? [{ uri: image }] : []);
    const displayImage = displayImages[0]?.uri || '';

    // Card width
    const cardWidth = viewMode === 'mobile' ? 180 : mobile ? Math.min(width - 40, 260) : 260;

    const s = {
        padding: scale(cardWidth, SCALE.padding, 7, 20),
        gap: scale(cardWidth, SCALE.gap, 3, 10),
        gapSm: scale(cardWidth, SCALE.gapSm, 2, 5),
        categoryFont: scale(cardWidth, SCALE.categoryFont, 7, 12),
        nameFont: scale(cardWidth, SCALE.nameFont, 10, 18),
        sellerFont: scale(cardWidth, SCALE.sellerFont, 7, 12),
        ratingFont: scale(cardWidth, SCALE.ratingFont, 8, 13),
        priceFont: scale(cardWidth, SCALE.priceFont, 12, 24),
        origPriceFont: scale(cardWidth, SCALE.origPriceFont, 9, 15),
        iconSm: scale(cardWidth, SCALE.iconSm, 9, 16),
        iconMd: scale(cardWidth, SCALE.iconMd, 11, 19),
        badgeFont: scale(cardWidth, SCALE.badgeFont, 8, 12),
        badgePadH: scale(cardWidth, SCALE.badgePadH, 4, 9),
        badgePadV: scale(cardWidth, SCALE.badgePadV, 2, 5),
        actionBtn: scale(cardWidth, SCALE.actionBtn, 20, 36),
        actionRight: scale(cardWidth, SCALE.actionRight, 7, 14),
    };

    const sellerDisplay = sellerName || 'Your Store';
    const isKnotAndBloom = sellerDisplay === 'Knot & Bloom';

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

            {/* Card Preview */}
            <ScrollView
                contentContainerStyle={styles.previewContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Simulated grid background */}
                <View style={[styles.productCard, { width: cardWidth }]}>
                    {/* Image */}
                    <View style={[styles.imageContainer, { aspectRatio: 1 }]}>
                        {displayImage ? (
                            <Image
                                source={{ uri: displayImage }}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Text style={{ color: theme.colors.textLight, fontSize: s.sellerFont }}>
                                    No Image
                                </Text>
                            </View>
                        )}

                        {/* Image Dots (Pagination) */}
                        {displayImages.length > 1 && (
                            <View style={{
                                position: 'absolute', bottom: s.gap + 4, left: 0, right: 0, 
                                flexDirection: 'row', justifyContent: 'center', gap: 4 
                            }}>
                                {displayImages.slice(0, 5).map((_, i) => (
                                    <View key={i} style={{
                                        width: 4, height: 4, borderRadius: 2,
                                        backgroundColor: i === 0 ? theme.colors.primary : 'rgba(255,255,255,0.6)'
                                    }} />
                                ))}
                            </View>
                        )}

                        {/* New badge — all new products get this */}
                        <View style={[styles.badge, {
                            backgroundColor: theme.colors.primary,
                            top: s.actionRight,
                            left: s.actionRight,
                            paddingHorizontal: s.badgePadH,
                            paddingVertical: s.badgePadV,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                        }]}>
                            <Ionicons name="sparkles" size={s.badgeFont} color="white" />
                            <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>New</Text>
                        </View>

                        {/* Discount badge bottom-left */}
                        {hasDiscount && (
                            <View style={[styles.badge, {
                                backgroundColor: theme.colors.error,
                                bottom: s.actionRight,
                                left: s.actionRight,
                                paddingHorizontal: s.badgePadH,
                                paddingVertical: s.badgePadV,
                            }]}>
                                <Text style={[styles.badgeText, { fontSize: s.badgeFont }]}>
                                    -{discountPct % 1 === 0 ? discountPct : discountPct.toFixed(1)}%
                                </Text>
                            </View>
                        )}

                        {/* Wishlist button top-right */}
                        <View style={[styles.actionButton, {
                            right: s.actionRight,
                            top: s.actionRight,
                            width: s.actionBtn,
                            height: s.actionBtn,
                            borderRadius: s.actionBtn / 2,
                        }]}>
                            <Heart size={s.iconMd} color={theme.colors.textLight} />
                        </View>
                    </View>

                    {/* Product Info — exactly mirrors real ProductCard */}
                    <View style={{ padding: s.padding, gap: s.gap }}>
                        {/* Row 1: Category */}
                        {categories.length > 0 && (
                            <Text style={{
                                fontSize: s.categoryFont,
                                color: theme.colors.textLight,
                                letterSpacing: 0.3,
                            }} numberOfLines={1}>
                                {categories.slice(0, 2).map(c =>
                                    c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                                ).join(' • ')}
                            </Text>
                        )}

                        {/* Row 2: Name */}
                        <Text style={{
                            fontSize: s.nameFont,
                            fontWeight: '600',
                            color: theme.colors.text,
                            fontFamily: 'Quicksand',
                            lineHeight: s.nameFont * 1.25,
                        }} numberOfLines={2}>
                            {name || 'Product Name'}
                        </Text>

                        {/* Row 3: Seller Avatar & Name */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.gapSm * 1.5 }}>
                            <View style={{
                                width: s.sellerFont * 2, height: s.sellerFont * 2, borderRadius: s.sellerFont,
                                backgroundColor: '#EBE1E3', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                            }}>
                                {sellerLogo ? (
                                    <Image source={{ uri: sellerLogo }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <Text style={{ fontSize: s.sellerFont * 1.1, fontWeight: '600', color: theme.colors.primary }}>
                                        {sellerDisplay.charAt(0).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <Text style={{ fontSize: s.sellerFont, color: theme.colors.textLight, flex: 1 }} numberOfLines={1}>
                                <Text style={
                                    isKnotAndBloom
                                        ? { fontWeight: '600', color: theme.colors.primary }
                                        : { textDecorationLine: 'underline' }
                                }>{sellerDisplay}</Text>
                            </Text>
                        </View>

                        {/* Row 4: Star Rating (Mocked as 0 for Preview) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.gapSm }}>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                {[1,2,3,4,5].map(star => (
                                    <Star 
                                        key={star} 
                                        size={s.ratingFont * 1.2} 
                                        fill="transparent" 
                                        color={theme.colors.textLight} 
                                    />
                                ))}
                            </View>
                            <Text style={{ fontSize: s.ratingFont, color: theme.colors.textSecondary }}>
                                0.0 (0)
                            </Text>
                        </View>

                        {/* Row 5: Low Stock Warning */}
                        {lowestVariant?.stock && Number(lowestVariant.stock) > 0 && Number(lowestVariant.stock) < 10 ? (
                            <View style={{ 
                                backgroundColor: '#FFFBEB', paddingVertical: s.padding * 0.5, paddingHorizontal: s.padding * 0.8, 
                                borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: s.gapSm, alignSelf: 'flex-start' 
                            }}>
                                <Clock size={s.ratingFont * 1.1} color="#D97706" />
                                <Text style={{ fontSize: s.ratingFont, color: "#D97706", fontWeight: '600' }}>
                                    Only {lowestVariant.stock} left in stock!
                                </Text>
                            </View>
                        ) : null}

                        {/* Row 6: Price */}
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: s.gap }}>
                            <Text style={{ fontSize: s.priceFont, fontWeight: '700', color: theme.colors.primary }}>
                                ₱{finalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            {hasDiscount && (
                                <Text style={{ fontSize: s.origPriceFont, color: theme.colors.textLight, textDecorationLine: 'line-through' }}>
                                    ₱{variantPrice.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Caption */}
                <Text style={styles.caption}>
                    Showing lowest variant price · {variants.length} variant{variants.length !== 1 ? 's' : ''} total
                </Text>
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
    contextLabel: {
        backgroundColor: '#FFF8F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E6E9',
    },
    contextLabelText: {
        fontSize: 11,
        color: '#B36979',
        fontWeight: '500',
        textAlign: 'center',
    },
    previewContainer: {
        padding: 20,
        alignItems: 'center',
        gap: 16,
    },
    gridBg: {
        backgroundColor: '#F5F0F1',
        borderRadius: 12,
        padding: 16,
    },
    productCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    imageContainer: {
        backgroundColor: theme.colors.backgroundAlt,
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
    badge: {
        position: 'absolute',
        borderRadius: 6,
    },
    badgeText: {
        color: 'white',
        fontWeight: '700',
    },
    actionButton: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    caption: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
    },
});
