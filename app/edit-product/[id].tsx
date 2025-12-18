import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { categoryTitles } from "@/constants/categories";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProductPage() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        basePrice: "",
        discountPercentage: "",
        image: "",
        description: "",
    });

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Variant state includes UID for existing ones
    const [variants, setVariants] = useState<Array<{ uid?: number; name: string; stock: string; price: string; image: string }>>([]);

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

            setFormData({
                name: product.name,
                sku: product.sku,
                basePrice: product.basePrice.toString(),
                discountPercentage: product.discountPercentage?.toString() || "",
                image: product.image || "",
                description: product.description || "",
            });

            // Handle categories (ensure array)
            const cats = Array.isArray(product.categories) ? product.categories : [product.categories || ""].filter(Boolean);
            setSelectedCategories(cats);

            // Handle Variants
            if (product.variants && product.variants.length > 0) {
                setVariants(product.variants.map((v: any) => ({
                    uid: v.uid,
                    name: v.name,
                    stock: v.stock.toString(),
                    price: v.price ? v.price.toString() : "",
                    image: v.image || ""
                })));
            } else {
                setVariants([{ name: "Default", stock: "0", price: "", image: "" }]);
            }

        } catch (error) {
            console.error("Failed to load product:", error);
            Alert.alert("Error", "Failed to load product details.");
            router.back();
        } finally {
            setFetching(false);
        }
    };

    const categories = Object.values(categoryTitles);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
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
            await productAPI.updateProduct(id as string, submissionData);
            Alert.alert("Success", "Product updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to update product: " + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const addVariant = () => {
        setVariants([...variants, { name: "", stock: "", price: "", image: "" }]);
    };

    const removeVariant = (index: number) => {
        // If removing an existing variant (with UID), the backend will treat absence from submission as deletion
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index));
        }
    };

    const updateVariant = (index: number, field: string, value: string) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.topHeader}>
                <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
                    <Text style={{ fontSize: 20, color: '#333' }}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Edit Product</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Product Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.name}
                        onChangeText={(text) => handleChange("name", text)}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>SKU</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.sku}
                            onChangeText={(text) => handleChange("sku", text)}
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Categories</Text>
                        <View style={styles.categoryContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {categories.map((cat) => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <Pressable
                                            key={cat}
                                            style={[
                                                styles.categoryChip,
                                                isSelected && styles.categoryChipSelected
                                            ]}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                                } else {
                                                    setSelectedCategories([...selectedCategories, cat]);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.categoryText,
                                                isSelected && styles.categoryTextSelected
                                            ]}>{cat}</Text>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Base Price (₱) *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.basePrice}
                            onChangeText={(text) => handleChange("basePrice", text)}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Discount (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.discountPercentage}
                            onChangeText={(text) => handleChange("discountPercentage", text)}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Variants Section - RESTOCK Happens Here */}
                <View style={[styles.formGroup, styles.sectionBox]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.sectionTitle}>Product Variants & Stock</Text>
                        <Pressable onPress={addVariant} style={styles.addVariantButton}>
                            <Text style={styles.addVariantButtonText}>+ Add Variant</Text>
                        </Pressable>
                    </View>

                    {variants.map((variant, index) => (
                        <View key={index} style={styles.variantRow}>
                            <View style={{ flex: 2, marginRight: 8 }}>
                                <Text style={styles.variantLabel}>Name</Text>
                                <TextInput
                                    style={styles.variantInput}
                                    value={variant.name}
                                    onChangeText={(text) => updateVariant(index, "name", text)}
                                />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={[styles.variantLabel, { color: '#B36979', fontWeight: 'bold' }]}>Stock</Text>
                                <TextInput
                                    style={[styles.variantInput, { borderColor: '#B36979', borderWidth: 1.5 }]}
                                    value={variant.stock}
                                    onChangeText={(text) => updateVariant(index, "stock", text)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.variantLabel}>Price</Text>
                                <TextInput
                                    style={styles.variantInput}
                                    value={variant.price}
                                    onChangeText={(text) => updateVariant(index, "price", text)}
                                    placeholder="Opt."
                                    keyboardType="numeric"
                                />
                            </View>
                            {variants.length > 1 && (
                                <Pressable onPress={() => removeVariant(index)} style={styles.removeButton}>
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                    ))}
                    <Text style={styles.helperText}>
                        Tip: Update the "Stock" number directly to restock.
                    </Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Image URL</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.image}
                        onChangeText={(text) => handleChange("image", text)}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => handleChange("description", text)}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <Pressable
                    style={({ pressed }) => [
                        styles.submitButton,
                        pressed && styles.submitButtonPressed,
                        loading && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitButtonText}>Save Changes</Text>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topHeader: {
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
    formGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fafafa',
        color: '#333',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    sectionBox: {
        backgroundColor: '#fdfdfd',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    submitButton: {
        backgroundColor: '#B36979',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        elevation: 5,
    },
    submitButtonPressed: {
        backgroundColor: '#9e5a69',
        transform: [{ scale: 0.98 }],
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    categoryContainer: {
        height: 50,
        justifyContent: 'center',
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f0f0f0',
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: '#E8D5D9',
        borderColor: '#B36979',
    },
    categoryText: {
        color: '#666',
        fontSize: 12,
    },
    categoryTextSelected: {
        color: '#B36979',
        fontWeight: '600',
    },
    addVariantButton: {
        backgroundColor: '#B36979',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    addVariantButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    variantRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 12,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    variantLabel: {
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    variantInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
        backgroundColor: 'white',
        color: '#333',
    },
    removeButton: {
        width: 24,
        height: 24,
        backgroundColor: '#ff4444',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
        marginBottom: 8,
    },
    removeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        fontStyle: 'italic',
    },
});
