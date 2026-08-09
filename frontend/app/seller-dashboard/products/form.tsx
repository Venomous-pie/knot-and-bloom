import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { sellerProductsAPI, productAPI } from '../../../services/api';
import ProductFormWizard, { ProductFormData, ProductOption } from '../../../components/seller/ProductFormWizard';
import { VariantData } from '../../../components/seller/VariantEditor';
import InfoBox from '../../../components/ui/InfoBox';

const P = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';
const GREEN = '#10B981';
const AMBER = '#F59E0B';
const RED = '#EF4444';
const INDIGO = '#6366F1';
const TEAL = '#14B8A6';

import { useWindowDimensions } from 'react-native';

const SkeletonLoader = () => {
    const { width } = useWindowDimensions();
    const isMobileLayout = width < 768;
    const fadeAnim = React.useRef(new Animated.Value(0.3)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, [fadeAnim]);

    const SkeletonBox = ({ width, height, borderRadius = 8, marginBottom = 16, style }: any) => (
        <Animated.View style={[{ width, height, borderRadius, marginBottom, backgroundColor: '#E5E7EB', opacity: fadeAnim }, style]} />
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Row 1: Top Header (<- Edit Product) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD }}>
                <SkeletonBox width={24} height={24} borderRadius={12} marginBottom={0} style={{ marginRight: 16 }} />
                <SkeletonBox width={120} height={24} marginBottom={0} />
                <SkeletonBox width={60} height={24} borderRadius={12} marginBottom={0} style={{ marginLeft: 16 }} />
            </View>

            {/* Row 2: Step Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD, position: 'relative', height: 80 }}>
                {/* Left: Title */}
                {!isMobileLayout && (
                    <View style={{ position: 'absolute', left: 20, top: 0, bottom: 0, justifyContent: 'center', width: 250 }}>
                        <SkeletonBox width={200} height={20} marginBottom={8} />
                        <SkeletonBox width={240} height={12} marginBottom={0} />
                    </View>
                )}

                {/* Center: Steps */}
                {!isMobileLayout && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                         <SkeletonBox width={32} height={32} borderRadius={16} marginBottom={0} />
                         <SkeletonBox width={40} height={2} borderRadius={2} marginBottom={0} />
                         <SkeletonBox width={32} height={32} borderRadius={16} marginBottom={0} />
                         <SkeletonBox width={40} height={2} borderRadius={2} marginBottom={0} />
                         <SkeletonBox width={32} height={32} borderRadius={16} marginBottom={0} />
                         <SkeletonBox width={40} height={2} borderRadius={2} marginBottom={0} />
                         <SkeletonBox width={32} height={32} borderRadius={16} marginBottom={0} />
                    </View>
                )}

                {/* Right: Optimization Score */}
                {!isMobileLayout && (
                    <View style={{ position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' }}>
                        <SkeletonBox width={36} height={36} borderRadius={18} marginBottom={0} />
                    </View>
                )}
            </View>

            {/* Row 3: Main Layout Area */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
                
                {/* Left Column (Form Area) */}
                <View style={{ flex: 1, padding: 20 }}>
                    {/* Card 1 */}
                    <View style={{ padding: 24, backgroundColor: CARD, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                            <SkeletonBox width={20} height={20} borderRadius={10} marginBottom={0} />
                            <SkeletonBox width={150} height={20} marginBottom={0} />
                        </View>
                        <SkeletonBox width={300} height={14} marginBottom={24} />

                        <SkeletonBox width={100} height={16} marginBottom={8} />
                        <SkeletonBox width={'100%'} height={48} borderRadius={8} marginBottom={20} />

                        <SkeletonBox width={120} height={16} marginBottom={8} />
                        <SkeletonBox width={'100%'} height={48} borderRadius={8} marginBottom={0} />
                    </View>

                    {/* Card 2 */}
                    <View style={{ padding: 24, backgroundColor: CARD, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: BORDER }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                            <SkeletonBox width={20} height={20} borderRadius={10} marginBottom={0} />
                            <SkeletonBox width={150} height={20} marginBottom={0} />
                        </View>
                        <SkeletonBox width={300} height={14} marginBottom={24} />

                        <SkeletonBox width={'100%'} height={150} borderRadius={12} marginBottom={0} />
                    </View>
                </View>

                {/* Right Column (Preview Panel) */}
                {!isMobileLayout && (
                    <View style={{ width: 380, borderLeftWidth: 1, borderLeftColor: BORDER, padding: 20, backgroundColor: BG }}>
                         <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                 <SkeletonBox width={18} height={18} borderRadius={9} marginBottom={0} />
                                 <SkeletonBox width={100} height={18} marginBottom={0} />
                             </View>
                             <SkeletonBox width={60} height={24} borderRadius={4} marginBottom={0} />
                         </View>
                         
                         <View style={{ backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}>
                             {/* Image Placeholder */}
                             <SkeletonBox width={'100%'} height={300} borderRadius={0} marginBottom={16} />
                             
                             <View style={{ padding: 16 }}>
                                 <SkeletonBox width={120} height={14} marginBottom={8} />
                                 <SkeletonBox width={200} height={24} marginBottom={8} />
                                 <SkeletonBox width={80} height={24} marginBottom={0} />
                             </View>
                         </View>
                    </View>
                )}
            </View>
        </View>
    );
};

export default function SellerProductForm() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const isEditing = !!id;

    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [initialData, setInitialData] = useState<{
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
        productOptions: ProductOption[];
    } | undefined>(undefined);
    const [productStatus, setProductStatus] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        try {
            setInitialLoading(true);
            const response = await productAPI.getProductById(id as string);
            const data = response.data;

            if (data.success) {
                const p = data.product;
                setInitialData({
                    formData: {
                        name: p.name || '',
                        sku: p.sku || '',
                        basePrice: p.basePrice ? String(p.basePrice) : '',
                        discountPercentage: p.discountPercentage ? String(p.discountPercentage) : '',
                        image: p.image || '',
                        images: p.images || [],
                        description: p.description || '',
                        materials: p.materials || '',
                        bundleQuantity: p.bundleQuantity ? String(p.bundleQuantity) : '1',
                        isCodAllowed: p.isCodAllowed ?? true,
                        isBundle: p.isBundle ?? false,
                        tags: Array.isArray(p.tags) ? p.tags : [],
                        metaTitle: p.metaTitle || '',
                        metaDescription: p.metaDescription || '',
                        videoUrl: p.videoUrl || '',
                        shippingFeeOverride: p.shippingFeeOverride ? String(p.shippingFeeOverride) : '',
                        isLocalPickupAllowed: p.isLocalPickupAllowed ?? false,
                        localPickupInstructions: p.localPickupInstructions || '',
                        processingTime: p.processingTime || '',
                        fulfillmentType: (p.fulfillmentType as 'READY_TO_SHIP' | 'MADE_TO_ORDER') || 'READY_TO_SHIP',
                        isCustomOrderAllowed: p.isCustomOrderAllowed ?? false,
                        customOrderInstructions: p.customOrderInstructions || '',
                        careInstructions: p.careInstructions || '',
                        minOrderQty: p.minOrderQty ? String(p.minOrderQty) : '',
                        maxOrderQty: p.maxOrderQty ? String(p.maxOrderQty) : '',
                    },
                    selectedCategories: Array.isArray(p.categories) ? p.categories : [],
                    variants: p.variants && p.variants.length > 0
                        ? p.variants.map((v: any) => ({
                            uid: v.uid,
                            name: v.name || '',
                            stock: v.stock !== undefined ? String(v.stock) : '0',
                            sku: v.sku || '',
                            price: v.price ? String(v.price) : '',
                            discountPercentage: v.discountPercentage ? String(v.discountPercentage) : '',
                            images: v.images || [],
                            options: v.options || {},
                            isEnabled: v.isEnabled ?? true,
                        }))
                        : [{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', images: [], options: {}, isEnabled: true }],
                    productOptions: p.productOptions && p.productOptions.length > 0 
                        ? p.productOptions.map((opt: any) => ({
                            name: opt.name,
                            values: opt.values ? opt.values.map((v: any) => ({
                                name: v.value,
                                imageUrl: v.imageUrl || undefined
                            })) : []
                        }))
                        : []
                });
                setProductStatus(p.status ?? null);
            }
        } catch (err) {
            Alert.alert("Error", "Failed to load product details");
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (data: { formData: ProductFormData; selectedCategories: string[]; variants: VariantData[]; productOptions: ProductOption[] }, isDraft = false) => {
        setLoading(true);

        try {
            const payload = {
                name: data.formData.name || 'Untitled Draft',
                sku: data.formData.sku,
                description: data.formData.description,
                basePrice: parseFloat(data.formData.basePrice) || 0,
                discountPercentage: data.formData.discountPercentage ? parseFloat(data.formData.discountPercentage) : undefined,
                categories: data.selectedCategories,
                productOptions: data.productOptions,
                image: data.formData.image,
                images: data.formData.images || [],
                tags: data.formData.tags || [],
                materials: data.variants[0]?.materials || data.formData.materials || undefined,
                metaTitle: data.formData.metaTitle || undefined,
                metaDescription: data.formData.metaDescription || undefined,
                videoUrl: data.formData.videoUrl || undefined,
                processingTime: data.formData.processingTime || undefined,
                careInstructions: data.formData.careInstructions || undefined,
                bundleQuantity: data.formData.bundleQuantity ? parseInt(data.formData.bundleQuantity) : undefined,
                isCodAllowed: data.formData.isCodAllowed,
                isBundle: data.formData.isBundle,
                shippingFeeOverride: data.formData.shippingFeeOverride ? parseFloat(data.formData.shippingFeeOverride) : undefined,
                isLocalPickupAllowed: data.formData.isLocalPickupAllowed,
                localPickupInstructions: data.formData.localPickupInstructions || undefined,
                fulfillmentType: data.formData.fulfillmentType,
                isCustomOrderAllowed: data.formData.isCustomOrderAllowed,
                customOrderInstructions: data.formData.customOrderInstructions || undefined,
                minOrderQty: data.formData.minOrderQty ? parseInt(data.formData.minOrderQty) : undefined,
                maxOrderQty: data.formData.maxOrderQty ? parseInt(data.formData.maxOrderQty) : undefined,
                variants: data.variants.map(v => ({
                    uid: v.uid,
                    name: v.name,
                    stock: parseInt(v.stock) || 0,
                    sku: v.sku,
                    price: v.price ? parseFloat(v.price) : undefined,
                    discountPercentage: v.discountPercentage ? parseFloat(v.discountPercentage) : undefined,
                    images: v.images,
                    options: v.options || {},
                    isEnabled: v.isEnabled ?? true,
                })),
                status: isDraft ? 'DRAFT' : undefined,
            };

            if (isEditing) {
                await sellerProductsAPI.updateProduct(id as string, payload);
                Alert.alert("Success", isDraft ? "Draft saved successfully" : "Product updated successfully");
            } else {
                await sellerProductsAPI.createProduct(payload);
                Alert.alert("Success", isDraft ? "Draft saved!" : "Product created! It will be visible after admin approval.");
            }
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/seller-dashboard/products');
            }
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.error || "Failed to save product";
            Alert.alert("Error", typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return <SkeletonLoader />;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />


            {/* Status badge moved to ProductFormWizard header */}

            {/* Reuse the Admin ProductForm Component */}
            <ProductFormWizard
                initialData={initialData}
                onSubmit={(data) => handleSubmit(data, false)}
                onSaveDraft={(data) => handleSubmit(data, true)}
                loading={loading}
                submitLabel={isEditing ? 'Update Product' : 'Submit for Approval'}
                onBack={() => {
                    if (router.canGoBack()) {
                        router.back();
                    } else {
                        router.replace('/seller-dashboard/products');
                    }
                }}
                isEditing={isEditing}
                productStatus={productStatus || undefined}
            />
        </View>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVE': return GREEN;
        case 'PENDING': return AMBER;
        case 'SUSPENDED': return RED;
        case 'DRAFT': return SUB;
        default: return SUB;
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
    backBtn: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: TEXT, fontFamily: 'Quicksand' },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: -10, // Pull up to sit closer to form wizard
        zIndex: 10,
    },
    scoreCard: {
        backgroundColor: CARD,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: BG,
    },
    scoreTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    scoreValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Quicksand',
    },
    checklist: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    checklistText: {
        fontSize: 13,
        color: SUB,
        fontFamily: 'Quicksand',
    },
    checklistTextDone: {
        color: TEXT,
        textDecorationLine: 'line-through',
    },
});
