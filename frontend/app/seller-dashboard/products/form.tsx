import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sellerProductsAPI } from '../../../api/api';
import ProductFormWizard, { ProductFormData } from '../../../components/admin/ProductFormWizard';
import { VariantData } from '../../../components/admin/VariantEditor';
import InfoBox from '../../../shared/InfoBox';

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
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/products/${id}`);
            const data = await response.json();

            if (data.success) {
                const p = data.product;
                setInitialData({
                    formData: {
                        name: p.name || '',
                        sku: p.sku || '',
                        basePrice: p.basePrice ? String(p.basePrice) : '',
                        discountPercentage: p.discountPercentage ? String(p.discountPercentage) : '',
                        image: p.image || '',
                        description: p.description || '',
                        materials: p.materials || '',
                        bundleQuantity: p.bundleQuantity ? String(p.bundleQuantity) : '1',
                        isCodAllowed: p.isCodAllowed ?? true,
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
                            image: v.image || '',
                        }))
                        : [{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', image: '' }]
                });
                setProductStatus(p.status);
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
                variants: data.variants.map(v => ({
                    uid: v.uid,
                    name: v.name,
                    stock: parseInt(v.stock) || 0,
                    sku: v.sku,
                    price: v.price ? parseFloat(v.price) : undefined,
                    discountPercentage: v.discountPercentage ? parseFloat(v.discountPercentage) : undefined,
                    image: v.image,
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


            {/* Pending Approval Notice */}
            {!isEditing && (
                <InfoBox 
                    message="New products require admin approval before they appear in the shop." 
                    type="info" 
                    style={{ marginHorizontal: 16, marginTop: 12 }} 
                />
            )}

            {/* Status Badge for Editing */}
            {isEditing && productStatus && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(productStatus) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(productStatus) }]}>
                        Status: {productStatus}
                    </Text>
                </View>
            )}

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
            />
        </View>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'ACTIVE': return '#10B981';
        case 'PENDING': return '#F59E0B';
        case 'SUSPENDED': return '#EF4444';
        case 'DRAFT': return '#6B7280';
        default: return '#6B7280';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
    backBtn: { marginRight: 16 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginHorizontal: 16,
        marginTop: 12,
    },
    statusText: { fontWeight: '600', fontSize: 13 },
    scoreCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
    },
    scoreTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    scoreValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    checklist: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    checklistText: {
        fontSize: 13,
        color: '#6B7280',
    },
    checklistTextDone: {
        color: '#111827',
        textDecorationLine: 'line-through',
    },
});
