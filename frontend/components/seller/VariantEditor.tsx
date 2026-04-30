import { isMobile } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, ImagePlus, Lock } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '@/lib/imagekit';
import { Layers } from 'lucide-react-native';
import { useDialog } from '@/contexts/DialogContext';
import ImageUploader from './ImageUploader';
import { PRESET_MATERIALS } from '@/constants/materials';

interface CustomOptionsModalProps {
    visible: boolean;
    onClose: () => void;
    onGenerate: (combinations: string[]) => void;
}

function CustomOptionsModal({ visible, onClose, onGenerate }: CustomOptionsModalProps) {
    const [option1Name, setOption1Name] = useState('Variation');
    const [option1Values, setOption1Values] = useState('');

    const [option2Name, setOption2Name] = useState('');
    const [option2Values, setOption2Values] = useState('');

    const handleGenerate = () => {
        const vals1 = option1Values.split(',').map(s => s.trim()).filter(Boolean);
        const vals2 = option2Values.split(',').map(s => s.trim()).filter(Boolean);

        const combinations: string[] = [];

        if (vals1.length > 0 && vals2.length > 0) {
            vals1.forEach(v1 => {
                vals2.forEach(v2 => {
                    combinations.push(`${v1} - ${v2}`);
                });
            });
        } else if (vals1.length > 0) {
            vals1.forEach(v1 => combinations.push(v1));
        } else if (vals2.length > 0) {
            vals2.forEach(v2 => combinations.push(v2));
        }

        if (combinations.length > 0) {
            onGenerate(combinations);
        }

        onClose();
        setOption1Name('Variation');
        setOption1Values('');
        setOption2Name('');
        setOption2Values('');
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Pressable style={styles.modalOverlay} onPress={onClose} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Bulk Generate Variants</Text>
                    <Text style={styles.modalSubtitle}>Create combinations from custom options.</Text>

                    <ScrollView style={{ maxHeight: 400 }}>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>Option 1 Name</Text>
                            <TextInput
                                style={styles.input}
                                value={option1Name}
                                onChangeText={setOption1Name}
                                placeholder="e.g. Flower Count"
                                placeholderTextColor={theme.colors.textLight}
                            />
                            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Option 1 Values (comma separated)</Text>
                            <TextInput
                                style={styles.input}
                                value={option1Values}
                                onChangeText={setOption1Values}
                                placeholder="e.g. 3 Stems, 6 Stems, 1 Dozen"
                                placeholderTextColor={theme.colors.textLight}
                            />
                        </View>

                        <View style={[styles.field, { marginTop: 16 }]}>
                            <Text style={styles.fieldLabel}>Option 2 Name (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={option2Name}
                                onChangeText={setOption2Name}
                                placeholder="e.g. Wrap Type"
                                placeholderTextColor={theme.colors.textLight}
                            />
                            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Option 2 Values (comma separated)</Text>
                            <TextInput
                                style={styles.input}
                                value={option2Values}
                                onChangeText={setOption2Values}
                                placeholder="e.g. Standard, Premium"
                                placeholderTextColor={theme.colors.textLight}
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <Pressable style={styles.modalCancel} onPress={onClose}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.modalGenerate, (option1Values.trim() === '' && option2Values.trim() === '') && styles.disabledBtn]}
                            onPress={handleGenerate}
                            disabled={option1Values.trim() === '' && option2Values.trim() === ''}
                        >
                            <Sparkles size={16} color="white" />
                            <Text style={styles.modalGenerateText}>Generate</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export interface VariantData {
    uid?: number;
    name: string;
    stock: string;
    sku: string;
    price: string;
    discountPercentage: string;
    images: string[];
    materials?: string;
}

interface VariantEditorProps {
    variants: VariantData[];
    onVariantsChange: (variants: VariantData[]) => void;
    baseSku: string;
    basePrice: string;
    baseDiscount: string;
    onGenerateVariantSku: (index: number) => Promise<void>;
    onExpandedChange?: (index: number | null) => void;
    productImages?: { uri: string; isUrl?: boolean }[];
    variantErrors?: Record<string, string>;
}

// VariantImagePicker replaced by ImageUploader in compact mode


export default function VariantEditor({
    variants,
    onVariantsChange,
    baseSku,
    basePrice,
    baseDiscount,
    onGenerateVariantSku,
    onExpandedChange,
    productImages = [],
    variantErrors = {},
}: VariantEditorProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const { confirm } = useDialog();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [generatingSkuIndex, setGeneratingSkuIndex] = useState<number | null>(null);
    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [materialInputs, setMaterialInputs] = useState<Record<number, string>>({});

    const validateNumeric = (value: string, allowDecimal = false): boolean => {
        if (!value) return true; // Allow empty for typing
        const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
        return regex.test(value);
    };

    const handleNumericInput = (index: number, field: keyof VariantData, value: string, allowDecimal = false, max?: number) => {
        if (validateNumeric(value, allowDecimal)) {
            if (max !== undefined && Number(value) > max) {
                setErrors(prev => ({ ...prev, [getFieldKey(index, field as string)]: `Max ${max}` }));
                // Still update value but show error? Or prevent?
                // Let's prevent values > max
                // updateVariant(index, field, value); 
                return;
            }
            // Clear error if valid
            setErrors(prev => ({ ...prev, [getFieldKey(index, field as string)]: null }));
            updateVariant(index, field, value);
        } else {
            setErrors(prev => ({ ...prev, [getFieldKey(index, field as string)]: allowDecimal ? "Numbers only" : "Integers only" }));
        }
    };

    // ----------------------------------------------------------------------
    // Missing Logic Restoration
    // ----------------------------------------------------------------------
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);

    // Auto-expand the first variant card that has errors
    useEffect(() => {
        const errorKeys = Object.keys(variantErrors).filter(k => k.startsWith('variant-'));
        if (errorKeys.length > 0) {
            const firstErrorIndex = Math.min(
                ...errorKeys.map(k => parseInt(k.split('-')[1], 10)).filter(n => !isNaN(n))
            );
            setExpandedIndex(firstErrorIndex);
            if (onExpandedChange) onExpandedChange(firstErrorIndex);
        }
    }, [variantErrors]);

    const getFieldKey = (index: number, field: string) => `${index}-${field}`;

    const addVariant = () => {
        const newVariant: VariantData = {
            name: '',
            stock: '0',
            sku: '',
            price: '',
            discountPercentage: '',
            images: [] as string[]
        };
        onVariantsChange([...variants, newVariant]);
        setExpandedIndex(variants.length);
    };

    const executeRemoveVariant = (index: number) => {
        const newVariants = [...variants];
        newVariants.splice(index, 1);
        onVariantsChange(newVariants);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const removeVariant = async (index: number) => {
        const confirmed = await confirm({
            title: "Delete Variant?",
            message: "Are you sure you want to delete this variant?",
            confirmText: "Delete",
            cancelText: "Cancel",
            isDestructive: true
        });

        if (confirmed) {
            executeRemoveVariant(index);
        }
    };

    const updateVariant = (index: number, field: keyof VariantData, value: any) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        onVariantsChange(newVariants);
    };

    const toggleExpand = (index: number) => {
        const newIndex = expandedIndex === index ? null : index;
        setExpandedIndex(newIndex);
        if (onExpandedChange) onExpandedChange(newIndex);
    };

    const handleGenerateSku = async (index: number) => {
        setGeneratingSkuIndex(index);
        await onGenerateVariantSku(index);
        setGeneratingSkuIndex(null);
    };

    const handleBulkGenerate = (combinations: string[]) => {
        const newVariants: VariantData[] = combinations.map(name => ({
            name,
            stock: '0',
            sku: '',
            price: '',
            discountPercentage: '',
            images: []
        }));

        // Always keep the Default (index 0) as the main product variant
        onVariantsChange([variants[0], ...newVariants]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.subtitle}>
                    {variants.length} variant{variants.length !== 1 ? 's' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={styles.outlineButton} onPress={() => setBulkModalVisible(true)}>
                        <Layers size={16} color={theme.colors.primary} />
                        <Text style={styles.outlineButtonText}>Bulk Generate</Text>
                    </Pressable>
                    <Pressable style={styles.addButton} onPress={addVariant}>
                        <Plus size={16} color="white" />
                        <Text style={styles.addButtonText}>Add Variant</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.variantsList}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {variants.map((variant, index) => (
                    <View key={index} style={[
                        styles.variantCard,
                        expandedIndex === index && styles.variantCardExpanded
                    ]}>
                        {/* Card Header - Always Visible */}
                        <Pressable
                            style={[
                                styles.cardHeader,
                                expandedIndex === index && styles.cardHeaderExpanded
                            ]}
                            onPress={() => toggleExpand(index)}
                        >
                            <View style={styles.cardHeaderLeft}>
                                <View style={[
                                    styles.variantIndicator,
                                    index === 0 && { backgroundColor: theme.colors.primary }
                                ]} />
                                <View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.variantName}>
                                            {variant.name || `Variant ${index + 1}`}
                                        </Text>
                                        {index === 0 && (
                                            <View style={styles.mainBadge}>
                                                <Lock size={9} color={theme.colors.primary} />
                                                <Text style={styles.mainBadgeText}>Main Product</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.variantMeta}>
                                        Stock: {variant.stock || '0'} •
                                        {variant.price ? ` ₱${variant.price}` : ` Inherits ₱${basePrice}`}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.cardHeaderRight}>
                                {variants.length > 1 && index > 0 && (
                                    <Pressable
                                        style={styles.deleteButton}
                                        onPress={() => removeVariant(index)}
                                    >
                                        <Trash2 size={16} color={theme.colors.error} />
                                    </Pressable>
                                )}
                                {expandedIndex === index ? (
                                    <ChevronUp size={20} color={theme.colors.textLight} />
                                ) : (
                                    <ChevronDown size={20} color={theme.colors.textLight} />
                                )}
                            </View>
                        </Pressable>

                        {/* Expanded Content */}
                        {expandedIndex === index && (
                            <View style={styles.cardContent}>
                                {/* Name & SKU Row */}
                                <View style={mobile ? styles.fieldColumn : styles.fieldRow}>
                                    <View style={[styles.field, !mobile && { flex: 2 }]}>
                                        <Text style={styles.fieldLabel}>Variant Name *</Text>
                                        {index === 0 ? (
                                            <View style={styles.lockedInput}>
                                                <Lock size={13} color={theme.colors.textLight} />
                                                <Text style={styles.lockedInputText}>Default</Text>
                                                <Text style={styles.lockedInputHint}>(locked)</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        focusedField === getFieldKey(index, 'name') && styles.inputFocused,
                                                        variantErrors[`variant-${index}-name`] && styles.inputError,
                                                    ]}
                                                    value={variant.name}
                                                    onChangeText={(text) => updateVariant(index, 'name', text)}
                                                    placeholder="e.g. Small Red, Blue XL"
                                                    placeholderTextColor={theme.colors.textLight}
                                                    onFocus={() => setFocusedField(getFieldKey(index, 'name'))}
                                                    onBlur={() => {
                                                        setFocusedField(null);
                                                        if (variant.name) {
                                                            updateVariant(index, 'name', variant.name.replace(/\b\w/g, c => c.toUpperCase()));
                                                        }
                                                    }}
                                                />
                                                {variantErrors[`variant-${index}-name`] && (
                                                    <Text style={styles.errorText}>{variantErrors[`variant-${index}-name`]}</Text>
                                                )}
                                            </>
                                        )}
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 2 }]}>
                                        <View style={styles.fieldLabelRow}>
                                            <Text style={styles.fieldLabel}>SKU</Text>
                                            {generatingSkuIndex === index && (
                                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                            )}
                                        </View>
                                        {index === 0 ? (
                                            <View style={styles.lockedInput}>
                                                <Lock size={13} color={theme.colors.textLight} />
                                                <Text style={styles.lockedInputText}>{baseSku || '—'}</Text>
                                                <Text style={styles.lockedInputHint}>(inherited)</Text>
                                            </View>
                                        ) : (
                                            <TextInput
                                                style={[styles.input, focusedField === getFieldKey(index, 'sku') && styles.inputFocused]}
                                                value={variant.sku}
                                                onChangeText={(text) => updateVariant(index, 'sku', text)}
                                                placeholder="Auto-generated"
                                                placeholderTextColor={theme.colors.textLight}
                                                onFocus={() => setFocusedField(getFieldKey(index, 'sku'))}
                                                onBlur={() => {
                                                    setFocusedField(null);
                                                    if (!variant.sku.trim() && baseSku) {
                                                        handleGenerateSku(index);
                                                    }
                                                }}
                                            />
                                        )}
                                    </View>
                                </View>

                                {/* Materials Row */}
                                <View style={[styles.field, { marginTop: 12 }]}>
                                    <View style={{ gap: 2 }}>
                                        <Text style={styles.fieldLabel}>
                                            Specific Materials / Inclusions {index === 0 ? '*' : '(Optional)'}
                                        </Text>
                                        {index > 0 && (
                                            <Text style={{ fontSize: 12, color: theme.colors.textLight, fontStyle: 'italic' }}>
                                                If left empty, this variant will inherit the default materials.
                                            </Text>
                                        )}
                                    </View>
                                    
                                    {/* Selected Chips */}
                                    {(variant.materials || '').trim().length > 0 && (
                                        <View style={[styles.categoryList, { marginBottom: 8 }]}>
                                            {(variant.materials || '').split(',').map(s => s.trim()).filter(Boolean).map((mat, i) => (
                                                <View key={i} style={[styles.categoryChip, styles.categoryChipSelected, { paddingRight: 8 }]}>
                                                    <Text style={styles.categoryTextSelected}>{mat}</Text>
                                                    <Pressable
                                                        onPress={() => {
                                                            const updated = (variant.materials || '').split(',').map(s => s.trim()).filter(s => s && s !== mat).join(', ');
                                                            updateVariant(index, 'materials', updated);
                                                        }}
                                                        style={{ marginLeft: 6, backgroundColor: theme.colors.backgroundAlt, borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700', lineHeight: 14 }}>×</Text>
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={[
                                        styles.input, 
                                        focusedField === getFieldKey(index, 'materials') && styles.inputFocused, 
                                        variantErrors[`variant-${index}-materials`] && styles.inputError,
                                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }
                                    ]}>
                                        <TextInput
                                            style={{ flex: 1, paddingVertical: 12, outlineStyle: 'none' } as any}
                                            value={materialInputs[index] || ''}
                                            onChangeText={(text) => setMaterialInputs(prev => ({ ...prev, [index]: text }))}
                                            placeholder="Type and press Enter, or select below..."
                                            placeholderTextColor={theme.colors.textLight}
                                            onFocus={() => setFocusedField(getFieldKey(index, 'materials'))}
                                            onBlur={() => setTimeout(() => setFocusedField(null), 200)}
                                            onSubmitEditing={() => {
                                                const currentInput = (materialInputs[index] || '').trim();
                                                if (currentInput) {
                                                    const parts = (variant.materials || '').split(',').map(s => s.trim()).filter(s => s);
                                                    if (!parts.includes(currentInput)) {
                                                        parts.push(currentInput);
                                                        updateVariant(index, 'materials', parts.join(', '));
                                                    }
                                                    setMaterialInputs(prev => ({ ...prev, [index]: '' }));
                                                }
                                            }}
                                        />
                                        {(materialInputs[index] || '').trim().length > 0 && (
                                            <Pressable 
                                                style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 8 }}
                                                onPress={() => {
                                                    const currentInput = (materialInputs[index] || '').trim();
                                                    const parts = (variant.materials || '').split(',').map(s => s.trim()).filter(s => s);
                                                    if (!parts.includes(currentInput)) {
                                                        parts.push(currentInput);
                                                        updateVariant(index, 'materials', parts.join(', '));
                                                    }
                                                    setMaterialInputs(prev => ({ ...prev, [index]: '' }));
                                                }}
                                            >
                                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Add</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                    {variantErrors[`variant-${index}-materials`] && (
                                        <Text style={styles.errorText}>{variantErrors[`variant-${index}-materials`]}</Text>
                                    )}
                                    
                                    {/* Smart Suggestions */}
                                    {focusedField === getFieldKey(index, 'materials') && (
                                        <View style={styles.materialSuggestions}>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.materialChipsRow}
                                            >
                                                {PRESET_MATERIALS
                                                    .filter(m => {
                                                        const currentMaterials = (variant.materials || '').toLowerCase().split(',').map(s => s.trim());
                                                        const alreadyAdded = currentMaterials.includes(m.toLowerCase());
                                                        const currentInput = (materialInputs[index] || '').toLowerCase();
                                                        return !alreadyAdded && (currentInput === '' || m.toLowerCase().includes(currentInput));
                                                    })
                                                    .slice(0, 15)
                                                    .map((material) => (
                                                        <Pressable
                                                            key={material}
                                                            style={styles.materialChip}
                                                            onPress={() => {
                                                                const parts = (variant.materials || '').split(',').map(s => s.trim()).filter(s => s);
                                                                if (!parts.includes(material)) {
                                                                    parts.push(material);
                                                                    updateVariant(index, 'materials', parts.join(', '));
                                                                }
                                                                setMaterialInputs(prev => ({ ...prev, [index]: '' }));
                                                            }}
                                                        >
                                                            <Text style={styles.materialChipText}>+ {material}</Text>
                                                        </Pressable>
                                                    ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Stock & Price Row */}
                                <View style={[mobile ? styles.fieldColumn : styles.fieldRow, { marginTop: 12 }]}>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Stock *</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === getFieldKey(index, 'stock') && styles.inputFocused,
                                                (errors[getFieldKey(index, 'stock')] || variantErrors[`variant-${index}-stock`]) ? styles.inputError : null
                                            ]}
                                            value={variant.stock}
                                            onChangeText={(text) => handleNumericInput(index, 'stock', text, false)}
                                            placeholder="0"
                                            placeholderTextColor={theme.colors.textLight}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'stock'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        {(errors[getFieldKey(index, 'stock')] || variantErrors[`variant-${index}-stock`]) && (
                                            <Text style={styles.errorText}>
                                                {errors[getFieldKey(index, 'stock')] || variantErrors[`variant-${index}-stock`]}
                                            </Text>
                                        )}
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Price (₱)</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === getFieldKey(index, 'price') && styles.inputFocused,
                                                errors[getFieldKey(index, 'price')] ? styles.inputError : null
                                            ]}
                                            value={variant.price}
                                            onChangeText={(text) => handleNumericInput(index, 'price', text, true)}
                                            placeholder={basePrice ? `Inherits ${basePrice}` : 'Optional'}
                                            placeholderTextColor={theme.colors.textLight}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'price'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        {errors[getFieldKey(index, 'price')] && (
                                            <Text style={styles.errorText}>{errors[getFieldKey(index, 'price')]}</Text>
                                        )}
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Discount %</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === getFieldKey(index, 'discount') && styles.inputFocused,
                                                errors[getFieldKey(index, 'discountPercentage')] ? styles.inputError : null
                                            ]}
                                            value={variant.discountPercentage}
                                            onChangeText={(text) => handleNumericInput(index, 'discountPercentage', text, false, 100)}
                                            placeholder={baseDiscount ? `Inherits ${baseDiscount}%` : '0'}
                                            placeholderTextColor={theme.colors.textLight}
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'discount'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        {errors[getFieldKey(index, 'discountPercentage')] && (
                                            <Text style={styles.errorText}>{errors[getFieldKey(index, 'discountPercentage')]}</Text>
                                        )}
                                    </View>
                                </View>


                                {/* Product Images (Default variant only — inherited from Step 1) */}
                                {index === 0 && (
                                    <View style={styles.field}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <Text style={styles.fieldLabel}>Product Images</Text>
                                            <View style={styles.inheritedBadge}>
                                                <Text style={styles.inheritedBadgeText}>Inherited from Step 1</Text>
                                            </View>
                                        </View>
                                        {productImages.length > 0 ? (
                                            <View style={styles.inheritedImagesRow}>
                                                {productImages.map((img, i) => (
                                                    <Image
                                                        key={i}
                                                        source={{ uri: img.uri }}
                                                        style={[
                                                            styles.inheritedImage,
                                                            i === 0 && styles.inheritedImagePrimary
                                                        ]}
                                                    />
                                                ))}
                                            </View>
                                        ) : (
                                            <View style={styles.noImagesPlaceholder}>
                                                <Text style={styles.noImagesText}>No images uploaded yet — go to Step 1 to add product images.</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Variant Image Upload (non-Default variants only) */}
                                {index > 0 && (
                                    <View style={styles.field}>
                                        <Text style={[
                                            styles.fieldLabel,
                                            variantErrors[`variant-${index}-images`] && { color: theme.colors.error }
                                        ]}>
                                            Variant Images *
                                        </Text>
                                        <View style={variantErrors[`variant-${index}-images`] ? styles.imageErrorBorder : undefined}>
                                            <ImageUploader
                                                compact
                                                maxImages={3}
                                                images={variant.images ? variant.images.map(uri => ({ uri, isUrl: true })) : []}
                                                onImagesChange={(imgs) => updateVariant(index, 'images', imgs.map(img => img.uri))}
                                            />
                                        </View>
                                        {variantErrors[`variant-${index}-images`] && (
                                            <Text style={styles.errorText}>{variantErrors[`variant-${index}-images`]}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Text style={styles.helperText}>
                💡 Leave price empty to inherit from base price. Stock is required for each variant.
            </Text>

            <CustomOptionsModal
                visible={bulkModalVisible}
                onClose={() => setBulkModalVisible(false)}
                onGenerate={handleBulkGenerate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    variantsList: {
        flex: 1,
    },
    variantCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    variantCardExpanded: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: theme.colors.backgroundAlt,
    },
    cardHeaderExpanded: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    variantIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.colors.border,
    },
    mainBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
    },
    mainBadgeText: {
        fontSize: 10,
        color: theme.colors.primary,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
    lockedInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: 44,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: theme.colors.subtle,
        borderStyle: 'dashed',
    },
    lockedInputText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    lockedInputHint: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    inheritedBadge: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    inheritedBadgeText: {
        fontSize: 10,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    inheritedImagesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    inheritedImage: {
        width: 64,
        height: 64,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: 0.9,
    },
    inheritedImagePrimary: {
        width: 80,
        height: 80,
        borderColor: theme.colors.primary,
        borderWidth: 2,
        opacity: 1,
    },
    noImagesPlaceholder: {
        padding: 12,
        backgroundColor: theme.colors.subtle,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    noImagesText: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    imageErrorBorder: {
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderRadius: 12,
        padding: 4,
        backgroundColor: theme.colors.error + '05',
    },
    variantName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    variantMeta: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 2,
    },
    cardHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 6,
    },
    cardContent: {
        padding: 20,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: 12,
    },
    fieldColumn: {
        gap: 12,
    },
    field: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
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
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    input: {
        height: 44,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: theme.colors.backgroundAlt,
        color: theme.colors.text,
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: 'white',
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    errorText: {
        fontSize: 11,
        color: theme.colors.error,
        marginTop: 2,
    },
    colorPicker: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 4,
    },
    colorSwatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSwatchSelected: {
        borderColor: theme.colors.text,
        transform: [{ scale: 1.1 }],
    },
    colorSwatchLight: {
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    sizePicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sizeChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.subtle,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sizeChipSelected: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    sizeChipText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    sizeChipTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    outlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        backgroundColor: 'white',
    },
    outlineButtonText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },

    // Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    modalContent: {
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        zIndex: 20,
        maxHeight: '80%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        maxWidth: 1024,
        width: '50%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: theme.colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 12,
        marginBottom: 8,
    },
    chipHelpers: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    helperLink: {
        fontSize: 12,
        color: theme.colors.primary,
        textDecorationLine: 'underline',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    colorOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 6,
        paddingRight: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    colorOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    colorCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    colorName: {
        fontSize: 12,
        color: theme.colors.text,
    },
    checkMark: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    sizeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sizeOption: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: '#fff',
    },
    sizeOptionSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLight,
    },
    sizeText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    sizeTextSelected: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: 16,
    },
    modalCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalCancelText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    modalGenerate: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    modalGenerateText: {
        color: 'white',
        fontWeight: '600',
    },
    disabledBtn: {
        backgroundColor: theme.colors.border,
    },
    helperText: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    customColorSwatch: {
        backgroundColor: theme.colors.subtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    customColorText: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        fontWeight: '300',
    },
    customColorInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
    },
    customColorInput: {
        flex: 1,
        fontFamily: 'monospace',
    },
    customColorPreview: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paletteLabel: {
        fontSize: 11,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    dividerVertical: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.border,
        marginHorizontal: 4,
    },
    selectedColorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'monospace',
        color: theme.colors.text,
    },
    editColorText: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    categoryList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: theme.colors.backgroundAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    categoryChipSelected: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    categoryTextSelected: {
        fontSize: 13,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    materialSuggestions: {
        marginTop: 8,
        borderRadius: 10,
        backgroundColor: theme.colors.backgroundAlt,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: 8,
    },
    materialChipsRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 10,
    },
    materialChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    materialChipText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '500',
    },
});
