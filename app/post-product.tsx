import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { categoryTitles } from "@/constants/categories";
import { ProductDescriptionGenerator } from "@/services/descriptionGenerator";
import { SKUGenerator } from "@/services/skuGenerator";
import { RelativePathString, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PostProductPage() {
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

    const [formData, setFormData] = useState({
        name: "",
        sku: "",
        basePrice: "",
        discountPercentage: "",
        image: "",
        description: "",
    });

    // Separate state for categories (multi-select)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Separate state for variants array
    const [variants, setVariants] = useState<Array<{ name: string; stock: string; price: string; image: string }>>([
        { name: "", stock: "", price: "", image: "" }
    ]);

    if (authLoading || !user || user.role !== 'ADMIN') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#B36979" />
            </SafeAreaView>
        );
    }

    const categories = Object.values(categoryTitles);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name || selectedCategories.length === 0 || !formData.basePrice) {
            Alert.alert("Error", "Name, at least one Category, and Base Price are required.");
            return;
        }

        // Validate variants
        const validVariants = variants.filter(v => v.name.trim() !== "");
        if (validVariants.length === 0) {
            Alert.alert("Error", "At least one variant is required.");
            return;
        }

        // Format variants for backend
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

    const handleGenerateSku = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert("Required", "Please select at least one category first");
            return;
        }
        try {
            const sku = await SKUGenerator({
                category: selectedCategories[0], // Use first category for SKU
                variants: variants.filter(v => v.name.trim() !== "")
            });
            handleChange("sku", sku);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to generate SKU");
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name || selectedCategories.length === 0 || !formData.basePrice) {
            Alert.alert("Required", "Please fill Name, Category,and Price first");
            return;
        }
        try {
            let discountedPrice = undefined;
            if (formData.basePrice && formData.discountPercentage) {
                const base = parseFloat(formData.basePrice);
                const discount = parseFloat(formData.discountPercentage);
                if (!isNaN(base) && !isNaN(discount)) {
                    discountedPrice = (base * (1 - discount / 100)).toFixed(2);
                }
            }

            const description = await ProductDescriptionGenerator({
                name: formData.name,
                category: selectedCategories[0], // Use first category
                variants: variants.filter(v => v.name.trim() !== ""),
                basePrice: formData.basePrice,
                discountedPrice: discountedPrice
            });
            if (description) {
                handleChange("description", description);
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to generate description");
        }
    };

    const addVariant = () => {
        setVariants([...variants, { name: "", stock: "", price: "", image: "" }]);
    };

    const removeVariant = (index: number) => {
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index));
        }
    };

    const updateVariant = (index: number, field: string, value: string) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.header}>Post New Product</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Product Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.name}
                        onChangeText={(text) => handleChange("name", text)}
                        placeholder="e.g. Handmade Crochet Bear"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>SKU</Text>
                            <Pressable onPress={handleGenerateSku}>
                                <Text style={{ color: '#B36979', fontSize: 12, fontWeight: '600' }}>Auto Gen</Text>
                            </Pressable>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={formData.sku}
                            onChangeText={(text) => handleChange("sku", text)}
                            placeholder="e.g. AG-001"
                            placeholderTextColor="#999"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Categories * (select multiple)</Text>
                        <View style={styles.categoryContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
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
                            placeholder="0.00"
                            placeholderTextColor="#999"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Discount (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.discountPercentage}
                            onChangeText={(text) => handleChange("discountPercentage", text)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                {/* Variants Section */}
                <View style={styles.formGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.label}>Product Variants *</Text>
                        <Pressable onPress={addVariant} style={styles.addVariantButton}>
                            <Text style={styles.addVariantButtonText}>+ Add Variant</Text>
                        </Pressable>
                    </View>

                    {variants.map((variant, index) => (
                        <View key={index} style={styles.variantRow}>
                            <View style={{ flex: 2, marginRight: 8 }}>
                                <Text style={styles.variantLabel}>Name *</Text>
                                <TextInput
                                    style={styles.variantInput}
                                    value={variant.name}
                                    onChangeText={(text) => updateVariant(index, "name", text)}
                                    placeholder="e.g. Small Red"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.variantLabel}>Stock *</Text>
                                <TextInput
                                    style={styles.variantInput}
                                    value={variant.stock}
                                    onChangeText={(text) => updateVariant(index, "stock", text)}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.variantLabel}>Price</Text>
                                <TextInput
                                    style={styles.variantInput}
                                    value={variant.price}
                                    onChangeText={(text) => updateVariant(index, "price", text)}
                                    placeholder="Optional"
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                />
                            </View>
                            {variants.length > 1 && (
                                <Pressable
                                    onPress={() => removeVariant(index)}
                                    style={styles.removeButton}
                                >
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                    ))}

                    {/* Variant Images Section */}
                    {variants.map((variant, index) => variant.name.trim() && (
                        <View key={`img-${index}`} style={styles.variantImageRow}>
                            <Text style={styles.variantImageLabel}>
                                Image for "{variant.name}"
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={variant.image}
                                onChangeText={(text) => updateVariant(index, "image", text)}
                                placeholder="https://example.com/variant-image.jpg"
                                placeholderTextColor="#999"
                            />
                        </View>
                    ))}
                    <Text style={styles.helperText}>
                        Add variants like sizes, colors, etc. Each variant can have its own stock and optional price override.
                    </Text>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Image URL</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.image}
                        onChangeText={(text) => handleChange("image", text)}
                        placeholder="https://example.com/image.jpg"
                        placeholderTextColor="#999"
                    />
                </View>

                <View style={styles.formGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>Description</Text>
                        <Pressable onPress={handleGenerateDescription}>
                            <Text style={{ color: '#B36979', fontSize: 12, fontWeight: '600' }}>Auto Gen</Text>
                        </Pressable>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => handleChange("description", text)}
                        placeholder="Product description..."
                        placeholderTextColor="#999"
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
                        <Text style={styles.submitButtonText}>Create Product</Text>
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
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 25,
        color: '#333',
        textAlign: 'center',
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
    submitButton: {
        backgroundColor: '#B36979',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
    categoryList: {
        flexDirection: 'row',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: '#E8D5D9',
        borderColor: '#B36979',
    },
    categoryText: {
        color: '#666',
        fontSize: 14,
    },
    categoryTextSelected: {
        color: '#B36979',
        fontWeight: '600',
    },
    addVariantButton: {
        backgroundColor: '#B36979',
        paddingHorizontal: 12,
        paddingVertical: 6,
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
        backgroundColor: '#fafafa',
        padding: 12,
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
        width: 28,
        height: 28,
        backgroundColor: '#ff4444',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    removeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        fontStyle: 'italic',
    },
    variantImageRow: {
        marginBottom: 12,
    },
    variantImageLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
});
