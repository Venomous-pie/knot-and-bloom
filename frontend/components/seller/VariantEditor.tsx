import { isMobile } from '@/constants/layout';
import { theme } from '@/constants/theme';
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2, ImagePlus } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
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
import { toTitleCase } from '@/utils/textUtils';
import { Layers } from 'lucide-react-native';

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
            animationType="fade"
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
    image: string;
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

// Variant image picker matching Step 1 ImageUploader UI/UX
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
            const asset = result.assets[0];
            if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
                Alert.alert('File Too Large', 'Image exceeds the 5MB limit.');
                return;
            }
            setUploading(true);
            try {
                const uploaded = await uploadToImageKit({
                    uri: asset.uri,
                    name: `variant_${Date.now()}.jpg`,
                });
                onImageChange(uploaded.url);
            } catch (error) {
                console.error('Variant image upload failed:', error);
                onImageChange(asset.uri);
            } finally {
                setUploading(false);
            }
        }
    };

    const removeImage = () => onImageChange('');

    // Empty + loading state
    if (!imageUri) {
        return (
            <Pressable
                style={variantImageStyles.dropzone}
                onPress={!uploading ? pickImage : undefined}
            >
                {uploading ? (
                    <>
                        <ActivityIndicator size="large" color="#B36979" />
                        <Text style={variantImageStyles.dropzoneTitle}>Uploading...</Text>
                    </>
                ) : (
                    <>
                        <View style={variantImageStyles.iconContainer}>
                            <ImagePlus size={28} color="#B36979" />
                        </View>
                        <Text style={variantImageStyles.dropzoneTitle}>Add Variant Image</Text>
                        <Text style={variantImageStyles.dropzoneSubtitle}>Tap to browse · PNG, JPG (Max 5MB)</Text>
                    </>
                )}
            </Pressable>
        );
    }

    // Populated state — thumbnail with action overlay
    return (
        <View style={variantImageStyles.previewWrapper}>
            <Image source={{ uri: imageUri }} style={variantImageStyles.preview} resizeMode="cover" />
            {uploading && (
                <View style={variantImageStyles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="white" />
                </View>
            )}
            <View style={variantImageStyles.actionsOverlay}>
                <Pressable style={variantImageStyles.actionButton} onPress={pickImage}>
                    <ImagePlus size={13} color="#333" />
                </Pressable>
                <Pressable style={[variantImageStyles.actionButton, variantImageStyles.deleteActionButton]} onPress={removeImage}>
                    <Trash2 size={13} color="#B36979" />
                </Pressable>
            </View>
        </View>
    );
}

const variantImageStyles = StyleSheet.create({
    dropzone: {
        borderWidth: 2,
        borderColor: '#E8D5D9',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCFAFA',
        gap: 8,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F7EEF0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    dropzoneTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B36979',
    },
    dropzoneSubtitle: {
        fontSize: 12,
        color: '#AAA',
        textAlign: 'center',
    },
    previewWrapper: {
        width: 120,
        height: 120,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        position: 'relative',
        borderWidth: 2,
        borderColor: '#B36979',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsOverlay: {
        position: 'absolute',
        bottom: 6,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    actionButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
    },
    deleteActionButton: {
        backgroundColor: '#fff',
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
    const [bulkModalVisible, setBulkModalVisible] = useState(false);

    const getFieldKey = (index: number, field: string) => `${index}-${field}`;

    const addVariant = () => {
        const newVariant: VariantData = {
            name: '',
            stock: '0',
            sku: '',
            price: '',
            discountPercentage: '',
            image: ''
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

    const handleBulkGenerate = (combinations: string[]) => {
        const newVariants: VariantData[] = combinations.map(name => ({
            name,
            stock: '0',
            sku: '',
            price: '',
            discountPercentage: '',
            image: ''
        }));

        // Append to existing, removing default empty one if it exists and is untouched
        let currentVariants = [...variants];
        if (currentVariants.length === 1 && currentVariants[0].name === 'Default' && currentVariants[0].stock === '0') {
            currentVariants = [];
        }

        onVariantsChange([...currentVariants, ...newVariants]);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.fieldLabel}>Product Variants</Text>
                    <Text style={styles.subtitle}>
                        {variants.length} variant{variants.length !== 1 ? 's' : ''}
                    </Text>
                </View>
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
                                <View style={styles.variantIndicator} />
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
                                        <TextInput
                                            style={[styles.input, focusedField === getFieldKey(index, 'name') && styles.inputFocused]}
                                            value={variant.name}
                                            onChangeText={(text) => updateVariant(index, 'name', text)}
                                            placeholder="e.g. Small Red, Blue XL"
                                            placeholderTextColor={theme.colors.textLight}
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
                                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                                ) : (
                                                    <View style={styles.autoGenButton}>
                                                        <Sparkles size={12} color={theme.colors.primary} />
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
                                            placeholderTextColor={theme.colors.textLight}
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
                                            placeholderTextColor={theme.colors.textLight}
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
        maxHeight: 500,
    },
    variantCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    variantCardExpanded: {
        borderColor: theme.colors.primary,
        borderWidth: 2,
        borderLeftWidth: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: theme.colors.backgroundAlt,
    },
    cardHeaderExpanded: {
        backgroundColor: theme.colors.primaryLight,
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
        padding: 14,
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
});
