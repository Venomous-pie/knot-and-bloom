import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import ProductForm, { ProductFormData, VariantData } from "@/components/admin/ProductForm";
import { RelativePathString, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateProductPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);

    // Auth Check
    React.useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as RelativePathString);
            } else if (user.role !== 'ADMIN') {
                Alert.alert("Unauthorized", "You do not have permission to access this page.");
                router.replace('/');
            }
        }
    }, [user, authLoading]);

    if (authLoading || !user || user.role !== 'ADMIN') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#B36979" />
            </SafeAreaView>
        );
    }

    const handleSubmit = async (data: {
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    }) => {
        const { formData, selectedCategories, variants } = data;

        if (!formData.name || selectedCategories.length === 0 || !formData.basePrice) {
            Alert.alert("Error", "Name, at least one Category, and Base Price are required.");
            return;
        }

        const validVariants = variants.filter(v => v.name.trim() !== "");
        if (validVariants.length === 0) {
            Alert.alert("Error", "At least one variant is required.");
            return;
        }

        const formattedVariants = validVariants.map(v => ({
            name: v.name,
            stock: parseInt(v.stock) || 0,
            price: v.price ? parseFloat(v.price) : null,
            image: v.image || null
        }));

        const submissionData: any = {
            ...formData,
            categories: selectedCategories,
            basePrice: parseFloat(formData.basePrice) || 0,
            discountPercentage: parseFloat(formData.discountPercentage) || 0,
            variants: formattedVariants
        };

        try {
            setLoading(true);
            await productAPI.createProduct(submissionData);
            Alert.alert("Success", "Product created successfully!");
            router.back();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to create product: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
                    <Text style={{ fontSize: 20, color: '#333' }}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Post New Product</Text>
                <View style={{ width: 40 }} />
            </View>
            <ProductForm
                onSubmit={handleSubmit}
                loading={loading}
                submitLabel="Create Product"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
});
