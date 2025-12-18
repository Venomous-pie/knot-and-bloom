import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { categoryTitles } from "@/constants/categories";
import { ProductDescriptionGenerator } from "@/services/descriptionGenerator";
import { SKUGenerator } from "@/services/skuGenerator";
import { CreateProductData } from "@/types/products";
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
        category: "",
        variants: "",
        basePrice: "",
        discountPercentage: "",
        stock: "",
        image: "",
        description: "",
    });

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
        if (!formData.name || !formData.category || !formData.basePrice) {
            Alert.alert("Error", "Name, Category, and Base Price are required.");
            if (typeof window !== 'undefined') {
                alert("Name, Category, and Base Price are required.");
            }
            return;
        }

        const submissionData: CreateProductData = {
            ...formData,
            basePrice: parseFloat(formData.basePrice) || 0,
            discountPercentage: parseFloat(formData.discountPercentage) || 0,
            stock: parseInt(formData.stock) || 0,
        };

        try {
            setLoading(true);
            await productAPI.createProduct(submissionData);
            Alert.alert("Success", "Product created successfully!");
            if (typeof window !== 'undefined') {
                alert("Product created successfully!");
            }
            router.back();
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to create product");
            if (typeof window !== 'undefined') {
                alert("Failed to create product: " + (error.response?.data?.message || error.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSku = async () => {
        if (!formData.category) {
            Alert.alert("Required", "Please select a category first");
            return;
        }
        try {
            const sku = await SKUGenerator({
                category: formData.category,
                variants: formData.variants || undefined
            });
            handleChange("sku", sku);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to generate SKU");
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name || !formData.category || !formData.basePrice) {
            Alert.alert("Required", "Please fill Name, Category, and Price first");
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
                category: formData.category,
                variants: formData.variants || undefined,
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
                        <Text style={styles.label}>Category *</Text>
                        <View style={styles.categoryContainer}>
                            {/* Simple Category Selector using buttons for now since Picker can be tricky on cross-platform without native-base etc */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryList}>
                                {categories.map((cat) => (
                                    <Pressable
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            formData.category === cat && styles.categoryChipSelected
                                        ]}
                                        onPress={() => handleChange("category", cat)}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            formData.category === cat && styles.categoryTextSelected
                                        ]}>{cat}</Text>
                                    </Pressable>
                                ))}
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

                <View style={styles.row}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Stock</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.stock}
                            onChangeText={(text) => handleChange("stock", text)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#999"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Variants</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.variants}
                            onChangeText={(text) => handleChange("variants", text)}
                            placeholder="e.g. Red, Blue"
                            placeholderTextColor="#999"
                        />
                    </View>
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
});
