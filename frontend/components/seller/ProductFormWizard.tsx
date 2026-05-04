import { categoryTitles } from '@/constants/categories';
import { TAG_SUGGESTIONS, UNIVERSAL_TAGS, validateTag } from '@/constants/tagSuggestions';
import { isMobile } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { useSellerSettings } from '@/contexts/SellerSettingsContext';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, RefreshCcw, Sparkles, Lock, Package, Tag, Image as ImageIcon, Layers, FileText, PhilippinePeso, Percent, Archive, Truck, Gift, Search, Hash, Type, AlignLeft, AlertTriangle } from 'lucide-react-native';
import { calculateOptimizationScore, type OptimizationResult, type ScoreCategory } from '@/utils/optimizationScore';
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
import api from '@/api/api';
import ImageUploader from './ImageUploader';
import ProductPreview from './ProductPreview';
import InfoBox from '@/components/ui/InfoBox';
import VariantEditor, { VariantData } from './VariantEditor';
import OptimizationScoreCircle from '@/components/ui/OptimizationScoreCircle';
import Tooltip from '@/components/ui/Tooltip';
import { toTitleCase, toSentenceCase } from '@/utils/textUtils';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';



export interface ProductFormData {
    name: string;
    sku: string;
    basePrice: string;
    discountPercentage: string;
    image: string;
    images?: string[];
    materials: string;
    bundleQuantity: string;
    isCodAllowed: boolean;
    isBundle: boolean;
    description: string;
    tags: string[];
    metaTitle: string;
    metaDescription: string;
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
        tags: [],
        metaTitle: '',
        metaDescription: '',
    });
    const [tagInput, setTagInput] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
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
                setFormData({ tags: [], metaTitle: '', metaDescription: '', ...parsed.formData });
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
            setFormData({ ...initialData.formData, tags: initialData.formData.tags || [], metaTitle: initialData.formData.metaTitle || '', metaDescription: initialData.formData.metaDescription || '' });
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
            setFormData(prev => ({ 
                ...prev, 
                image: images[0].uri,
                images: images.map(img => img.uri).filter(Boolean)
            }));
        } else {
            setFormData(prev => ({ 
                ...prev, 
                image: '',
                images: []
            }));
        }
    }, [images]);

    // Keep first variant name in sync with product name
    useEffect(() => {
        if (variants.length > 0 && variants[0].name !== formData.name) {
            const nameToUse = formData.name || 'Default';
            setVariants(prev => {
                if (prev[0]?.name === nameToUse) return prev;
                const updated = [...prev];
                updated[0] = { ...updated[0], name: nameToUse };
                return updated;
            });
        }
    }, [formData.name]);

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
                        const response = await api.post('/products/generate-sku', {
                            category: selectedCategories[0],
                            variants: variants.map(v => v.name).filter(Boolean)
                        });

                        const data = response.data;
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
            tags: [], metaTitle: '', metaDescription: '',
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
            const response = await api.post('/products/generate-description', {
                name: formData.name,
                category: selectedCategories[0],
                variants: variants.map(v => v.name).filter(Boolean),
                basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
            });

            const data = response.data;
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
            const response = await api.post('/products/generate-variant-sku', {
                baseSKU: formData.sku,
                variantName: variant.name
            });

            const data = response.data;
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

    const optimizationScoreResult = React.useMemo(() => calculateOptimizationScore({
        image: images[0]?.uri || null,
        name: formData.name,
        description: formData.description,
        tags: formData.tags,
        materials: variants[0]?.materials || '',
        metaTitle: formData.metaTitle,
        metaDescription: formData.metaDescription,
        basePrice: formData.basePrice,
        discountPercentage: formData.discountPercentage,
        variants: variants.map(v => ({ stock: v.stock, images: v.images })),
    }), [images, formData, variants]);

    const SectionTitleWithScore = ({ title, description, style }: { title: string, description?: string, style?: any }) => (
        <View style={[style, { marginBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.stepTitle, { marginBottom: 0 }]}>{title}</Text>
                <Tooltip content="Listing Optimization Score: Higher scores lead to better visibility." position="left">
                    <OptimizationScoreCircle score={optimizationScoreResult.totalScore} size={36} strokeWidth={3} />
                </Tooltip>
            </View>
            {description ? (
                <Text style={[styles.stepDescription, { marginBottom: 0 }]}>
                    {description}
                </Text>
            ) : null}
        </View>
    );

    const getStepData = () => {
        switch (currentStep) {
            case 1: return { title: "Basic Information & Media", description: "Start by providing the essential details and photos for your product." };
            case 2: return { title: "Product Details", description: "Add specifics like SKU, pricing, and SEO tags to boost discoverability." };
            case 3: return { title: "Variants & Stock", description: "Manage product variations (e.g., size, color) and track your inventory." };
            case 4: return { title: "Review & Submit", description: "Review your product details before submitting." };
            default: return { title: "", description: "" };
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContent}>
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
                                            setErrors(prev => { const n = { ...prev }; delete n.images; return n; });
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
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>Categories*</Text>
                                <Text style={{ fontSize: 11, color: theme.colors.textLight, fontFamily: 'Quicksand' }}>
                                    {selectedCategories.length}/3
                                </Text>
                            </View>
                            <View style={styles.categoryList}>
                                {categories.map((cat) => {
                                    const isSelected = selectedCategories.includes(cat);
                                    const isMaxed = selectedCategories.length >= 3;
                                    const isDisabled = isMaxed && !isSelected;
                                    return (
                                        <Pressable
                                            key={cat}
                                            style={[
                                                styles.categoryChip,
                                                isSelected && styles.categoryChipSelected,
                                                isDisabled && { opacity: 0.5, backgroundColor: theme.colors.subtle }
                                            ]}
                                            onPress={() => {
                                                if (isDisabled) {
                                                    setErrors(prev => ({ ...prev, categories: 'Maximum of 3 categories reached.' }));
                                                    return;
                                                }
                                                if (errors.categories) {
                                                    setErrors(prev => { const n = { ...prev }; delete n.categories; return n; });
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
                                                isSelected && styles.categoryTextSelected,
                                                isDisabled && { color: theme.colors.textLight }
                                            ]}>{cat}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            <View style={{ minHeight: 18, justifyContent: 'center' }}>
                                <Text style={[styles.errorText, { marginTop: 0, opacity: errors.categories ? 1 : 0 }]}>
                                    {errors.categories || ' '}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: theme.colors.textLight, paddingHorizontal: 2 }}>
                                Hint: You can select multiple categories (Up to 3).
                            </Text>
                        </View>

                    </View>
                );

            case 2:
                return (
                    <View style={styles.stepContent}>
                        {/* SKU */}
                        <View style={styles.field}>
                            <View style={styles.fieldLabelRow}>
                                <Text style={styles.fieldLabel}>SKU (Stock Keeping Unit)</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {!formData.sku && (
                                        <Text style={[styles.skuReqText, selectedCategories.length > 0 && styles.skuReqTextDone, { fontSize: 11 }]}>
                                            {selectedCategories.length > 0 ? '✓ Auto-generating...' : 'Select category to auto-gen'}
                                        </Text>
                                    )}
                                    {generatingSku && <ActivityIndicator size="small" color={theme.colors.primary} />}
                                </View>
                            </View>
                            <InfoBox
                                type="info"
                                message="A Stock Keeping Unit (SKU) is a unique code used to track your inventory. You can enter your own or let us auto-generate one based on your product category."
                                style={{ marginBottom: 12, marginTop: 8 }}
                                storageKey="product_form_sku_info"
                            />
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
                                            const response = await api.post('/products/generate-sku', {
                                                category: selectedCategories[0],
                                                variants: variants.map(v => v.name).filter(Boolean)
                                            });
                                            const data = response.data;
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

                        {/* ─── SEO & Discoverability ─────────────────────────── */}
                        <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <Search size={18} color={theme.colors.primary} />
                                <Text style={[styles.stepTitle, { marginBottom: 0, fontSize: 16 }]}>SEO & Discoverability</Text>
                            </View>
                            <Text style={[styles.stepDescription, { marginBottom: 16 }]}>
                                Improve how customers find your product in search results.
                            </Text>

                            {/* Tags */}
                            <View style={styles.field}>
                                <View style={styles.fieldLabelRow}>
                                    <Text style={styles.fieldLabel}>Tags</Text>
                                    <Text style={{ fontSize: 11, color: formData.tags.length >= 10 ? theme.colors.error : theme.colors.textLight, fontFamily: 'Quicksand' }}>
                                        {formData.tags.length}/10
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: formData.tags.length > 0 ? 8 : 0 }}>
                                    {formData.tags.map((tag, i) => (
                                        <Pressable
                                            key={i}
                                            onPress={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center', gap: 4,
                                                backgroundColor: theme.colors.primary + '15',
                                                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                                            }}
                                        >
                                            <Hash size={12} color={theme.colors.primary} />
                                            <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600', fontFamily: 'Quicksand' }}>{tag}</Text>
                                            <Text style={{ fontSize: 14, color: theme.colors.primary, marginLeft: 2, fontWeight: '700' }}>×</Text>
                                        </Pressable>
                                    ))}
                                </View>
                                <TextInput
                                    style={[styles.input, focusedField === 'tags' && styles.inputFocused, tagError && styles.inputError]}
                                    value={tagInput}
                                    onChangeText={(text) => {
                                        setTagInput(text);
                                        if (tagError) setTagError(null);
                                    }}
                                    placeholder={formData.tags.length >= 10 ? 'Maximum tags reached' : 'Type a tag and press Enter (e.g. handmade, crochet)'}
                                    placeholderTextColor={theme.colors.textLight}
                                    selectionColor={theme.colors.primary}
                                    editable={formData.tags.length < 10}
                                    maxLength={35}
                                    onFocus={() => {
                                        if (formData.tags.length < 10) {
                                            setFocusedField('tags');
                                            setShowTagSuggestions(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        setFocusedField(null);
                                        // Delay hiding suggestions so tap events fire
                                        setTimeout(() => setShowTagSuggestions(false), 200);
                                        if (tagInput.trim()) {
                                            const result = validateTag(tagInput, formData.tags);
                                            if (result.valid) {
                                                setFormData(prev => ({ ...prev, tags: [...prev.tags, result.cleaned] }));
                                                setTagInput('');
                                                setTagError(null);
                                            } else {
                                                setTagError(result.reason);
                                            }
                                        }
                                    }}
                                    onSubmitEditing={() => {
                                        if (tagInput.trim()) {
                                            const result = validateTag(tagInput, formData.tags);
                                            if (result.valid) {
                                                setFormData(prev => ({ ...prev, tags: [...prev.tags, result.cleaned] }));
                                                setTagInput('');
                                                setTagError(null);
                                            } else {
                                                setTagError(result.reason);
                                            }
                                        }
                                    }}
                                />
                                {/* Tag validation error */}
                                {!!tagError && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertTriangle size={12} color={theme.colors.error} />
                                        <Text style={[styles.errorText, { marginTop: 0 }]}>{tagError}</Text>
                                    </View>
                                )}

                                {/* Tag suggestions */}
                                {showTagSuggestions && formData.tags.length < 10 && (() => {
                                    // Build suggestion list from selected categories + universal
                                    const allSuggestions = new Set<string>();
                                    selectedCategories.forEach(cat => {
                                        (TAG_SUGGESTIONS[cat] || []).forEach(t => allSuggestions.add(t));
                                    });
                                    UNIVERSAL_TAGS.forEach(t => allSuggestions.add(t));
                                    // Filter out already-added tags
                                    const available = Array.from(allSuggestions).filter(t => !formData.tags.includes(t));
                                    // If input is typed, filter by prefix
                                    const filtered = tagInput.trim()
                                        ? available.filter(t => t.includes(tagInput.trim().toLowerCase()))
                                        : available;

                                    if (filtered.length === 0) return null;

                                    return (
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={{ fontSize: 11, color: theme.colors.textLight, fontFamily: 'Quicksand', marginBottom: 6 }}>
                                                💡 Suggested tags {tagInput.trim() ? 'matching your input' : 'for your categories'}:
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                {filtered.slice(0, 12).map((suggestion) => (
                                                    <Pressable
                                                        key={suggestion}
                                                        onPress={() => {
                                                            if (formData.tags.length < 10 && !formData.tags.includes(suggestion)) {
                                                                setFormData(prev => ({ ...prev, tags: [...prev.tags, suggestion] }));
                                                                setTagError(null);
                                                            }
                                                        }}
                                                        style={{
                                                            flexDirection: 'row', alignItems: 'center', gap: 3,
                                                            backgroundColor: theme.colors.background,
                                                            borderWidth: 1,
                                                            borderColor: theme.colors.border,
                                                            borderStyle: 'dashed',
                                                            paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 12, color: theme.colors.textLight, fontWeight: '500', fontFamily: 'Quicksand' }}>+ {suggestion}</Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })()}

                                {/* Helper text */}
                                <Text style={{ fontSize: 11, color: theme.colors.textLight, fontFamily: 'Quicksand', marginTop: 6, paddingHorizontal: 2 }}>
                                    Tags help customers find your product. Use lowercase words or short phrases (e.g. "handmade", "crochet bear").
                                </Text>
                            </View>


                            {/* Meta Title */}
                            <View style={styles.field}>
                                <View style={styles.fieldLabelRow}>
                                    <Text style={styles.fieldLabel}>SEO Title</Text>
                                    <Text style={{ fontSize: 11, color: (formData.metaTitle?.length || 0) > 70 ? theme.colors.error : theme.colors.textLight, fontFamily: 'Quicksand' }}>
                                        {formData.metaTitle?.length || 0}/70
                                    </Text>
                                </View>
                                <TextInput
                                    style={[styles.input, focusedField === 'metaTitle' && styles.inputFocused]}
                                    value={formData.metaTitle}
                                    onChangeText={(text: string) => handleChange('metaTitle', text)}
                                    placeholder="Custom title for search engines (defaults to product name)"
                                    placeholderTextColor={theme.colors.textLight}
                                    selectionColor={theme.colors.primary}
                                    maxLength={70}
                                    onFocus={() => setFocusedField('metaTitle')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>

                            {/* Meta Description */}
                            <View style={styles.field}>
                                <View style={styles.fieldLabelRow}>
                                    <Text style={styles.fieldLabel}>SEO Description</Text>
                                    <Text style={{ fontSize: 11, color: (formData.metaDescription?.length || 0) > 160 ? theme.colors.error : theme.colors.textLight, fontFamily: 'Quicksand' }}>
                                        {formData.metaDescription?.length || 0}/160
                                    </Text>
                                </View>
                                <TextInput
                                    style={[styles.input, styles.textArea, focusedField === 'metaDescription' && styles.inputFocused, { minHeight: 72 }]}
                                    value={formData.metaDescription}
                                    onChangeText={(text: string) => handleChange('metaDescription', text)}
                                    placeholder="Brief description for search engine results"
                                    placeholderTextColor={theme.colors.textLight}
                                    selectionColor={theme.colors.primary}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={160}
                                    onFocus={() => setFocusedField('metaDescription')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>
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
                        categories={selectedCategories}
                        productName={formData.name}
                    />
                );

            case 4:
                const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock, 10) || 0), 0);
                const scoreResult = optimizationScoreResult;
                const scoreColor = scoreResult.totalScore > 80 ? '#10B981' : scoreResult.totalScore > 50 ? '#F59E0B' : '#EF4444';
                const scoreLabel = scoreResult.totalScore > 80 ? 'Excellent' : scoreResult.totalScore > 50 ? 'Good' : 'Needs Work';

                return (
                    <View style={styles.stepContent}>
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
                            {!!formData.discountPercentage && parseFloat(formData.discountPercentage) > 0 && (
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
                                {!!formData.description && formData.description.length > 100 && (
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

                        {/* ─── Optimization Score ──────────────────────────── */}
                        {(() => {
                            const scoreResult = optimizationScoreResult;
                            const scoreColor = scoreResult.totalScore > 80 ? '#10B981' : scoreResult.totalScore > 50 ? '#F59E0B' : '#EF4444';
                            const scoreLabel = scoreResult.totalScore > 80 ? 'Excellent' : scoreResult.totalScore > 50 ? 'Good' : 'Needs Work';

                            return (
                                <View style={[styles.summaryCard, { marginTop: 16, borderColor: scoreColor + '40', borderWidth: 1.5 }]}>
                                    <Text style={styles.summaryTitle}>Listing Optimization Score</Text>

                                    {/* Score circle */}
                                    <View style={{ alignItems: 'center', marginVertical: 16 }}>
                                        <View style={{
                                            width: 100, height: 100, borderRadius: 50,
                                            borderWidth: 6, borderColor: scoreColor,
                                            justifyContent: 'center', alignItems: 'center',
                                            backgroundColor: scoreColor + '10',
                                        }}>
                                            <Text style={{ fontSize: 28, fontWeight: '800', color: scoreColor, fontFamily: 'Quicksand' }}>
                                                {scoreResult.totalScore}
                                            </Text>
                                            <Text style={{ fontSize: 10, fontWeight: '600', color: scoreColor, fontFamily: 'Quicksand', marginTop: -2 }}>
                                                / 100
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: scoreColor, marginTop: 8, fontFamily: 'Quicksand' }}>
                                            {scoreLabel}
                                        </Text>
                                    </View>

                                    {/* Category breakdown */}
                                    {scoreResult.categories.map((cat, catIdx) => {
                                        const catColor = cat.score === cat.maxScore ? '#10B981' : cat.score > 0 ? '#F59E0B' : '#EF4444';
                                        return (
                                            <View key={catIdx} style={{ marginBottom: catIdx < scoreResult.categories.length - 1 ? 12 : 0 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text, fontFamily: 'Quicksand' }}>
                                                        {cat.name}
                                                    </Text>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: catColor, fontFamily: 'Quicksand' }}>
                                                        {cat.score}/{cat.maxScore}
                                                    </Text>
                                                </View>
                                                {/* Progress bar */}
                                                <View style={{ height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginBottom: 6 }}>
                                                    <View style={{ height: 4, borderRadius: 2, backgroundColor: catColor, width: `${(cat.score / cat.maxScore) * 100}%` }} />
                                                </View>
                                                {/* Criteria checklist */}
                                                {cat.criteria.map((c, cIdx) => (
                                                    <View key={cIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingLeft: 4, marginBottom: 4 }}>
                                                        <Text style={{ fontSize: 12, color: c.passed ? '#10B981' : '#EF4444' }}>
                                                            {c.passed ? '✓' : '○'}
                                                        </Text>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={{ fontSize: 12, color: c.passed ? theme.colors.textLight : theme.colors.text, fontFamily: 'Quicksand', textDecorationLine: c.passed ? 'line-through' : 'none' }}>
                                                                {c.label}
                                                            </Text>
                                                            {!c.passed && (
                                                                <Text style={{ fontSize: 11, color: theme.colors.textLight, fontFamily: 'Quicksand', marginTop: 1 }}>
                                                                    💡 {c.tip}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })()}
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
                                {productStatus}
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
                    {/* Sticky Section Title */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 20, backgroundColor: theme.colors.background, zIndex: 10 }}>
                        {(() => {
                            const data = getStepData();
                            return <SectionTitleWithScore title={data.title} description={data.description} style={{ marginBottom: 12 }} />
                        })()}
                    </View>

                    {currentStep === 3 ? (
                        <View style={[styles.formArea, !mobile && showPreview && { flex: 1 }, { flex: 1 }]}>
                            {renderStepContent()}
                        </View>
                    ) : (
                        <ScrollView
                            style={[styles.formArea, !mobile && showPreview && { flex: 1 }]}
                            contentContainerStyle={[styles.formAreaContent, { paddingTop: 0 }]}
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
