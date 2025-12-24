import { isMobile } from '@/constants/layout';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ColorPickerModal from './ColorPickerModal';

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
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Color Picker State
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [pickingVariantIndex, setPickingVariantIndex] = useState<number | null>(null);
    const [savedPalette, setSavedPalette] = useState<string[]>([]);
    const PALETTE_KEY = 'seller_custom_palette';

    // Load palette on mount
    React.useEffect(() => {
        loadPalette();
    }, []);

    const loadPalette = async () => {
        try {
            const stored = await AsyncStorage.getItem(PALETTE_KEY);
            if (stored) {
                setSavedPalette(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load palette', e);
        }
    };

    const addToPalette = async (color: string) => {
        if (savedPalette.includes(color)) return;
        const newPalette = [...savedPalette, color];
        setSavedPalette(newPalette);
        await AsyncStorage.setItem(PALETTE_KEY, JSON.stringify(newPalette));
    };

    const removeFromPalette = async (color: string) => {
        const newPalette = savedPalette.filter(c => c !== color);
        setSavedPalette(newPalette);
        await AsyncStorage.setItem(PALETTE_KEY, JSON.stringify(newPalette));
    };

    const openColorPicker = (index: number) => {
        setPickingVariantIndex(index);
        setColorPickerVisible(true);
    };

    const handleColorSelect = (color: string) => {
        if (pickingVariantIndex !== null) {
            updateVariant(pickingVariantIndex, 'color', color);
            // If it was a custom color, ensure customColor is cleared or handled
            // Actually, we use 'color' field directly now for the hex value
            updateVariant(pickingVariantIndex, 'customColor', color); // Keep customColor in sync if used
        }
    };

    const addVariant = () => {
        onVariantsChange([
            ...variants,
            { name: '', stock: '0', sku: '', price: '', discountPercentage: '', image: '' }
        ]);
        setExpandedIndex(variants.length);
    };

    const removeVariant = (index: number) => {
        if (variants.length <= 1) return;
        const newVariants = [...variants];
        newVariants.splice(index, 1);
        onVariantsChange(newVariants);
        if (expandedIndex === index) {
            setExpandedIndex(null);
        } else if (expandedIndex !== null && expandedIndex > index) {
            setExpandedIndex(expandedIndex - 1);
        }
    };

    const updateVariant = (index: number, field: keyof VariantData, value: string) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        onVariantsChange(updated);
    };

    const handleGenerateSku = async (index: number) => {
        setGeneratingSkuIndex(index);
        try {
            await onGenerateVariantSku(index);
        } finally {
            setGeneratingSkuIndex(null);
        }
    };

    const toggleExpand = (index: number) => {
        const newIndex = expandedIndex === index ? null : index;
        setExpandedIndex(newIndex);
        onExpandedChange?.(newIndex);
    };

    const getFieldKey = (index: number, field: string) => `${index}-${field}`;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Product Variants</Text>
                    <Text style={styles.subtitle}>
                        {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <Pressable style={styles.addButton} onPress={addVariant}>
                    <Plus size={16} color="white" />
                    <Text style={styles.addButtonText}>Add Variant</Text>
                </Pressable>
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
                                            onBlur={() => setFocusedField(null)}
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
                                            style={[styles.input, focusedField === getFieldKey(index, 'stock') && styles.inputFocused]}
                                            value={variant.stock}
                                            onChangeText={(text) => updateVariant(index, 'stock', text)}
                                            placeholder="0"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'stock'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Price (₱)</Text>
                                        <TextInput
                                            style={[styles.input, focusedField === getFieldKey(index, 'price') && styles.inputFocused]}
                                            value={variant.price}
                                            onChangeText={(text) => updateVariant(index, 'price', text)}
                                            placeholder={basePrice ? `Inherits ${basePrice}` : 'Optional'}
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'price'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
                                    </View>
                                    <View style={[styles.field, !mobile && { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>Discount %</Text>
                                        <TextInput
                                            style={[styles.input, focusedField === getFieldKey(index, 'discount') && styles.inputFocused]}
                                            value={variant.discountPercentage}
                                            onChangeText={(text) => updateVariant(index, 'discountPercentage', text)}
                                            placeholder={baseDiscount ? `Inherits ${baseDiscount}%` : '0'}
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            onFocus={() => setFocusedField(getFieldKey(index, 'discount'))}
                                            onBlur={() => setFocusedField(null)}
                                        />
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

                                {/* Image URL */}
                                <View style={styles.field}>
                                    <Text style={styles.fieldLabel}>Variant Image URL</Text>
                                    <TextInput
                                        style={[styles.input, focusedField === getFieldKey(index, 'image') && styles.inputFocused]}
                                        value={variant.image}
                                        onChangeText={(text) => updateVariant(index, 'image', text)}
                                        placeholder="https://example.com/variant-image.jpg"
                                        placeholderTextColor="#999"
                                        autoCapitalize="none"
                                        onFocus={() => setFocusedField(getFieldKey(index, 'image'))}
                                        onBlur={() => setFocusedField(null)}
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
