import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
    Platform
} from 'react-native';
import { theme } from '@/constants/theme';
import { LocationPickerField } from './LocationPickerField';
import { LocationPickerModal, LocationSelection } from './LocationPickerModal';
import zipcodes from '@/constants/zipcodes.json';
import { useDraft } from '@/hooks/useDraft';

interface AddressFormData {
    label?: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string;
    region?: string;
    province?: string;
    city: string;
    barangay?: string;
    postalCode: string;
    country: string;
    isDefault?: boolean;
}

interface AddressFormProps {
    initialData?: Partial<AddressFormData>;
    onSave: (data: AddressFormData) => Promise<void>;
    onCancel?: () => void;
    showSaveCheckbox?: boolean;
    isSaving?: boolean;
    mode?: 'create' | 'edit';
    onOpenMap?: () => void;
    isFirstAddress?: boolean;
    renderHeader?: () => React.ReactNode;
    onLocationPickerChange?: (open: boolean) => void;
    mapUpdatedTimestamp?: number;
}

const LABEL_OPTIONS = ['Home', 'Work', 'Gift', 'Other'];

const VALIDATION_RULES = {
    fullName: { min: 2, max: 100, required: true },
    phone: { pattern: /^(\+63|0)[0-9]{9,10}$/, required: true },
    streetAddress: { min: 5, max: 200, required: true },
    aptSuite: { max: 50 },
    region: { required: true },
    city: { min: 2, max: 50, required: true },
    postalCode: { pattern: /^\d{3,4}$/, required: true },
};

export const AddressForm: React.FC<AddressFormProps> = ({
    initialData = {},
    onSave,
    onCancel,
    showSaveCheckbox = false,
    isSaving = false,
    mode = 'create',
    onOpenMap,
    isFirstAddress = false,
    renderHeader,
    onLocationPickerChange,
    mapUpdatedTimestamp = 0,
}) => {
    const [form, setForm] = useState<AddressFormData>({
        label: initialData.label || '',
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        streetAddress: initialData.streetAddress || '',
        aptSuite: initialData.aptSuite || '',
        region: initialData.region || '',
        province: initialData.province || '',
        city: initialData.city || '',
        barangay: initialData.barangay || '',
        postalCode: initialData.postalCode || '',
        country: initialData.country || 'Philippines',
        isDefault: initialData.isDefault ?? isFirstAddress, // Default to true if first
    });

    const [showLocationPicker, setShowLocationPicker] = useState(false);

    const openLocationPicker = () => { setShowLocationPicker(true); onLocationPickerChange?.(true); };
    const closeLocationPicker = () => { setShowLocationPicker(false); onLocationPickerChange?.(false); };

    const [saveForFuture, setSaveForFuture] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

    const { clearDraft } = useDraft({
        key: 'address_form_draft',
        data: form,
        enabled: mode === 'create', // Only save drafts for new addresses
        onLoad: (draft) => {
            // Only load draft for fields that haven't been explicitly set by map/initialData
            setForm(prev => {
                const merged = { ...draft };
                Object.keys(prev).forEach(key => {
                    const k = key as keyof AddressFormData;
                    // If prev has a truthy value, keep it (prioritize map data over draft)
                    if (prev[k]) merged[k] = prev[k] as any;
                });
                return merged;
            });
        },
    });

    // UX: Sync isDefault based on saveForFuture and isFirstAddress
    React.useEffect(() => {
        if (!saveForFuture) {
            // If not saving, cannot be default
            setForm(prev => ({ ...prev, isDefault: false }));
        } else if (isFirstAddress) {
            // If first address and saving, MUST be default
            setForm(prev => ({ ...prev, isDefault: true }));
        }
    }, [saveForFuture, isFirstAddress]);

    const validateField = (field: keyof typeof VALIDATION_RULES, value: string): string | null => {
        const rules = VALIDATION_RULES[field];
        if (!rules) return null;

        if ('required' in rules && rules.required && !value.trim()) {
            return `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
        }

        if ('pattern' in rules && rules.pattern && value && !rules.pattern.test(value)) {
            if (field === 'phone') {
                return 'Phone must be valid PH format (09XX-XXX-XXXX)';
            }
            if (field === 'postalCode') {
                return 'Postal code must be 3-4 digits';
            }
            return 'Invalid format';
        }

        if (field === 'postalCode' && value && !(value in zipcodes)) {
            return 'Postal code does not exist';
        }

        if ('min' in rules && rules.min && value.length < rules.min) {
            return `Must be at least ${rules.min} characters`;
        }

        if ('max' in rules && rules.max && value.length > rules.max) {
            return `Must be at most ${rules.max} characters`;
        }

        return null;
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        (Object.keys(VALIDATION_RULES) as Array<keyof typeof VALIDATION_RULES>).forEach(field => {
            const error = validateField(field, form[field] || '');
            if (error) newErrors[field] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        // If showSaveCheckbox is true and user unchecked it,
        // the address won't be saved (handled by parent)
        await onSave({
            ...form,
            label: form.label || 'Home',
            // @ts-ignore - pass saveForFuture flag for checkout flow
            _saveForFuture: saveForFuture,
        });

        // Clear the draft once successfully saved
        clearDraft();
    };

    const handleChange = (field: keyof AddressFormData, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleLocationSelect = (location: LocationSelection) => {
        setForm(prev => ({
            ...prev,
            region: location.region,
            province: location.province,
            city: location.city,
            barangay: location.barangay,
        }));
        // Clear location-related errors
        setErrors(prev => {
            const next = { ...prev };
            delete next.region;
            delete next.city;
            return next;
        });
        closeLocationPicker();
    };

    // Update form when initialData changes
    React.useEffect(() => {
        if (initialData) {
            setForm(prev => ({
                ...prev,
                ...initialData,
                isDefault: initialData.isDefault ?? (isFirstAddress && saveForFuture)
            }));
        }
    }, [initialData, isFirstAddress, saveForFuture]);

    // Handle map update highlighting
    React.useEffect(() => {
        if (mapUpdatedTimestamp > 0) {
            const newHighlights: Record<string, boolean> = {};
            ['region', 'province', 'city', 'barangay', 'streetAddress', 'postalCode'].forEach(key => {
                if (form[key as keyof AddressFormData]) {
                    newHighlights[key] = true;
                }
            });
            // Also highlight the picker field specifically
            newHighlights['locationPicker'] = true;
            
            setHighlightedFields(newHighlights);
            const timer = setTimeout(() => setHighlightedFields({}), 2000);
            return () => clearTimeout(timer);
        }
    }, [mapUpdatedTimestamp]);

    if (showLocationPicker) {
        return (
            <LocationPickerModal
                visible={showLocationPicker}
                onClose={closeLocationPicker}
                onConfirm={handleLocationSelect}
                initialValue={{
                    region: form.region,
                    province: form.province,
                    city: form.city,
                    barangay: form.barangay
                }}
            />
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {renderHeader && renderHeader()}
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Address Label */}
                <View style={styles.labelSection}>
                    <Text style={styles.sectionTitle}>Address Label (optional)</Text>
                    <View style={styles.labelOptions}>
                    {LABEL_OPTIONS.map(label => (
                        <Pressable
                            key={label}
                            style={[
                                styles.labelPill,
                                form.label === label && styles.labelPillActive
                            ]}
                            onPress={() => handleChange('label', form.label === label ? '' : label)}
                        >
                            <Text style={[
                                styles.labelPillText,
                                form.label === label && styles.labelPillTextActive
                            ]}>
                                {label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Map Picker Button */}
            {
                onOpenMap && (
                    <Pressable style={styles.mapButton} onPress={onOpenMap}>
                        <Text style={styles.mapButtonText}>Pick Address on Map</Text>
                    </Pressable>
                )
            }

            {/* Full Name */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'fullName' && styles.inputFocused,
                        highlightedFields.fullName && styles.inputHighlighted,
                        errors.fullName && styles.inputError
                    ]}
                    value={form.fullName}
                    onChangeText={(text) => handleChange('fullName', text)}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    autoComplete="name"
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'phone' && styles.inputFocused,
                        highlightedFields.phone && styles.inputHighlighted,
                        errors.phone && styles.inputError
                    ]}
                    value={form.phone}
                    onChangeText={(text) => handleChange('phone', text.replace(/[^0-9+]/g, ''))}
                    placeholder="e.g. 09171234567"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Location Section */}
            {mode === 'edit' && form.region && form.province && form.city && form.barangay ? (
                /* Show individual location fields in edit mode */
                <View style={styles.locationFieldsContainer}>
                    <View style={styles.locationHeader}>
                        <Text style={styles.sectionTitle}>Location</Text>
                        <Pressable onPress={openLocationPicker} style={styles.changeLocationBtn}>
                            <Text style={styles.changeLocationText}>Change</Text>
                        </Pressable>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.flex1]}>
                            <Text style={styles.formLabel}>Region</Text>
                            <TextInput
                                style={[styles.input, highlightedFields.region && styles.inputHighlighted]}
                                value={form.region}
                                onChangeText={(text) => handleChange('region', text)}
                                placeholder="Region"
                                placeholderTextColor="rgba(0,0,0,0.35)"
                            />
                        </View>
                        <View style={[styles.formGroup, styles.flex1]}>
                            <Text style={styles.formLabel}>Province</Text>
                            <TextInput
                                style={[styles.input, highlightedFields.province && styles.inputHighlighted]}
                                value={form.province}
                                onChangeText={(text) => handleChange('province', text)}
                                placeholder="Province"
                                placeholderTextColor="rgba(0,0,0,0.35)"
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formGroup, styles.flex1]}>
                            <Text style={styles.formLabel}>City/Municipality</Text>
                            <TextInput
                                style={[styles.input, highlightedFields.city && styles.inputHighlighted]}
                                value={form.city}
                                onChangeText={(text) => handleChange('city', text)}
                                placeholder="City"
                                placeholderTextColor="rgba(0,0,0,0.35)"
                            />
                        </View>
                        <View style={[styles.formGroup, styles.flex1]}>
                            <Text style={styles.formLabel}>Barangay</Text>
                            <TextInput
                                style={[styles.input, highlightedFields.barangay && styles.inputHighlighted]}
                                value={form.barangay}
                                onChangeText={(text) => handleChange('barangay', text)}
                                placeholder="Barangay"
                                placeholderTextColor="rgba(0,0,0,0.35)"
                            />
                        </View>
                    </View>
                </View>
            ) : (
                /* Show picker field in create mode or when location not complete */
                <LocationPickerField
                    region={form.region}
                    province={form.province}
                    city={form.city}
                    barangay={form.barangay}
                    onPress={openLocationPicker}
                    error={errors.region || errors.city}
                    isHighlighted={highlightedFields.locationPicker}
                />
            )}

            {/* Street Address */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Street Address *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'streetAddress' && styles.inputFocused,
                        highlightedFields.streetAddress && styles.inputHighlighted,
                        errors.streetAddress && styles.inputError
                    ]}
                    value={form.streetAddress}
                    onChangeText={(text) => handleChange('streetAddress', text)}
                    placeholder="e.g. 123 Main Street, Barangay Sample"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    multiline
                    numberOfLines={2}
                    onFocus={() => setFocusedField('streetAddress')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.streetAddress && <Text style={styles.errorText}>{errors.streetAddress}</Text>}
            </View>

            {/* Apt/Suite */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Apt, Suite, Unit (optional)</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'aptSuite' && styles.inputFocused,
                        highlightedFields.aptSuite && styles.inputHighlighted
                    ]}
                    value={form.aptSuite}
                    onChangeText={(text) => handleChange('aptSuite', text)}
                    placeholder="e.g. Unit 4B"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    onFocus={() => setFocusedField('aptSuite')}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            {/* Postal Code and Country */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Postal Code *</Text>
                    <TextInput
                        style={[
                            styles.input,
                            focusedField === 'postalCode' && styles.inputFocused,
                            highlightedFields.postalCode && styles.inputHighlighted,
                            errors.postalCode && styles.inputError
                        ]}
                        value={form.postalCode}
                        onChangeText={(text) => handleChange('postalCode', text.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 1000"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        keyboardType="number-pad"
                        onFocus={() => setFocusedField('postalCode')}
                        onBlur={() => setFocusedField(null)}
                    />
                    {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
                </View>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Country</Text>
                    <TextInput
                        style={[styles.input, styles.disabledInput]}
                        value={form.country}
                        editable={false}
                    />
                </View>
            </View>

            {/* Set as Default */}
            <View style={styles.switchRow}>
                <View>
                    <Text style={styles.switchLabel}>Set as default address</Text>
                    {(isFirstAddress && saveForFuture) && (
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 }}>
                            Your first address is automatically set as default.
                        </Text>
                    )}
                </View>
                <Switch
                    value={(isFirstAddress && saveForFuture) ? true : form.isDefault}
                    onValueChange={(value) => handleChange('isDefault', value)}
                    disabled={isFirstAddress || !saveForFuture} // Locked if first OR not saving
                    trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                    thumbColor={((isFirstAddress && saveForFuture) ? true : form.isDefault) ? theme.colors.primary : theme.colors.surface}
                />
            </View>

            {/* Save for Future Orders (checkout flow only) */}
            {
                showSaveCheckbox && (
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Save this address for future orders</Text>
                        <Switch
                            value={saveForFuture}
                            onValueChange={setSaveForFuture}
                            trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                            thumbColor={saveForFuture ? theme.colors.primary : theme.colors.surface}
                        />
                    </View>
                )
            }

            {/* Actions */}
            <View style={styles.actions}>
                {onCancel && (
                    <Pressable style={styles.cancelButton} onPress={onCancel} disabled={isSaving}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                )}
                <Pressable
                    style={[styles.saveButton, isSaving && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {mode === 'edit' ? 'Update Address' : 'Save Address'}
                        </Text>
                    )}
                </Pressable>
            </View>
        </ScrollView >
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        fontFamily: theme.typography.fontFamily,
    },
    labelSection: {
        marginBottom: theme.spacing.md,
    },
    labelOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    labelPill: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.subtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    labelPillActive: {
        backgroundColor: theme.colors.primaryLight,
        borderColor: theme.colors.primary,
    },
    labelPillText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    labelPillTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: theme.spacing.md,
    },
    formLabel: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 6,
        fontFamily: theme.typography.fontFamily,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 12,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14,
        fontSize: 15,
        color: '#333',
        fontFamily: theme.typography.fontFamily,
        outlineStyle: 'none' as any,
    },
    inputFocused: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    inputHighlighted: {
        backgroundColor: 'rgba(179, 105, 121, 0.1)',
        borderColor: '#B36979',
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    disabledInput: {
        backgroundColor: theme.colors.subtle,
        color: theme.colors.textLight,
    },
    errorText: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.error,
        marginTop: 4,
        fontFamily: theme.typography.fontFamily,
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    flex1: {
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.subtle,
    },
    switchLabel: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.subtle,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    saveButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    saveButtonText: {
        fontSize: theme.typography.sizes.base,
        fontWeight: '600',
        color: theme.colors.primaryText,
        fontFamily: theme.typography.fontFamily,
    },
    disabledButton: {
        opacity: 0.6,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.subtle,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 8,
    },
    mapButtonText: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.primary,
        fontFamily: theme.typography.fontFamily,
    },
    locationFieldsContainer: {
        marginBottom: theme.spacing.md,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    changeLocationBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
    },
    changeLocationText: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: '600',
        color: theme.colors.primaryText,
        fontFamily: theme.typography.fontFamily,
    },
});

export default AddressForm;
