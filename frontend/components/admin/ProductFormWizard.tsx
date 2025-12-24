import { categoryTitles } from '@/constants/categories';
import { isMobile } from '@/constants/layout';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageUploader from './ImageUploader';
import ProductPreview from './ProductPreview';
import VariantEditor, { VariantData } from './VariantEditor';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';

const PRESET_MATERIALS = [
    'Cotton', 'Wool', 'Merino Wool', 'Acrylic', 'Polyester', 'Silk',
    'Bamboo', 'Cashmere', 'Linen', 'Hemp', 'Jute', 'Mohair',
    'Alpaca', 'Angora', 'Nylon', 'Rayon', 'Velvet', 'Satin',
    'Leather', 'Faux Leather', 'Felt', 'Fleece', 'Chenille', 'Yarn',
    'Thread', 'Ribbon', 'Beads', 'Buttons', 'Sequins', 'Embroidery Floss',
];

export interface ProductFormData {
    name: string;
    sku: string;
    basePrice: string;
    discountPercentage: string;
    image: string;
    description: string;
    materials: string;
    bundleQuantity: string;
}

interface ProductFormWizardProps {
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
    onSaveDraft?: (data: {
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    }) => Promise<void>;
    onBack: () => void;
    loading: boolean;
    submitLabel: string;
    isEditing?: boolean;
}

const STEPS = [
    { id: 1, title: 'Basic Info', shortTitle: 'Info' },
    { id: 2, title: 'Media', shortTitle: 'Media' },
    { id: 3, title: 'Variants', shortTitle: 'Variants' },
    { id: 4, title: 'Review', shortTitle: 'Review' },
];

export default function ProductFormWizard({
    initialData,
    onSubmit,
    onSaveDraft,
    onBack,
    loading,
    submitLabel,
    isEditing = false,
}: ProductFormWizardProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        basePrice: '',
        discountPercentage: '',
        image: '',
        description: '',
        materials: '',
        bundleQuantity: '1',
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([
        { name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', image: '' }
    ]);
    const [images, setImages] = useState<{ uri: string; isUrl?: boolean }[]>([]);
    const [showPreview, setShowPreview] = useState(!mobile);

    const [generatingSku, setGeneratingSku] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(0);

    const categories = Object.values(categoryTitles);

    const DRAFT_KEY = 'product_form_draft';

    // Load draft on mount if not editing
    useEffect(() => {
        if (!isEditing && !initialData) {
            loadDraft();
        }
    }, [isEditing, initialData]);

    // Save draft on change
    useEffect(() => {
        if (!isEditing) {
            const timer = setTimeout(() => {
                saveDraft();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formData, selectedCategories, variants, isEditing]);

    const loadDraft = async () => {
        try {
            const saved = await AsyncStorage.getItem(DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData);
                setSelectedCategories(parsed.selectedCategories);
                setVariants(parsed.variants);
                if (parsed.formData.image) {
                    setImages([{ uri: parsed.formData.image, isUrl: true }]);
                }
            }
        } catch (error) {
            console.error('Failed to load draft', error);
        }
    };

    const saveDraft = async () => {
        try {
            const data = { formData, selectedCategories, variants };
            await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save draft', error);
        }
    };

    const clearDraft = async () => {
        try {
            await AsyncStorage.removeItem(DRAFT_KEY);
        } catch (error) {
            console.error('Failed to clear draft', error);
        }
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData.formData);
            setSelectedCategories(initialData.selectedCategories);
            setVariants(initialData.variants.length > 0
                ? initialData.variants
                : [{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', image: '' }]
            );
            if (initialData.formData.image) {
                setImages([{ uri: initialData.formData.image, isUrl: true }]);
            }
        }
    }, [initialData]);

    // Sync primary image to formData
    useEffect(() => {
        if (images.length > 0) {
            setFormData(prev => ({ ...prev, image: images[0].uri }));
        }
    }, [images]);

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerateSku = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert('Missing Info', 'Please select at least one category to generate SKU.');
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
                // Auto-generate variant SKUs
                const updatedVariants = variants.map(v => ({
                    ...v,
                    sku: v.name ? `${data.sku}-${v.name.toUpperCase().replace(/\s+/g, '-')}` : ''
                }));
                setVariants(updatedVariants);
            } else {
                Alert.alert('Error', data.message || 'Failed to generate SKU');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to connect to server.');
        } finally {
            setGeneratingSku(false);
        }
    };

    const handleGenerateDescription = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Missing Info', 'Please enter a product name to generate description.');
            return;
        }
        if (selectedCategories.length === 0) {
            Alert.alert('Missing Info', 'Please select at least one category to generate description.');
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
                })
            });

            const data = await response.json();
            if (data.success && data.description) {
                setFormData(prev => ({ ...prev, description: data.description }));
            } else {
                Alert.alert('Error', data.message || 'Failed to generate description');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to connect to server.');
        } finally {
            setGeneratingDescription(false);
        }
    };

    const handleGenerateVariantSku = async (index: number) => {
        const variant = variants[index];
        if (!formData.sku) {
            Alert.alert('Missing Info', 'Please generate or enter a product SKU first.');
            return;
        }
        if (!variant.name.trim()) {
            Alert.alert('Missing Info', 'Please enter a variant name first.');
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
                const updated = [...variants];
                updated[index] = { ...updated[index], sku: data.sku };
                setVariants(updated);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to connect to server.');
        }
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.name.trim()) {
                    Alert.alert('Required', 'Please enter a product name.');
                    return false;
                }
                if (selectedCategories.length === 0) {
                    Alert.alert('Required', 'Please select at least one category.');
                    return false;
                }
                if (!formData.basePrice.trim()) {
                    Alert.alert('Required', 'Please enter a base price.');
                    return false;
                }
                return true;
            case 2:
                return true; // Images are optional
            case 3:
                const hasValidVariant = variants.some(v => v.name.trim() && v.stock.trim());
                if (!hasValidVariant) {
                    Alert.alert('Required', 'Please add at least one variant with name and stock.');
                    return false;
                }
                return true;
            case 4:
                return true;
            default:
                return true;
        }
    };

    const goToStep = (step: number) => {
        if (step > currentStep) {
            if (!validateStep(currentStep)) return;
        }
        setCurrentStep(step);
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;
        await onSubmit({ formData, selectedCategories, variants });
        if (!isEditing) clearDraft();
    };

    const handleSaveDraft = async () => {
        if (onSaveDraft) {
            await onSaveDraft({ formData, selectedCategories, variants });
            if (!isEditing) clearDraft();
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Basic Information</Text>
                        <Text style={styles.stepDescription}>
                            Let's start with the essentials about your product.
                        </Text>

                        {/* Product Name */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Product Name *</Text>
                            <TextInput
                                style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                                value={formData.name}
                                onChangeText={(text: string) => handleChange('name', text)}
                                placeholder="e.g. Handmade Crochet Bear"
                                placeholderTextColor="#999"
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        {/* Categories */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Categories *</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryList}
                            >
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

                        {/* SKU */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>SKU</Text>
                                <Pressable onPress={handleGenerateSku} disabled={generatingSku}>
                                    {generatingSku ? (
                                        <ActivityIndicator size="small" color="#B36979" />
                                    ) : (
                                        <View style={styles.autoGenButton}>
                                            <Sparkles size={14} color="#B36979" />
                                            <Text style={styles.autoGenText}>Auto Generate</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </View>
                            <TextInput
                                style={[styles.input, focusedField === 'sku' && styles.inputFocused]}
                                value={formData.sku}
                                onChangeText={(text: string) => handleChange('sku', text)}
                                placeholder="e.g. CB-001"
                                placeholderTextColor="#999"
                                onFocus={() => setFocusedField('sku')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        {/* Price Row */}
                        <View style={mobile ? styles.fieldColumn : styles.fieldRow}>
                            <View style={[styles.field, !mobile && { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Base Price (₱) *</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'basePrice' && styles.inputFocused]}
                                    value={formData.basePrice}
                                    onChangeText={(text: string) => handleChange('basePrice', text)}
                                    placeholder="0.00"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('basePrice')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                            <View style={[styles.field, !mobile && { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Discount (%)</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'discount' && styles.inputFocused]}
                                    value={formData.discountPercentage}
                                    onChangeText={(text: string) => handleChange('discountPercentage', text)}
                                    placeholder="0"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('discount')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        {/* Materials & Bundle Row */}
                        <View style={mobile ? styles.fieldColumn : styles.fieldRow}>
                            <View style={[styles.field, !mobile && { flex: 2 }]}>
                                <Text style={styles.fieldLabel}>Materials</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'materials' && styles.inputFocused]}
                                    value={formData.materials}
                                    onChangeText={(text: string) => handleChange('materials', text)}
                                    placeholder="Type or select materials..."
                                    placeholderTextColor="#999"
                                    onFocus={() => setFocusedField('materials')}
                                    onBlur={() => setTimeout(() => setFocusedField(null), 150)}
                                />
                                {/* Smart Suggestions */}
                                {focusedField === 'materials' && (
                                    <View style={styles.materialSuggestions}>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.materialChipsRow}
                                        >
                                            {PRESET_MATERIALS
                                                .filter(m => {
                                                    const currentMaterials = formData.materials.toLowerCase().split(',').map(s => s.trim());
                                                    const lastInput = currentMaterials[currentMaterials.length - 1] || '';
                                                    const alreadyAdded = currentMaterials.slice(0, -1).includes(m.toLowerCase());
                                                    return !alreadyAdded && (lastInput === '' || m.toLowerCase().includes(lastInput));
                                                })
                                                .slice(0, 10)
                                                .map((material) => (
                                                    <Pressable
                                                        key={material}
                                                        style={styles.materialChip}
                                                        onPress={() => {
                                                            const parts = formData.materials.split(',').map(s => s.trim()).filter(s => s);
                                                            if (parts.length > 0 && !PRESET_MATERIALS.map(m => m.toLowerCase()).includes(parts[parts.length - 1].toLowerCase())) {
                                                                parts.pop();
                                                            }
                                                            parts.push(material);
                                                            handleChange('materials', parts.join(', '));
                                                        }}
                                                    >
                                                        <Text style={styles.materialChipText}>{material}</Text>
                                                    </Pressable>
                                                ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                            <View style={[styles.field, !mobile && { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Bundle Qty</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'bundleQty' && styles.inputFocused]}
                                    value={formData.bundleQuantity}
                                    onChangeText={(text: string) => handleChange('bundleQuantity', text)}
                                    placeholder="1"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('bundleQty')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>
                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Product Images</Text>
                        <Text style={styles.stepDescription}>
                            Add photos to showcase your product. The first image will be the primary photo.
                        </Text>

                        <ImageUploader
                            images={images}
                            onImagesChange={setImages}
                            maxImages={5}
                        />
                    </View>
                );

            case 3:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Variants & Stock</Text>
                        <Text style={styles.stepDescription}>
                            Configure your product variants, stock levels, and pricing options.
                        </Text>

                        <VariantEditor
                            variants={variants}
                            onVariantsChange={setVariants}
                            baseSku={formData.sku}
                            basePrice={formData.basePrice}
                            baseDiscount={formData.discountPercentage}
                            onGenerateVariantSku={handleGenerateVariantSku}
                            onExpandedChange={setActiveVariantIndex}
                        />
                    </View>
                );

            case 4:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review & Submit</Text>
                        <Text style={styles.stepDescription}>
                            Add a description and review your product before submitting.
                        </Text>

                        {/* Description */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>Description</Text>
                                <Pressable onPress={handleGenerateDescription} disabled={generatingDescription}>
                                    {generatingDescription ? (
                                        <ActivityIndicator size="small" color="#B36979" />
                                    ) : (
                                        <View style={styles.autoGenButton}>
                                            <Sparkles size={14} color="#B36979" />
                                            <Text style={styles.autoGenText}>AI Generate</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </View>
                            <TextInput
                                style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused]}
                                value={formData.description}
                                onChangeText={(text: string) => handleChange('description', text)}
                                placeholder="Describe your product..."
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={5}
                                onFocus={() => setFocusedField('description')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        {/* Summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Product Summary</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Name:</Text>
                                <Text style={styles.summaryValue}>{formData.name || '—'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>SKU:</Text>
                                <Text style={styles.summaryValue}>{formData.sku || '—'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Categories:</Text>
                                <Text style={styles.summaryValue}>{selectedCategories.join(', ') || '—'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Base Price:</Text>
                                <Text style={styles.summaryValue}>₱{formData.basePrice || '0'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Variants:</Text>
                                <Text style={styles.summaryValue}>{variants.length}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Images:</Text>
                                <Text style={styles.summaryValue}>{images.length}</Text>
                            </View>
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={onBack} style={styles.backButton}>
                    <ChevronLeft size={24} color="#333" />
                </Pressable>
                <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Product' : 'New Product'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
                {STEPS.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <Pressable
                            style={styles.stepItem}
                            onPress={() => goToStep(step.id)}
                        >
                            <View style={[
                                styles.stepCircle,
                                currentStep >= step.id && styles.stepCircleActive,
                                currentStep === step.id && styles.stepCircleCurrent,
                            ]}>
                                {currentStep > step.id ? (
                                    <Check size={14} color="white" />
                                ) : (
                                    <Text style={[
                                        styles.stepNumber,
                                        currentStep >= step.id && styles.stepNumberActive
                                    ]}>{step.id}</Text>
                                )}
                            </View>
                            <Text style={[
                                styles.stepLabel,
                                currentStep === step.id && styles.stepLabelActive
                            ]}>
                                {mobile ? step.shortTitle : step.title}
                            </Text>
                        </Pressable>
                        {index < STEPS.length - 1 && (
                            <View style={[
                                styles.stepLine,
                                currentStep > step.id && styles.stepLineActive
                            ]} />
                        )}
                    </React.Fragment>
                ))}
            </View>

            {/* Main Content Area */}
            <View style={styles.mainContent}>
                {/* Form Area */}
                <ScrollView
                    style={[styles.formArea, !mobile && showPreview && { flex: 1 }]}
                    contentContainerStyle={styles.formAreaContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderStepContent()}
                </ScrollView>

                {/* Preview Panel - Desktop Only */}
                {!mobile && showPreview && (
                    <View style={styles.previewPanel}>
                        <ProductPreview
                            name={formData.name}
                            description={formData.description}
                            basePrice={formData.basePrice}
                            discountPercentage={formData.discountPercentage}
                            image={formData.image}
                            images={images}
                            categories={selectedCategories}
                            variants={variants}
                            activeVariantIndex={currentStep === 3 ? activeVariantIndex : null}
                        />
                    </View>
                )}
            </View>

            {/* Navigation Footer */}
            <View style={styles.footer}>
                {currentStep > 1 ? (
                    <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setCurrentStep(currentStep - 1)}
                    >
                        <ArrowLeft size={18} color="#B36979" />
                        <Text style={styles.secondaryButtonText}>Previous</Text>
                    </Pressable>
                ) : (
                    <View />
                )}

                {currentStep < 4 ? (
                    <Pressable
                        style={styles.primaryButton}
                        onPress={() => goToStep(currentStep + 1)}
                    >
                        <Text style={styles.primaryButtonText}>Next</Text>
                        <ArrowRight size={18} color="white" />
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.primaryButton, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Check size={18} color="white" />
                                <Text style={styles.primaryButtonText}>{submitLabel}</Text>
                            </>
                        )}
                    </Pressable>
                )}
            </View>

            {/* Mobile Preview Toggle */}
            {mobile && (
                <Pressable
                    style={styles.previewToggle}
                    onPress={() => setShowPreview(!showPreview)}
                >
                    <Text style={styles.previewToggleText}>
                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </Text>
                </Pressable>
            )}

            {/* Mobile Preview Modal */}
            {mobile && showPreview && (
                <View style={styles.previewModal}>
                    <ProductPreview
                        name={formData.name}
                        description={formData.description}
                        basePrice={formData.basePrice}
                        discountPercentage={formData.discountPercentage}
                        image={formData.image}
                        images={images}
                        categories={selectedCategories}
                        variants={variants}
                    />
                    <Pressable
                        style={styles.closePreview}
                        onPress={() => setShowPreview(false)}
                    >
                        <Text style={styles.closePreviewText}>Close Preview</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FCFAF9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    stepItem: {
        alignItems: 'center',
        gap: 6,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stepCircleActive: {
        backgroundColor: '#B36979',
    },
    stepCircleCurrent: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
    },
    stepNumberActive: {
        color: '#B36979',
    },
    stepLabel: {
        fontSize: 11,
        color: '#888',
        fontFamily: 'Quicksand',
    },
    stepLabelActive: {
        color: '#B36979',
        fontWeight: '600',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: '#B36979',
    },
    mainContent: {
        flex: 1,
        flexDirection: 'row',
    },
    formArea: {
        flex: 1,
    },
    formAreaContent: {
        padding: 20,
        paddingBottom: 100,
    },
    previewPanel: {
        width: 380,
        padding: 20,
        borderLeftWidth: 1,
        borderLeftColor: '#eee',
        backgroundColor: '#f9f9f9',
    },
    stepContent: {
        gap: 20,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    stepDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        fontFamily: 'Quicksand',
    },
    field: {
        gap: 8,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: 16,
    },
    fieldColumn: {
        gap: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        fontFamily: 'Quicksand',
    },
    fieldLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    autoGenButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    autoGenText: {
        fontSize: 12,
        color: '#B36979',
        fontWeight: '600',
    },
    input: {
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        backgroundColor: '#FAFAFA',
        color: '#333',
        fontFamily: 'Quicksand',
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    categoryList: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: '#E8D5D9',
        borderColor: '#B36979',
    },
    categoryText: {
        fontSize: 13,
        color: '#666',
        fontFamily: 'Quicksand',
    },
    categoryTextSelected: {
        color: '#B36979',
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
        marginBottom: 4,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerLeft: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    draftButton: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },
    draftButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#B36979',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    secondaryButtonText: {
        color: '#B36979',
        fontSize: 15,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    previewToggle: {
        position: 'absolute',
        bottom: 80,
        right: 16,
        backgroundColor: '#B36979',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    previewToggleText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    previewModal: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    closePreview: {
        marginTop: 16,
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    closePreviewText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '600',
    },
    materialSuggestions: {
        marginTop: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    materialChipsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    materialChip: {
        backgroundColor: '#E8D5D9',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#B36979',
    },
    materialChipText: {
        fontSize: 13,
        color: '#B36979',
        fontWeight: '500',
    },
});
