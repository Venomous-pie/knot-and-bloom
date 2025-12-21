import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sellerProductsAPI } from '../../../api/api';
import ProductForm, { ProductFormData, VariantData } from '../../../components/admin/ProductForm';

export default function SellerProductForm() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const isEditing = !!id;

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

    const handleSubmit = async (data: { formData: ProductFormData; selectedCategories: string[]; variants: VariantData[] }) => {
        setLoading(true);

        try {
            const payload = {
                name: data.formData.name,
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
            };

            if (isEditing) {
                await sellerProductsAPI.updateProduct(id as string, payload);
                Alert.alert("Success", "Product updated successfully");
            } else {
                await sellerProductsAPI.createProduct(payload);
                Alert.alert("Success", "Product created! It will be visible after admin approval.");
            }
            router.back();
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{isEditing ? 'Edit Product' : 'New Product'}</Text>
            </View>

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

            {/* Reuse the Admin ProductForm Component */}
            <ProductForm
                initialData={initialData}
                onSubmit={handleSubmit}
                loading={loading}
                submitLabel={isEditing ? 'Update Product' : 'Submit for Approval'}
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
});
