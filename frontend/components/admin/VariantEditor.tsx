import { isMobile } from '@/constants/layout';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import ColorPickerModal from './ColorPickerModal';
import { uploadToImageKit } from '@/lib/imagekit';
import { toTitleCase } from '@/utils/textUtils';
import { Layers } from 'lucide-react-native';

interface BulkGenerateModalProps {
    visible: boolean;
    onClose: () => void;
    onGenerate: (colors: string[], sizes: string[]) => void;
    savedPalette: string[];
}

function BulkGenerateModal({ visible, onClose, onGenerate, savedPalette }: BulkGenerateModalProps) {
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

    const toggleColor = (color: string) => {
        if (selectedColors.includes(color)) {
            setSelectedColors(selectedColors.filter(c => c !== color));
        } else {
            setSelectedColors([...selectedColors, color]);
        }
    };

    const toggleSize = (size: string) => {
        if (selectedSizes.includes(size)) {
            setSelectedSizes(selectedSizes.filter(s => s !== size));
        } else {
            setSelectedSizes([...selectedSizes, size]);
        }
    };

    const handleGenerate = () => {
        onGenerate(selectedColors, selectedSizes);
        onClose();
        setSelectedColors([]);
        setSelectedSizes([]);
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill}>
            <Pressable style={styles.modalOverlay} onPress={onClose} />
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Bulk Generate Variants</Text>
                <Text style={styles.modalSubtitle}>Select colors and sizes to generate combinations.</Text>

                <ScrollView style={{ maxHeight: 400 }}>
                    <Text style={styles.sectionLabel}>Colors</Text>
                    <View style={styles.chipHelpers}>
                        <Pressable onPress={() => setSelectedColors(PRESET_COLORS.map(c => c.value))}><Text style={styles.helperLink}>Select All</Text></Pressable>
                        <Pressable onPress={() => setSelectedColors([])}><Text style={styles.helperLink}>Clear</Text></Pressable>
                    </View>
                    <View style={styles.colorGrid}>
                        {/* Palette */}
                        {savedPalette.map(color => (
                            <Pressable
                                key={color}
                                style={[styles.colorOption, selectedColors.includes(color) && styles.colorOptionSelected]}
                                onPress={() => toggleColor(color)}
                            >
                                <View style={[styles.colorCircle, { backgroundColor: color }]} />
                                {selectedColors.includes(color) && <View style={styles.checkMark} />}
                            </Pressable>
                        ))}
                        {/* Presets */}
                        {PRESET_COLORS.map(color => (
                            <Pressable
                                key={color.value}
                                style={[styles.colorOption, selectedColors.includes(color.value) && styles.colorOptionSelected]}
                                onPress={() => toggleColor(color.value)}
                            >
                                <View style={[styles.colorCircle, { backgroundColor: color.value }]} />
                                <Text style={styles.colorName}>{color.name}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>Sizes</Text>
                    <View style={styles.chipHelpers}>
                        <Pressable onPress={() => setSelectedSizes(PRESET_SIZES)}><Text style={styles.helperLink}>Select All</Text></Pressable>
                        <Pressable onPress={() => setSelectedSizes([])}><Text style={styles.helperLink}>Clear</Text></Pressable>
                    </View>
                    <View style={styles.sizeGrid}>
                        {PRESET_SIZES.map(size => (
                            <Pressable
                                key={size}
                                style={[styles.sizeOption, selectedSizes.includes(size) && styles.sizeOptionSelected]}
                                onPress={() => toggleSize(size)}
                            >
                                <Text style={[styles.sizeText, selectedSizes.includes(size) && styles.sizeTextSelected]}>{size}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>

                <View style={styles.modalActions}>
                    <Pressable style={styles.modalCancel} onPress={onClose}>
                        <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.modalGenerate, (selectedColors.length === 0 && selectedSizes.length === 0) && styles.disabledBtn]}
                        onPress={handleGenerate}
                        disabled={selectedColors.length === 0 && selectedSizes.length === 0}
                    >
                        <Sparkles size={16} color="white" />
                        <Text style={styles.modalGenerateText}>Generate {selectedColors.length * selectedSizes.length || (selectedColors.length + selectedSizes.length)} Variants</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

export interface VariantData {
    uid?: number;
    name: string;
    stock: string;
    sku: string;
    price: string;
    discountPercentage: string;
    image: string;
    color?: string;
    customColor?: string;
    size?: string;
}

interface VariantEditorProps {
    variants: VariantData[];
    onVariantsChange: (variants: VariantData[]) => void;
    baseSku: string;
    basePrice: string;
    baseDiscount: string;
    onGenerateVariantSku: (index: number) => Promise<void>;
    onExpandedChange?: (index: number | null) => void;
}

const PRESET_COLORS = [
    { name: 'Red', value: '#E53935' },
    { name: 'Pink', value: '#EC407A' },
    { name: 'Purple', value: '#AB47BC' },
    { name: 'Blue', value: '#42A5F5' },
    { name: 'Teal', value: '#26A69A' },
    { name: 'Green', value: '#66BB6A' },
    { name: 'Yellow', value: '#FFEE58' },
    { name: 'Orange', value: '#FFA726' },
    { name: 'Brown', value: '#8D6E63' },
    { name: 'Black', value: '#424242' },
    { name: 'White', value: '#FAFAFA' },
    { name: 'Gray', value: '#9E9E9E' },
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

// Mini image picker for variants
function VariantImagePicker({
    imageUri,
    onImageChange
}: {
    imageUri: string;
    onImageChange: (uri: string) => void;
}) {
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setUploading(true);
            try {
                const uploaded = await uploadToImageKit({
                    uri: result.assets[0].uri,
                    name: `variant_${Date.now()}.jpg`,
                });
                onImageChange(uploaded.url);
            } catch (error) {
                console.error('Variant image upload failed:', error);
                // Fallback to local URI
                onImageChange(result.assets[0].uri);
            } finally {
                setUploading(false);
            }
        }
    };

    const removeImage = () => {
        onImageChange('');
    };

    if (uploading) {
        return (
            <View style={variantImageStyles.container}>
                <ActivityIndicator size="small" color="#B36979" />
                <Text style={variantImageStyles.uploadingText}>Uploading...</Text>
            </View>
        );
    }

    if (imageUri) {
        return (
            <View style={variantImageStyles.previewContainer}>
                <Image source={{ uri: imageUri }} style={variantImageStyles.preview} />
                <Pressable style={variantImageStyles.removeButton} onPress={removeImage}>
                    <Trash2 size={14} color="#fff" />
                </Pressable>
            </View>
        );
    }

    return (
        <Pressable style={variantImageStyles.addButton} onPress={pickImage}>
            <ImagePlus size={20} color="#B36979" />
            <Text style={variantImageStyles.addText}>Add Image</Text>
        </Pressable>
    );
}

const variantImageStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    uploadingText: {
        fontSize: 13,
        color: '#888',
    },
    previewContainer: {
        position: 'relative',
        width: 80,
        height: 80,
    },
    preview: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E53935',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FCF0F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8D5D9',
        borderStyle: 'dashed',
    },
    addText: {
        fontSize: 13,
        color: '#B36979',
        fontWeight: '500',
    },
});


export default function VariantEditor({
    variants,
    onVariantsChange,
    baseSku,
    basePrice,
    baseDiscount,
    onGenerateVariantSku,
    onExpandedChange,
}: VariantEditorProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [generatingSkuIndex, setGeneratingSkuIndex] = useState<number | null>(null);
    const [errors, setErrors] = useState<Record<string, string | null>>({});

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
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [pickingVariantIndex, setPickingVariantIndex] = useState<number | null>(null);
    const [savedPalette, setSavedPalette] = useState<string[]>([]);

    const getFieldKey = (index: number, field: string) => `${index}-${field}`;

    const addVariant = () => {
        const newVariant: VariantData = {
            name: '',
            stock: '0',
            sku: '',
            price: '',
            discountPercentage: '',
            image: '',
            color: '',
            size: ''
        };
        onVariantsChange([...variants, newVariant]);
        setExpandedIndex(variants.length);
    };

    const removeVariant = (index: number) => {
        const newVariants = [...variants];
        newVariants.splice(index, 1);
        onVariantsChange(newVariants);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const updateVariant = (index: number, field: keyof VariantData, value: string) => {
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

    const openColorPicker = (index: number) => {
        setPickingVariantIndex(index);
        setColorPickerVisible(true);
    };

    const handleColorSelect = (color: string) => {
        if (pickingVariantIndex !== null) {
            updateVariant(pickingVariantIndex, 'color', color);
        }
        setColorPickerVisible(false);
    };

    const addToPalette = (color: string) => {
        if (!savedPalette.includes(color)) {
            const newPalette = [...savedPalette, color];
            setSavedPalette(newPalette);
            AsyncStorage.setItem('variantColorPalette', JSON.stringify(newPalette));
        }
    };

    const removeFromPalette = (color: string) => {
        const newPalette = savedPalette.filter(c => c !== color);
        setSavedPalette(newPalette);
        AsyncStorage.setItem('variantColorPalette', JSON.stringify(newPalette));
    };

    const handleBulkGenerate = (selectedColors: string[], selectedSizes: string[]) => {
        const newVariants: VariantData[] = [];

        // If only colors selected
        if (selectedSizes.length === 0 && selectedColors.length > 0) {
            selectedColors.forEach(color => {
                const colorName = PRESET_COLORS.find(c => c.value === color)?.name || 'Custom';
                newVariants.push({
                    name: `${colorName}`,
                    stock: '0',
                    sku: '',
                    price: '',
                    discountPercentage: '',
                    image: '',
                    color: color,
                    size: ''
                });
            });
        }
        // If only sizes selected
        else if (selectedColors.length === 0 && selectedSizes.length > 0) {
            selectedSizes.forEach(size => {
                newVariants.push({
                    name: `${size}`,
                    stock: '0',
                    sku: '',
                    price: '',
                    discountPercentage: '',
                    image: '',
                    color: '',
                    size: size
                });
            });
        }
        // If both selected (combinations)
        else {
            selectedColors.forEach(color => {
                const colorName = PRESET_COLORS.find(c => c.value === color)?.name || 'Custom';
                selectedSizes.forEach(size => {
                    newVariants.push({
                        name: `${colorName} - ${size}`,
                        stock: '0',
                        sku: '',
                        price: '',
                        discountPercentage: '',
                        image: '',
                        color: color,
                        size: size
                    });
                });
            });
        }

        // Append to existing, removing default empty one if it exists and is untouched
        let currentVariants = [...variants];
        if (currentVariants.length === 1 && currentVariants[0].name === 'Default' && currentVariants[0].stock === '0') {
            currentVariants = [];
        }

        onVariantsChange([...currentVariants, ...newVariants]);
    };

    React.useEffect(() => {
        AsyncStorage.getItem('variantColorPalette').then(stored => {
            if (stored) setSavedPalette(JSON.parse(stored));
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Product Variants</Text>
                    <Text style={styles.subtitle}>
                        {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={styles.outlineButton} onPress={() => setBulkModalVisible(true)}>
                        <Layers size={16} color="#B36979" />
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
                                    variant.color ? { backgroundColor: variant.color } : {}
                                ]} />
                                <View>
                                    <Text style={styles.variantName}>
                                        {variant.name || `Variant ${index + 1}`}
                                    </Text>
                                    <Text style={styles.variantMeta}>
                                        Stock: {variant.stock || '0'} •
                                        {variant.price ? ` ₱${variant.price}` : ` Inherits ₱${basePrice}`}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.cardHeaderRight}>
                                {variants.length > 1 && (
                                    <Pressable
                                        style={styles.deleteButton}
                                        onPress={() => removeVariant(index)}
                                    >
                                        <Trash2 size={16} color="#E53935" />
                                    </Pressable>
                                )}
                                {expandedIndex === index ? (
                                    <ChevronUp size={20} color="#888" />
                                ) : (
                                    <ChevronDown size={20} color="#888" />
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
                                        <TextInput
                                            style={[styles.input, focusedField === getFieldKey(index, 'name') && styles.inputFocused]}
                                            value={variant.name}
                                            onChangeText={(text) => updateVariant(index, 'name', text)}
                                            placeholder="e.g. Small Red, Blue XL"
                                            placeholderTextColor="#999"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'name'))}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                if (variant.name) {
                                                    updateVariant(index, 'name', toTitleCase(variant.name));
                                                }
                                            }}
                                        />
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 2 }]}>
                                        <View style={styles.fieldLabelRow}>
                                            <Text style={styles.fieldLabel}>SKU</Text>
                                            <Pressable
                                                onPress={() => handleGenerateSku(index)}
                                                disabled={generatingSkuIndex === index || !baseSku}
                                            >
                                                {generatingSkuIndex === index ? (
                                                    <ActivityIndicator size="small" color="#B36979" />
                                                ) : (
                                                    <View style={styles.autoGenButton}>
                                                        <Sparkles size={12} color="#B36979" />
                                                        <Text style={styles.autoGenText}>Auto</Text>
                                                    </View>
                                                )}
                                            </Pressable>
                                        </View>
                                        <TextInput
                                            style={[styles.input, focusedField === getFieldKey(index, 'sku') && styles.inputFocused]}
                                            value={variant.sku}
                                            onChangeText={(text) => updateVariant(index, 'sku', text)}
                                            placeholder="Auto-generated"
                                            placeholderTextColor="#999"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'sku'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                </View>

                                {/* Stock & Price Row */}
                                <View style={mobile ? styles.fieldColumn : styles.fieldRow}>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Stock *</Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                focusedField === getFieldKey(index, 'stock') && styles.inputFocused,
                                                errors[getFieldKey(index, 'stock')] ? styles.inputError : null
                                            ]}
                                            value={variant.stock}
                                            onChangeText={(text) => handleNumericInput(index, 'stock', text, false)}
                                            placeholder="0"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'stock'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        {errors[getFieldKey(index, 'stock')] && (
                                            <Text style={styles.errorText}>{errors[getFieldKey(index, 'stock')]}</Text>
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
                                            placeholderTextColor="#999"
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
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'discount'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                        {errors[getFieldKey(index, 'discountPercentage')] && (
                                            <Text style={styles.errorText}>{errors[getFieldKey(index, 'discountPercentage')]}</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Color Picker Section */}
                                <View style={styles.field}>
                                    <View style={styles.labelRow}>
                                        <Text style={styles.fieldLabel}>Color (Optional)</Text>
                                        {savedPalette.length > 0 && (
                                            <Text style={styles.paletteLabel}>My Palette</Text>
                                        )}
                                    </View>

                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.colorPicker}
                                    >
                                        {/* Saved Palette */}
                                        {savedPalette.map((color) => (
                                            <Pressable
                                                key={color}
                                                style={[
                                                    styles.colorSwatch,
                                                    { backgroundColor: color },
                                                    variant.color === color && styles.colorSwatchSelected,
                                                ]}
                                                onPress={() => updateVariant(index, 'color',
                                                    variant.color === color ? '' : color
                                                )}
                                                onLongPress={() => removeFromPalette(color)}
                                            />
                                        ))}

                                        {savedPalette.length > 0 && <View style={styles.dividerVertical} />}

                                        {/* Preset Colors */}
                                        {PRESET_COLORS.map((color) => (
                                            <Pressable
                                                key={color.value}
                                                style={[
                                                    styles.colorSwatch,
                                                    { backgroundColor: color.value },
                                                    variant.color === color.value && styles.colorSwatchSelected,
                                                    color.value === '#FAFAFA' && styles.colorSwatchLight,
                                                ]}
                                                onPress={() => updateVariant(index, 'color',
                                                    variant.color === color.value ? '' : color.value
                                                )}
                                            />
                                        ))}

                                        {/* Add Custom Color Button */}
                                        <Pressable
                                            style={[
                                                styles.colorSwatch,
                                                styles.customColorSwatch,
                                                // Check if current color is not in presets or palette (custom)
                                                !PRESET_COLORS.some(c => c.value === variant.color) &&
                                                    !savedPalette.includes(variant.color || '') &&
                                                    variant.color ? styles.colorSwatchSelected : null
                                            ]}
                                            onPress={() => openColorPicker(index)}
                                        >
                                            <Plus size={16} color="#666" />
                                        </Pressable>
                                    </ScrollView>

                                    {/* Show Selected Custom Color Info if not in list */}
                                    {variant.color && !PRESET_COLORS.some(c => c.value === variant.color) && !savedPalette.includes(variant.color) && (
                                        <View style={styles.customColorInputRow}>
                                            <View style={[styles.customColorPreview, { backgroundColor: variant.color }]} />
                                            <Text style={styles.selectedColorText}>{variant.color}</Text>
                                            <Pressable onPress={() => openColorPicker(index)}>
                                                <Text style={styles.editColorText}>Edit</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>

                                {/* Size Selector */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>Size (Optional)</Text>
                                    <View style={styles.sizePicker}>
                                        {PRESET_SIZES.map((size) => (
                                            <Pressable
                                                key={size}
                                                style={[
                                                    styles.sizeChip,
                                                    variant.size === size && styles.sizeChipSelected,
                                                ]}
                                                onPress={() => updateVariant(index, 'size',
                                                    variant.size === size ? '' : size
                                                )}
                                            >
                                                <Text style={[
                                                    styles.sizeChipText,
                                                    variant.size === size && styles.sizeChipTextSelected,
                                                ]}>{size}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Variant Image Upload */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>Variant Image</Text>
                                    <VariantImagePicker
                                        imageUri={variant.image}
                                        onImageChange={(uri) => updateVariant(index, 'image', uri)}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            <Text style={styles.helperText}>
                💡 Leave price empty to inherit from base price. Stock is required for each variant.
            </Text>

            <ColorPickerModal
                visible={colorPickerVisible}
                onClose={() => setColorPickerVisible(false)}
                onSelect={handleColorSelect}
                onSaveToPalette={addToPalette}
                initialColor={pickingVariantIndex !== null ? variants[pickingVariantIndex]?.color || '#B36979' : '#B36979'}
            />

            <BulkGenerateModal
                visible={bulkModalVisible}
                onClose={() => setBulkModalVisible(false)}
                onGenerate={handleBulkGenerate}
                savedPalette={savedPalette}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 13,
        color: '#888',
        fontFamily: 'Quicksand',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#B36979',
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
        maxHeight: 500,
    },
    variantCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden',
    },
    variantCardExpanded: {
        borderColor: '#B36979',
        borderWidth: 2,
        borderLeftWidth: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#fafafa',
    },
    cardHeaderExpanded: {
        backgroundColor: '#FDF2F4',
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
        backgroundColor: '#ddd',
    },
    variantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    variantMeta: {
        fontSize: 12,
        color: '#888',
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
        padding: 14,
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
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
        color: '#666',
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
        color: '#B36979',
        fontWeight: '600',
    },
    input: {
        height: 44,
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: '#FAFAFA',
        color: '#333',
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        fontSize: 11,
        color: '#EF4444',
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
        borderColor: '#333',
        transform: [{ scale: 1.1 }],
    },
    colorSwatchLight: {
        borderWidth: 1,
        borderColor: '#ddd',
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
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sizeChipSelected: {
        backgroundColor: '#E8D5D9',
        borderColor: '#B36979',
    },
    sizeChipText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    sizeChipTextSelected: {
        color: '#B36979',
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
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    outlineButtonText: {
        color: '#B36979',
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
        position: 'absolute',
        top: '10%',
        left: '5%',
        right: '5%',
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
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#111827',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
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
        color: '#B36979',
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
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    colorOptionSelected: {
        borderColor: '#B36979',
        backgroundColor: '#FFF1F2',
    },
    colorCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    colorName: {
        fontSize: 12,
        color: '#374151',
    },
    checkMark: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#B36979',
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
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    sizeOptionSelected: {
        borderColor: '#B36979',
        backgroundColor: '#FFF1F2',
    },
    sizeText: {
        fontSize: 13,
        color: '#374151',
    },
    sizeTextSelected: {
        color: '#B36979',
        fontWeight: 'bold',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    modalCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalCancelText: {
        color: '#6B7280',
        fontWeight: '600',
    },
    modalGenerate: {
        backgroundColor: '#B36979',
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
        backgroundColor: '#E5E7EB',
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        fontFamily: 'Quicksand',
    },
    customColorSwatch: {
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    customColorText: {
        fontSize: 18,
        color: '#666',
        fontWeight: '300',
    },
    customColorInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f9f9f9',
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
        borderColor: '#eee',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    paletteLabel: {
        fontSize: 11,
        color: '#B36979',
        fontWeight: '600',
    },
    dividerVertical: {
        width: 1,
        height: 24,
        backgroundColor: '#eee',
        marginHorizontal: 4,
    },
    selectedColorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'monospace',
        color: '#333',
    },
    editColorText: {
        fontSize: 13,
        color: '#B36979',
        fontWeight: '500',
    },
});
