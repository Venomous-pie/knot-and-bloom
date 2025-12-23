import { categoryTitles } from "@/constants/categories";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';

export interface ProductFormData {
    name: string;
    sku: string;
    basePrice: string;
    discountPercentage: string;
    image: string;
    description: string;
}

export interface VariantData {
    uid?: number;
    name: string;
    stock: string;
    sku: string;
    price: string;
    discountPercentage: string;
    image: string;
}

interface ProductFormProps {
    initialData?: {
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    };
    onSubmit: (data: {
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    }) => Promise<void>;
    loading: boolean;
    submitLabel: string;
}

export default function ProductForm({ initialData, onSubmit, loading, submitLabel }: ProductFormProps) {
    const [formData, setFormData] = useState<ProductFormData>({
        name: "",
        sku: "",
        basePrice: "",
        discountPercentage: "",
        image: "",
        description: "",
    });

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([
        { name: "", stock: "", sku: "", price: "", discountPercentage: "", image: "" }
    ]);

    const [generatingSku, setGeneratingSku] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData.formData);
            setSelectedCategories(initialData.selectedCategories);
            setVariants(initialData.variants.length > 0 ? initialData.variants : [{ name: "Default", stock: "0", sku: "", price: "", discountPercentage: "", image: "" }]);
        }
    }, [initialData]);

    const categories = Object.values(categoryTitles);

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerateSku = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert("Missing Info", "Please select at least one category to generate SKU.");
            return;
        }

        setGeneratingSku(true);
        try {
            const response = await fetch(`${API_URL}/api/products/generate-sku`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: selectedCategories[0],
                    variants: variants.map(v => v.name).filter(Boolean)
                })
            });

            const data = await response.json();
            if (data.success && data.sku) {
                setFormData(prev => ({ ...prev, sku: data.sku }));
                // Auto-generate variant SKUs based on the new product SKU
                const updatedVariants = variants.map(v => ({
                    ...v,
                    sku: v.name ? `${data.sku}-${v.name.toUpperCase().replace(/\s+/g, '-')}` : ''
                }));
                setVariants(updatedVariants);
            } else {
                Alert.alert("Error", data.message || "Failed to generate SKU");
            }
        } catch (error) {
            console.error("SKU generation error:", error);
            Alert.alert("Error", "Failed to connect to server. Please try again.");
        } finally {
            setGeneratingSku(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name.trim()) {
            Alert.alert("Missing Info", "Please enter a product name to generate description.");
            return;
        }
        if (selectedCategories.length === 0) {
            Alert.alert("Missing Info", "Please select at least one category to generate description.");
            return;
        }

        setGeneratingDescription(true);
        try {
            const response = await fetch(`${API_URL}/api/products/generate-description`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    category: selectedCategories[0],
                    variants: variants.map(v => v.name).filter(Boolean),
                    basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
                    discountedPrice: formData.discountPercentage
                        ? parseFloat(formData.basePrice) * (1 - parseFloat(formData.discountPercentage) / 100)
                        : undefined
                })
            });

            const data = await response.json();
            if (data.success && data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
            } else {
                Alert.alert("Error", data.message || "Failed to generate description");
            }
        } catch (error) {
            console.error("Description generation error:", error);
            Alert.alert("Error", "Failed to connect to server. Please try again.");
        } finally {
            setGeneratingDescription(false);
        }
    };

    const handleGenerateVariantSku = async (index: number) => {
        const variant = variants[index];
        if (!formData.sku) {
            Alert.alert("Missing Info", "Please generate or enter a product SKU first.");
            return;
        }
        if (!variant.name.trim()) {
            Alert.alert("Missing Info", "Please enter a variant name first.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/products/generate-variant-sku`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    baseSKU: formData.sku,
                    variantName: variant.name
                })
            });

            const data = await response.json();
            if (data.success && data.sku) {
                updateVariant(index, 'sku', data.sku);
            } else {
                Alert.alert("Error", data.message || "Failed to generate variant SKU");
            }
        } catch (error) {
            console.error("Variant SKU generation error:", error);
            Alert.alert("Error", "Failed to connect to server.");
        }
    };

    const addVariant = () => {
        setVariants([...variants, { name: "", stock: "", sku: "", price: "", discountPercentage: "", image: "" }]);
    };

    const removeVariant = (index: number) => {
        if (variants.length > 1) {
            setVariants(variants.filter((_, i) => i !== index));
        }
    };

    const updateVariant = (index: number, field: keyof VariantData, value: string) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
    };

    const handleSubmit = () => {
        onSubmit({
            formData,
            selectedCategories,
            variants
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
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
                        <Pressable onPress={handleGenerateSku} disabled={generatingSku}>
                            {generatingSku ? (
                                <ActivityIndicator size="small" color="#B36979" />
                            ) : (
                                <Text style={{ color: '#B36979', fontSize: 12, fontWeight: '600' }}>Auto Gen</Text>
                            )}
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
                    <Text style={styles.label}>Categories *</Text>
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
                                placeholder="e.g. Small Red"
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.variantLabel}>Stock</Text>
                            <TextInput
                                style={styles.variantInput}
                                value={variant.stock}
                                onChangeText={(text) => updateVariant(index, "stock", text)}
                                placeholder="0"
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={{ flex: 2, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={styles.variantLabel}>SKU</Text>
                                <Pressable onPress={() => handleGenerateVariantSku(index)}>
                                    <Text style={{ color: '#B36979', fontSize: 10, fontWeight: '600' }}>Auto Gen</Text>
                                </Pressable>
                            </View>
                            <TextInput
                                style={styles.variantInput}
                                value={variant.sku}
                                onChangeText={(text) => updateVariant(index, "sku", text)}
                                placeholder="Auto-generated"
                                placeholderTextColor="#999"
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
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.variantLabel}>Disc%</Text>
                            <TextInput
                                style={styles.variantInput}
                                value={variant.discountPercentage}
                                onChangeText={(text) => updateVariant(index, "discountPercentage", text)}
                                placeholder={formData.discountPercentage ? `Inherit (${formData.discountPercentage}%)` : "0"}
                                keyboardType="numeric"
                                placeholderTextColor="#999"
                            />
                        </View>
                        {variants.length > 1 && (
                            <Pressable onPress={() => removeVariant(index)} style={styles.removeButton}>
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
                    Tip: Update the "Stock" number directly to restock.
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
                    <Pressable onPress={handleGenerateDescription} disabled={generatingDescription}>
                        {generatingDescription ? (
                            <ActivityIndicator size="small" color="#B36979" />
                        ) : (
                            <Text style={{ color: '#B36979', fontSize: 12, fontWeight: '600' }}>Auto Gen</Text>
                        )}
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
                    <Text style={styles.submitButtonText}>{submitLabel}</Text>
                )}
            </Pressable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 40,
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
    categoryList: {
        flexDirection: 'row',
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
    variantImageRow: {
        marginBottom: 12,
        paddingHorizontal: 10,
    },
    variantImageLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
});
