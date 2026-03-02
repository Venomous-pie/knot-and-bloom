import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sellerProductsAPI } from '../../../api/api';
import ProductFormWizard, { ProductFormData } from '../../../components/admin/ProductFormWizard';
import { VariantData } from '../../../components/admin/VariantEditor';

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

    // Optimization Score State
    const [optScore, setOptScore] = useState(0);
    const [optChecklist, setOptChecklist] = useState<{ label: string; done: boolean; points: number }[]>([]);
    const [showOptDetails, setShowOptDetails] = useState(false);

    useEffect(() => {
        if (isEditing) {
            loadProduct();
        }
    }, [id]);

    const calculateOptimization = (data: { formData: ProductFormData; selectedCategories: string[]; variants: VariantData[] }) => {
        // Optimization Logic (Matches List View Logic)
        const checklist = [
            { label: 'Has at least 1 image', done: !!data.formData.image, points: 20 },
            { label: 'Product Name >= 20 chars', done: (data.formData.name?.length || 0) >= 20, points: 20 },
            { label: 'Description >= 50 chars', done: (data.formData.description?.length || 0) >= 50, points: 20 },
            { label: 'Has at least 1 variant in stock', done: data.variants.some(v => parseInt(v.stock) > 0), points: 20 },
            { label: 'Category Selected', done: data.selectedCategories.length > 0, points: 10 },
            { label: 'SKU Generated', done: !!data.formData.sku, points: 10 },
        ];

        const totalScore = checklist.reduce((acc, item) => acc + (item.done ? item.points : 0), 0);
        setOptScore(totalScore);
        setOptChecklist(checklist);
    };

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
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={20} color="#0284C7" />
                    <Text style={styles.infoText}>New products require admin approval before they appear in the shop.</Text>
                </View>
            )}

            {/* Status Badge for Editing */}
            {isEditing && productStatus && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(productStatus) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(productStatus) }]}>
                        Status: {productStatus}
                    </Text>
                </View>
            )}

            {/* Optimization Score Card */}
            <View style={styles.scoreCard}>
                <TouchableOpacity
                    style={styles.scoreHeader}
                    onPress={() => setShowOptDetails(!showOptDetails)}
                >
                    <View style={styles.scoreTitleRow}>
                        <Ionicons name="stats-chart" size={20} color="#B36979" />
                        <Text style={styles.scoreTitle}>Optimization Score</Text>
                    </View>
                    <View style={styles.scoreValueRow}>
                        <Text style={[styles.scoreValue, {
                            color: optScore >= 80 ? '#10B981' : optScore >= 50 ? '#F59E0B' : '#EF4444'
                        }]}>{optScore}/100</Text>
                        <Ionicons name={showOptDetails ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                    </View>
                </TouchableOpacity>

                {showOptDetails && (
                    <View style={styles.checklist}>
                        {optChecklist.map((item, index) => (
                            <View key={index} style={styles.checklistItem}>
                                <Ionicons
                                    name={item.done ? "checkmark-circle" : "ellipse-outline"}
                                    size={18}
                                    color={item.done ? "#10B981" : "#D1D5DB"}
                                />
                                <Text style={[styles.checklistText, item.done && styles.checklistTextDone]}>
                                    {item.label} (+{item.points})
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Reuse the Admin ProductForm Component */}
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
                onDataChange={calculateOptimization}
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E0F2FE',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 8,
    },
    infoText: { marginLeft: 8, color: '#0369A1', flex: 1, fontSize: 14 },
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
