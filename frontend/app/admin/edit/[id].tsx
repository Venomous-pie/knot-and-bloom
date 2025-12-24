import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import ProductFormWizard, { ProductFormData } from "@/components/admin/ProductFormWizard";
import { VariantData } from "@/components/admin/VariantEditor";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProductPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [initialData, setInitialData] = useState<{
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    } | undefined>(undefined);

    // Auth Check
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
            } else if (user.role !== 'ADMIN') {
                router.replace('/');
            }
        }
    }, [user, authLoading]);

    // Fetch Product Data
    useEffect(() => {
        if (id && user?.role === 'ADMIN') {
            fetchProductDetails();
        }
    }, [id, user]);

    const fetchProductDetails = async () => {
        try {
            setFetching(true);
            const response = await productAPI.getProductById(id as string);
            const product = response.data.product;

            const formData: ProductFormData = {
                name: product.name,
                sku: product.sku,
                basePrice: product.basePrice.toString(),
                discountPercentage: product.discountPercentage?.toString() || "",
                image: product.image || "",
                description: product.description || "",
                materials: (product as any).materials || "",
                bundleQuantity: (product as any).bundleQuantity?.toString() || "1",
            };

            // Handle categories (ensure array)
            const selectedCategories = Array.isArray(product.categories) ? product.categories : [product.categories || ""].filter(Boolean);

            // Handle Variants
            let variants: VariantData[] = [];
            if (product.variants && product.variants.length > 0) {
                variants = product.variants.map((v: any) => ({
                    uid: v.uid,
                    name: v.name,
                    sku: v.sku || "",
                    stock: v.stock.toString(),
                    price: v.price ? v.price.toString() : "",
                    discountPercentage: v.discountPercentage ? v.discountPercentage.toString() : "",
                    image: v.image || ""
                }));
            } else {
                variants = [{ name: "Default", sku: "", stock: "0", price: "", discountPercentage: "", image: "" }];
            }

            setInitialData({ formData, selectedCategories, variants });

        } catch (error) {
            console.error("Failed to load product:", error);
            Alert.alert("Error", "Failed to load product details.");
            router.back();
        } finally {
            setFetching(false);
        }
    };

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
            uid: v.uid, // Keep UID if it exists (update), else undefined (create)
            name: v.name,
            sku: v.sku,
            stock: parseInt(v.stock) || 0,
            price: v.price ? parseFloat(v.price) : null,
            discountPercentage: v.discountPercentage ? parseFloat(v.discountPercentage) : null,
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
            await productAPI.updateProduct(id as string, submissionData);
            // Explicit redirect instead of back()
            if (Platform.OS === 'web') {
                // Web doesn't always block on Alert, so we redirect immediately or use a slight delay
                // router.replace works better than back() for "finishing" a flow
                window.alert("Product updated successfully!");
                router.replace('/admin');
            } else {
                Alert.alert("Success", "Product updated successfully!", [
                    { text: "OK", onPress: () => router.replace('/admin') }
                ]);
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to update product: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || fetching) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#B36979" />
                <Text>Loading Product...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* The header row is now part of the ProductFormWizard */}
            {initialData && (
                <>
                    {/* Destructure initialData for ProductFormWizard props */}
                    {/* Renamed selectedCategories to categories for prop consistency */}
                    {/* The header row is now integrated into the ProductFormWizard component */}
                    <ProductFormWizard
                        initialData={{
                            formData: initialData.formData,
                            selectedCategories: initialData.selectedCategories, // Use initialData.selectedCategories
                            variants: initialData.variants
                        }}
                        onSubmit={handleSubmit}
                        loading={loading} // Use loading state
                        submitLabel="Save Changes"
                        onBack={() => {
                            if (router.canGoBack()) {
                                router.back();
                            } else {
                                router.replace('/admin');
                            }
                        }}
                        isEditing={true}
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
