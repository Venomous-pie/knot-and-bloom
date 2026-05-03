import { categoryTitles } from '@/constants/categories';
import { isMobile } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { useSellerSettings } from '@/contexts/SellerSettingsContext';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, RefreshCcw, Sparkles, Lock, Package, Tag, Image as ImageIcon, Layers, FileText, PhilippinePeso, Percent, Archive, Truck, Gift } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
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
    Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageUploader from './ImageUploader';
import ProductPreview from './ProductPreview';
import InfoBox from '@/shared/InfoBox';
import VariantEditor, { VariantData } from './VariantEditor';
import { toTitleCase, toSentenceCase } from '@/utils/textUtils';
import { PRESET_MATERIALS } from '@/constants/materials';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';



export interface ProductFormData {
    name: string;
    sku: string;
    basePrice: string;
    discountPercentage: string;
    image: string;
    materials: string;
    bundleQuantity: string;
    isCodAllowed: boolean;
    isBundle: boolean;
    description: string;
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
    onDataChange?: (data: {
        formData: ProductFormData;
        selectedCategories: string[];
        variants: VariantData[];
    }) => void;
    productStatus?: string;
}

const STEPS = [
    { id: 1, title: 'Basic Info', shortTitle: 'Info' },
    { id: 2, title: 'Details', shortTitle: 'Details' },
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
    onDataChange,
    productStatus,
}: ProductFormWizardProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const { user } = useAuth();
    const { confirm } = useDialog();

    const initializedRef = useRef(false);
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
        isCodAllowed: true,
        isBundle: false,
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([
        { name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', images: [] }
    ]);
    const [images, setImages] = useState<{ uri: string; isUrl?: boolean }[]>([]);
    const [showPreview, setShowPreview] = useState(!mobile);

    const [generatingSku, setGeneratingSku] = useState(false);
    const [generatingDescription, setGeneratingDescription] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(0);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const { settings } = useSellerSettings();
    const router = useRouter();

    const categories = Object.values(categoryTitles);

    const DRAFT_KEY = 'product_form_draft';

    // Load draft on mount if not editing
    const draftInitializedRef = useRef(false);

    useEffect(() => {
        if (!isEditing && !draftInitializedRef.current) {
            loadDraft();
            draftInitializedRef.current = true;
        }
    }, [isEditing]);

    // Save draft on change
    useEffect(() => {
        if (onDataChange) {
            onDataChange({ formData, selectedCategories, variants });
        }
        if (!isEditing) {
            const timer = setTimeout(() => {
                saveDraft();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [formData, selectedCategories, variants, isEditing, onDataChange]);

    const loadDraft = async () => {
        try {
            const saved = await AsyncStorage.getItem(DRAFT_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setFormData(parsed.formData);
                setSelectedCategories(parsed.selectedCategories);
                setVariants(parsed.variants);
                if (parsed.images && parsed.images.length > 0) {
                    setImages(parsed.images);
                } else if (parsed.formData.image) {
                    setImages([{ uri: parsed.formData.image, isUrl: true }]);
                }
            }
        } catch (error) {
            console.error('Failed to load draft', error);
        }
    };

    const saveDraft = async () => {
        try {
            const data = { formData, selectedCategories, variants, images };
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
        if (initialData && !initializedRef.current) {
            initializedRef.current = true;
            setFormData(initialData.formData);
            setSelectedCategories(initialData.selectedCategories);
            setVariants(initialData.variants.length > 0
                ? initialData.variants
                : [{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', images: [] }]
            );
            if (initialData.formData.image) {
                setImages([{ uri: initialData.formData.image, isUrl: true }]);
            }
        } else if (!isEditing && !initializedRef.current) {
            initializedRef.current = true;
            loadDraft();
        }
    }, [initialData, isEditing]);

    // Sync primary image to formData
    useEffect(() => {
        if (images.length > 0) {
            setFormData(prev => ({ ...prev, image: images[0].uri }));
        } else {
            setFormData(prev => ({ ...prev, image: '' }));
        }
    }, [images]);

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    // Auto-generate SKU
    useEffect(() => {
        if (selectedCategories.length > 0) {
            const timer = setTimeout(() => {
                const autoGenerateSku = async () => {
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
                            setVariants(prevVariants => prevVariants.map(v => ({
                                ...v,
                                sku: v.name ? `${data.sku}-${v.name.toUpperCase().replace(/\s+/g, '-')}` : ''
                            })));
                        }
                    } catch (error) {
                        // Silent fail for auto-gen
                    } finally {
                        setGeneratingSku(false);
                    }
                };
                autoGenerateSku();
            }, 800); // 800ms debounce

            return () => clearTimeout(timer);
        }
    }, [selectedCategories[0], JSON.stringify(variants.map(v => v.name))]);

    const executeReset = () => {
        setFormData({
            name: '', sku: '', basePrice: '', discountPercentage: '', image: '',
            description: '', materials: '', bundleQuantity: '1', isCodAllowed: true, isBundle: false,
        });
        setSelectedCategories([]);
        setVariants([{ name: 'Default', stock: '0', sku: '', price: '', discountPercentage: '', images: [] }]);
        setImages([]);
        setCurrentStep(1);
    };

    const handleReset = async () => {
        const confirmed = await confirm({
            title: "Start Over?",
            message: "Are you sure you want to discard all changes and start fresh?",
            confirmText: "Start Over",
            cancelText: "Cancel",
            isDestructive: true
        });

        if (confirmed) {
            executeReset();
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
        const newErrors: Record<string, string> = {};
        let isValid = true;

        switch (step) {
            case 1:
                if (images.length === 0) {
                    newErrors.images = 'Please upload at least one product image.';
                    isValid = false;
                }
                if (!formData.name.trim()) {
                    newErrors.name = 'Please enter a product name.';
                    isValid = false;
                }
                if (selectedCategories.length === 0) {
                    newErrors.categories = 'Please select at least one category.';
                    isValid = false;
                }
                break;
            case 2:
                if (!formData.sku.trim()) {
                    newErrors.sku = 'Please enter or generate a Base SKU.';
                    isValid = false;
                }
                if (!formData.basePrice.trim() || isNaN(Number(formData.basePrice)) || Number(formData.basePrice) < 0) {
                    newErrors.basePrice = 'Please enter a valid base price (0 or greater).';
                    isValid = false;
                }
                if (formData.discountPercentage && (isNaN(Number(formData.discountPercentage)) || Number(formData.discountPercentage) < 0 || Number(formData.discountPercentage) > 100)) {
                    newErrors.discountPercentage = 'Discount must be between 0 and 100.';
                    isValid = false;
                }
                if (!formData.description.trim()) {
                    newErrors.description = 'Please enter a product description.';
                    isValid = false;
                }

                if (formData.isBundle && (!formData.bundleQuantity.trim() || isNaN(Number(formData.bundleQuantity)) || !Number.isInteger(Number(formData.bundleQuantity)) || Number(formData.bundleQuantity) < 2)) {
                    newErrors.bundleQty = 'Bundle quantity must be a whole number of at least 2.';
                    isValid = false;
                }
                break;
            case 3:
                variants.forEach((v, i) => {
                    if (!v.stock.trim() || isNaN(Number(v.stock)) || !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0) {
                        newErrors[`variant-${i}-stock`] = i === 0
                            ? 'Main product stock must be a valid number (0 or more).'
                            : 'Variant stock must be a valid number (0 or more).';
                        isValid = false;
                    }
                    if (i > 0 && !v.name.trim()) {
                        newErrors[`variant-${i}-name`] = 'Please enter a variant name.';
                        isValid = false;
                    }
                    if (i === 0 && (!v.materials || !v.materials.trim())) {
                        newErrors[`variant-${i}-materials`] = 'Base materials and inclusions are required.';
                        isValid = false;
                    }
                    if (i > 0 && (!v.images || v.images.length === 0)) {
                        newErrors[`variant-${i}-images`] = 'Please upload at least one image for this variant.';
                        isValid = false;
                    }
                });
                break;
        }

        if (!isValid) {
            setErrors(prev => ({ ...prev, ...newErrors }));
        }

        return isValid;
    };

    // Shows a confirmation dialog for non-blocking warnings before advancing a step.
    // Returns true if the user confirms (or there's nothing to warn about).
    const warnStep = async (step: number): Promise<boolean> => {
        if (step === 3) {
            const mainIsZero = variants[0] && (variants[0].stock === '0' || variants[0].stock === '');
            const zeroNonDefault = variants.slice(1).filter(v => v.stock === '0' || v.stock === '');

            if (mainIsZero || zeroNonDefault.length > 0) {
                let message: string;
                if (mainIsZero && zeroNonDefault.length > 0) {
                    message = 'The main product and some variants have 0 stock. These will not be available for purchase until stock is updated.\n\nAre you sure you want to continue?';
                } else if (mainIsZero) {
                    message = 'The main product currently has 0 stock.\n\nSellers with 0 stock cannot receive new orders until stock is updated. Are you sure you want to continue?';
                } else {
                    const names = zeroNonDefault.map(v => `"${v.name || 'Unnamed'}"`).join(', ');
                    message = `The following variant(s) have 0 stock: ${names}.\n\nThese variants won't be available for purchase. Are you sure you want to continue?`;
                }
                const confirmed = await confirm({
                    title: '⚠️ Zero Stock',
                    message,
                    confirmText: 'Yes, continue',
                    cancelText: 'Go back & fix',
                });
                return confirmed;
            }
        }
        return true;
    };

    const goToStep = async (step: number) => {
        if (step > currentStep) {
            for (let s = currentStep; s < step; s++) {
                if (!validateStep(s)) {
                    setCurrentStep(s);
                    return;
                }
                const ok = await warnStep(s);
                if (!ok) {
                    setCurrentStep(s);
                    return;
                }
            }
        }
        setCurrentStep(step);
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;
        try {
            await onSubmit({ formData, selectedCategories, variants });
            if (!isEditing) clearDraft();
        } catch (error) {
            console.error('Submission failed:', error);
            // Re-throw if parent expects to handle it synchronously, 
            // but for now we just prevent the unhandled rejection crash.
        }
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
                        <Text style={styles.stepTitle}>Basic Information & Media</Text>
                        {/* Product Images */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Product Images</Text>
                            <Text style={[styles.stepDescription, { marginTop: 0, marginBottom: 8 }]}>
                                Add photos to showcase your product. The first image will be the primary photo.
                            </Text>
                            <View style={[errors.images && styles.fieldErrorContainer]}>
                                <ImageUploader
                                    images={images}
                                    onImagesChange={(newImages) => {
                                        setImages(newImages);
                                        if (errors.images) {
                                            setErrors(prev => { const n = {...prev}; delete n.images; return n; });
                                        }
                                    }}
                                    maxImages={5}
                                />
                            </View>
                            {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
                        </View>
                        {/* Product Name */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Product Name *</Text>
                            <TextInput
                                style={[styles.input, focusedField === 'name' && styles.inputFocused, errors.name && styles.inputError]}
                                value={formData.name}
                                onChangeText={(text: string) => handleChange('name', text)}
                                placeholder="e.g. Handmade Crochet Bear"
                                placeholderTextColor={theme.colors.textLight}
                                autoCapitalize="sentences"
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (formData.name) {
                                        handleChange('name', toTitleCase(formData.name));
                                    }
                                }}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Categories */}
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Categories *</Text>
                            <View style={[styles.categoryList, errors.categories && styles.fieldErrorContainer]}>
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
                                                if (errors.categories) {
                                                    setErrors(prev => { const n = {...prev}; delete n.categories; return n; });
                                                }
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
                            </View>
                            {errors.categories && <Text style={styles.errorText}>{errors.categories}</Text>}
                            <Text style={{ fontSize: 11, color: theme.colors.textLight, marginTop: 4, paddingHorizontal: 4 }}>
                                Hint: You can select multiple categories.
                            </Text>
                        </View>

                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Product Details</Text>
                        {/* SKU */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>SKU (Stock Keeping Unit)</Text>
                                {generatingSku && (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                )}
                            </View>
                            <InfoBox
                                type="info"
                                message="A Stock Keeping Unit (SKU) is a unique code used to track your inventory. You can enter your own or let us auto-generate one based on your product category."
                                style={{ marginBottom: 12 }}
                                storageKey="product_form_sku_info"
                            />
                            {/* SKU Requirements Hint */}
                            {!formData.sku && (
                                <View style={styles.skuRequirements}>
                                    <View style={styles.skuReqItem}>
                                        <Text style={[styles.skuReqIcon, selectedCategories.length > 0 && styles.skuReqIconDone]}>
                                            {selectedCategories.length > 0 ? '✓' : '○'}
                                        </Text>
                                        <Text style={[styles.skuReqText, selectedCategories.length > 0 && styles.skuReqTextDone]}>
                                            {selectedCategories.length > 0 
                                                ? 'Category selected for auto-generation'
                                                : 'Select a category in Step 1 to auto-generate SKU'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            <TextInput
                                style={[styles.input, focusedField === 'sku' && styles.inputFocused, errors.sku && styles.inputError]}
                                value={formData.sku}
                                onChangeText={(text: string) => handleChange('sku', text.toUpperCase().replace(/\s+/g, '-'))}
                                placeholder="e.g. BEAR-001"
                                placeholderTextColor={theme.colors.textLight}
                                autoCapitalize="sentences"
                                onFocus={() => setFocusedField('sku')}
                                onBlur={async () => {
                                    setFocusedField(null);
                                    if (!formData.sku.trim() && selectedCategories.length > 0) {
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
                                                setVariants(prevVariants => prevVariants.map(v => ({
                                                    ...v,
                                                    sku: v.name ? `${data.sku}-${v.name.toUpperCase().replace(/\s+/g, '-')}` : ''
                                                })));
                                            }
                                        } catch {
                                            // silent fail
                                        } finally {
                                            setGeneratingSku(false);
                                        }
                                    }
                                }}
                            />
                            {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
                        </View>

                        <View style={mobile ? styles.fieldColumn : styles.fieldRow}>
                            <View style={[styles.field, !mobile && { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Base Price (₱) *</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'basePrice' && styles.inputFocused, errors.basePrice && styles.inputError]}
                                    value={formData.basePrice}
                                    onChangeText={(text: string) => {
                                        const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/^0+(?=\d)/, '');
                                        handleChange('basePrice', clean);
                                    }}
                                    placeholder="0.00"
                                    placeholderTextColor={theme.colors.textLight}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('basePrice')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.basePrice && <Text style={styles.errorText}>{errors.basePrice}</Text>}
                            </View>
                            <View style={[styles.field, !mobile && { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Discount (%)</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'discount' && styles.inputFocused]}
                                    value={formData.discountPercentage}
                                    onChangeText={(text: string) => {
                                        const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/^0+(?=\d)/, '');
                                        handleChange('discountPercentage', clean);
                                    }}
                                    placeholder="0"
                                    placeholderTextColor={theme.colors.textLight}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('discount')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.discountPercentage && <Text style={styles.errorText}>{errors.discountPercentage}</Text>}
                            </View>
                        </View>

                        {/* Intelligent COD Toggle */}
                        {Number(formData.basePrice) >= 200 && (
                            <View style={styles.switchContainer}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchLabel}>Allow Cash on Delivery (COD)?</Text>
                                    <Text style={styles.switchSub}>
                                        For items over ₱200, you can disable COD to reduce cancellation risks.
                                    </Text>
                                </View>
                                <Switch
                                    trackColor={{ false: theme.colors.textSecondary, true: theme.colors.primary }}
                                    thumbColor={formData.isCodAllowed ? "#f4f3f4" : "#f4f3f4"}
                                    onValueChange={() => setFormData(prev => ({ ...prev, isCodAllowed: !prev.isCodAllowed }))}
                                    value={formData.isCodAllowed}
                                />
                            </View>
                        )}

                        {/* Description field moved here */}
                        {/* Description */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>Description</Text>
                                {settings.aiDescriptionEnabled ? (
                                    <Pressable onPress={handleGenerateDescription} disabled={generatingDescription}>
                                        {generatingDescription ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <View style={styles.autoGenButton}>
                                                <Sparkles size={14} color={theme.colors.primary} />
                                                <Text style={styles.autoGenText}>AI Generate</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        style={styles.autoGenButtonLocked}
                                        onPress={() => router.push('/seller-dashboard/settings' as any)}
                                    >
                                        <Lock size={12} color={theme.colors.textLight} />
                                        <Text style={styles.autoGenTextLocked}>AI Generate</Text>
                                    </Pressable>
                                )}
                            </View>
                            <TextInput
                                style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused, errors.description && styles.inputError]}
                                value={formData.description}
                                onChangeText={(text: string) => handleChange('description', text)}
                                placeholder="Describe your product..."
                                placeholderTextColor={theme.colors.textLight}
                                multiline
                                numberOfLines={5}
                                onFocus={() => setFocusedField('description')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (formData.description) {
                                        handleChange('description', toSentenceCase(formData.description));
                                    }
                                }}
                            />
                            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                        </View>


                        
                        
                        {/* Bundle / Giftbox Toggle */}
                        <View style={styles.switchContainer}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.switchLabel}>Is this a Bundle or Giftbox?</Text>
                                <Text style={styles.switchSub}>
                                    Check this if the product contains multiple items sold together.
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: theme.colors.textSecondary, true: theme.colors.primary }}
                                thumbColor={formData.isBundle ? "#f4f3f4" : "#f4f3f4"}
                                onValueChange={() => setFormData(prev => ({ ...prev, isBundle: !prev.isBundle }))}
                                value={formData.isBundle}
                            />
                        </View>
                        
                        {/* Bundle Quantity - Conditional */}
                        {formData.isBundle && (
                            <View style={styles.field}>
                                <Text style={styles.fieldLabel}>Bundle Quantity</Text>
                                <TextInput
                                    style={[styles.input, focusedField === 'bundleQty' && styles.inputFocused, errors.bundleQty && styles.inputError]}
                                    value={formData.bundleQuantity}
                                    onChangeText={(text: string) => handleChange('bundleQuantity', text.replace(/^0+(?=\d)/, '').replace(/[^0-9]/g, ''))}
                                    placeholder="Total number of items in the bundle (e.g. 3)"
                                    placeholderTextColor={theme.colors.textLight}
                                    keyboardType="numeric"
                                    onFocus={() => setFocusedField('bundleQty')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                {errors.bundleQty && <Text style={styles.errorText}>{errors.bundleQty}</Text>}
                            </View>
                        )}
                    </View>
                );

            case 3:
                return (
                    <VariantEditor
                        variants={variants}
                        onVariantsChange={(newVariants) => {
                            setVariants(newVariants);
                            setErrors(prev => {
                                const next = { ...prev };
                                Object.keys(next).filter(k => k.startsWith('variant-')).forEach(k => delete next[k]);
                                return next;
                            });
                        }}
                        baseSku={formData.sku}
                        basePrice={formData.basePrice}
                        baseDiscount={formData.discountPercentage}
                        onGenerateVariantSku={handleGenerateVariantSku}
                        onExpandedChange={setActiveVariantIndex}
                        productImages={images}
                        variantErrors={errors}
                    />
                );

            case 4:
                const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);

                return (
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>Review & Submit</Text>
                        <Text style={styles.stepDescription}>
                            Review your product details before submitting.
                        </Text>
                        
                        {!isEditing && (
                            <InfoBox
                                message="New products require admin approval before they appear in the shop."
                                type="info"
                                style={{ marginBottom: 20 }}
                            />
                        )}

                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Product Summary</Text>
                            
                            {/* Basic Info */}
                            <Text style={styles.summarySectionTitle}>Basic Info</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <Tag size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Name:</Text>
                                </View>
                                <Text style={styles.summaryValue}>{formData.name || '—'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <Archive size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>SKU:</Text>
                                </View>
                                <Text style={styles.summaryValue}>{formData.sku || '—'}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <Layers size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Categories:</Text>
                                </View>
                                <Text style={styles.summaryValue}>{selectedCategories.join(', ') || '—'}</Text>
                            </View>

                            <View style={styles.summaryDivider} />

                            {/* Details & Pricing */}
                            <Text style={styles.summarySectionTitle}>Details & Pricing</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <PhilippinePeso size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Base Price:</Text>
                                </View>
                                <Text style={styles.summaryValue}>₱{formData.basePrice || '0'}</Text>
                            </View>
                            {formData.discountPercentage && parseFloat(formData.discountPercentage) > 0 && (
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryLabelContainer}>
                                        <Percent size={16} color={theme.colors.textLight} />
                                        <Text style={styles.summaryLabel}>Discount:</Text>
                                    </View>
                                    <Text style={[styles.summaryValue, { color: theme.colors.error }]}>{formData.discountPercentage}% OFF</Text>
                                </View>
                            )}
                            {Number(formData.basePrice) >= 200 && (
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryLabelContainer}>
                                        <Truck size={16} color={theme.colors.textLight} />
                                        <Text style={styles.summaryLabel}>Cash on Delivery:</Text>
                                    </View>
                                    <Text style={styles.summaryValue}>{formData.isCodAllowed ? 'Enabled' : 'Disabled'}</Text>
                                </View>
                            )}
                            {formData.isBundle && (
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryLabelContainer}>
                                        <Gift size={16} color={theme.colors.textLight} />
                                        <Text style={styles.summaryLabel}>Bundle Configuration:</Text>
                                    </View>
                                    <Text style={styles.summaryValue}>{formData.bundleQuantity} items</Text>
                                </View>
                            )}
                            <View style={[styles.summaryRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                                <View style={styles.summaryLabelContainer}>
                                    <FileText size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Description:</Text>
                                </View>
                                <Text 
                                    style={[styles.summaryValue, { marginTop: 4, textAlign: 'left', flex: 0 }]} 
                                    numberOfLines={isDescriptionExpanded ? undefined : 2}
                                >
                                    {formData.description || '—'}
                                </Text>
                                {formData.description && formData.description.length > 100 && (
                                    <Pressable 
                                        onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.primary }}>
                                            {isDescriptionExpanded ? 'See less' : 'See more'}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.summaryDivider} />

                            {/* Inventory & Media */}
                            <Text style={styles.summarySectionTitle}>Inventory & Media</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <ImageIcon size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Images:</Text>
                                </View>
                                <Text style={styles.summaryValue}>
                                    {images.length + variants.reduce((sum, v) => sum + (v.images?.length || 0), 0)}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryLabelContainer}>
                                    <Package size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Total Stock:</Text>
                                </View>
                                <Text style={styles.summaryValue}>{totalStock}</Text>
                            </View>

                            <View style={{ marginTop: 8, gap: 8 }}>
                                <View style={styles.summaryLabelContainer}>
                                    <Layers size={16} color={theme.colors.textLight} />
                                    <Text style={styles.summaryLabel}>Variants Details:</Text>
                                </View>
                                {variants.map((v, i) => (
                                    <View key={i} style={styles.summaryVariantItem}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                            <Text style={styles.summaryVariantName}>
                                                {v.name || 'Unnamed'} {i === 0 && <Text style={{ color: theme.colors.primary, fontSize: 10 }}>(Default)</Text>}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: theme.colors.textLight, fontFamily: 'monospace' }}>
                                                {v.sku || (i === 0 ? formData.sku : `${formData.sku}-${v.name.toUpperCase().replace(/\s+/g, '-')}`)}
                                            </Text>
                                        </View>
                                        <Text style={styles.summaryVariantDetail}>
                                            <Text style={{ fontWeight: '600', color: theme.colors.text }}>Stock: {v.stock || '0'}</Text>
                                            {' • '}
                                            {v.price ? `₱${v.price}` : `Inherits ₱${formData.basePrice || '0'}`}
                                            {i === 0 && images.length > 0 
                                                ? ` • ${images.length} base image(s)` 
                                                : (v.images && v.images.length > 0 ? ` • ${v.images.length} image(s)` : '')}
                                        </Text>
                                        <Text style={[styles.summaryVariantDetail, { marginTop: 2 }]}>
                                            <Text style={{ fontWeight: '500' }}>Materials:</Text>{' '}
                                            {v.materials 
                                                ? v.materials 
                                                : (i === 0 ? 'None specified' : <Text style={{ fontStyle: 'italic' }}>Inherits '{variants[0].materials || 'None'}'</Text>)}
                                        </Text>
                                    </View>
                                ))}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable onPress={() => {
                        if (onBack) onBack();
                        else router.back();
                    }} style={styles.backButton}>
                        <ArrowLeft size={20} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>
                        {isEditing ? 'Edit Product' : 'New Product'}
                    </Text>
                    
                    {/* Status Badge */}
                    {isEditing && productStatus && (
                        <View style={[
                            styles.statusBadge, 
                            { 
                                backgroundColor: productStatus === 'ACTIVE' ? '#10B98120' : 
                                                 productStatus === 'PENDING' ? '#F59E0B20' : 
                                                 productStatus === 'SUSPENDED' ? '#EF444420' : '#6B728020'
                            }
                        ]}>
                            <Text style={[
                                styles.statusText, 
                                { 
                                    color: productStatus === 'ACTIVE' ? '#10B981' : 
                                           productStatus === 'PENDING' ? '#F59E0B' : 
                                           productStatus === 'SUSPENDED' ? '#EF4444' : '#6B7280'
                                }
                            ]}>
                                Status: {productStatus}
                            </Text>
                        </View>
                    )}
                </View>
                
                {!isEditing && (
                    <Pressable
                        style={styles.resetButtonIcon}
                        onPress={handleReset}
                    >
                        <RefreshCcw size={16} color={theme.colors.textSecondary} />
                        {!mobile && <Text style={{ fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600' }}>Start Over</Text>}
                    </Pressable>
                )}
            </View>

            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    {STEPS.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <Pressable
                                testID={`step-indicator-${step.id}`}
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
            </View>

            {/* Main Content Area */}
            <View style={styles.mainContent}>
                <View style={{ flex: 1, flexDirection: 'column' }}>
                    {/* Form Area */}
                    {currentStep === 3 ? (
                        <View style={[styles.formArea, !mobile && showPreview && { flex: 1 }, { flex: 1 }]}>
                            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
                                <Text style={styles.stepTitle}>Variants & Stock</Text>
                            </View>
                            {renderStepContent()}
                        </View>
                    ) : (
                        <ScrollView
                            style={[styles.formArea, !mobile && showPreview && { flex: 1 }]}
                            contentContainerStyle={styles.formAreaContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {renderStepContent()}
                        </ScrollView>
                    )}

                    {/* Navigation Footer */}
                    <View style={styles.footer}>
                        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                            {currentStep > 1 ? (
                                <Pressable
                                    style={styles.secondaryButton}
                                    onPress={() => setCurrentStep(currentStep - 1)}
                                >
                                    <ArrowLeft size={18} color={theme.colors.primary} />
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
                    </View>
                </View>

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
                            sellerName={user?.sellerStoreName}
                            //@ts-ignore
                            sellerLogo={settings?.logo}
                        />
                    </View>
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
                        sellerName={user?.sellerStoreName}
                        //@ts-ignore
                        sellerLogo={settings?.logo}
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
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
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
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        fontWeight: '700',
        fontSize: 11,
        fontFamily: 'Quicksand',
        letterSpacing: 0.5,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    resetButtonIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FCFAFA',
        borderWidth: 1,
        borderColor: '#E8D5D9',
        width: 120,
        justifyContent: 'center',
    },
    stepItem: {
        alignItems: 'center',
        gap: 6,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stepCircleActive: {
        backgroundColor: theme.colors.primary,
    },
    stepCircleCurrent: {
        borderColor: theme.colors.primary,
        backgroundColor: 'white',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
    stepNumberActive: {
        color: theme.colors.primary,
    },
    stepLabel: {
        fontSize: 11,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    stepLabelActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: theme.colors.border,
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: theme.colors.primary,
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
        borderLeftColor: theme.colors.border,
        backgroundColor: theme.colors.background,
    },
    stepContent: {
        // gap: 20,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    stepDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        marginBottom: 20,
    },
    field: {
        gap: 8,
        marginVertical: 5,
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
        color: theme.colors.textSecondary,
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
        color: theme.colors.primary,
        fontWeight: '600',
    },
    autoGenButtonLocked: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        opacity: 0.65,
    },
    autoGenTextLocked: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontWeight: '500',
    },
    input: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        backgroundColor: theme.colors.backgroundAlt,
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: 'white',
    },
    inputError: {
        borderColor: theme.colors.error || '#D32F2F',
    },
    errorText: {
        color: theme.colors.error || '#D32F2F',
        fontSize: 12,
        fontFamily: 'Quicksand',
        marginTop: 2,
    },
    fieldErrorContainer: {
        borderColor: theme.colors.error || '#D32F2F',
        borderWidth: 1,
        borderRadius: 12,
        padding: 4,
    },
    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    categoryList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: theme.colors.subtle,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    categoryText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
    },
    categoryTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 4,
    },
    summarySectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 8,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    summaryLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summaryLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 4,
    },
    summaryVariantItem: {
        backgroundColor: theme.colors.subtle,
        padding: 10,
        borderRadius: 8,
        marginLeft: 22, // Align with text past the icon
        borderWidth: 1,
        borderColor: theme.colors.border + '50',
    },
    summaryVariantName: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    summaryVariantDetail: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
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
        backgroundColor: theme.colors.backgroundAlt,
    },
    draftButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
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
        color: theme.colors.primary,
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
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: theme.colors.shadow,
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
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    skuReqTextDone: {
        color: theme.colors.success,
    },
    // Switch Styles
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.primaryLight,
        padding: 12,
        borderRadius: 12,
        marginVertical: 24,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 2
    },
    switchSub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginRight: 16
    },
    materialSuggestions: {
        marginTop: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    materialChipsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    materialChip: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    materialChipText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    skuRequirements: {
        marginBottom: 8,
    },
    skuReqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    skuReqIcon: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    skuReqIconDone: {
        color: theme.colors.success,
    },
    skuReqText: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
});
