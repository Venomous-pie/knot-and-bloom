import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sellerProductsAPI, productAPI } from '../../../api/api';
import ProductFormWizard, { ProductFormData } from '../../../components/seller/ProductFormWizard';
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
                            images: v.images || (v.image ? [v.image] : []),
                            materials: v.materials || '',
                        }))
                        : [{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', images: [] }]
                });
                setProductStatus(p.status ?? null);
            }
        } catch (err) {
            Alert.alert("Error", "Failed to load product details");
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (data: { formData: ProductFormData; selectedCategories: string[]; variants: VariantData[] }, isDraft = false) => {
        setLoading(true);

        try {
            const payload = {
                name: data.formData.name || 'Untitled Draft',
                sku: data.formData.sku,
                description: data.formData.description,
                basePrice: parseFloat(data.formData.basePrice) || 0,
                discountPercentage: data.formData.discountPercentage ? parseFloat(data.formData.discountPercentage) : undefined,
                categories: data.selectedCategories,
                image: data.formData.image,
                images: data.formData.images || [],
                tags: data.formData.tags || [],
                materials: data.formData.materials || data.variants[0]?.materials || undefined,
                metaTitle: data.formData.metaTitle || undefined,
                metaDescription: data.formData.metaDescription || undefined,
                variants: data.variants.map(v => ({
                    uid: v.uid,
                    name: v.name,
                    stock: parseInt(v.stock) || 0,
                    sku: v.sku,
                    price: v.price ? parseFloat(v.price) : undefined,
                    discountPercentage: v.discountPercentage ? parseFloat(v.discountPercentage) : undefined,
                    images: v.images,
                    materials: v.materials || undefined,
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
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
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
