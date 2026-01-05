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

interface AddressFormData {
    label?: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    aptSuite?: string;
    city: string;
    stateProvince?: string;
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
}

const LABEL_OPTIONS = ['Home', 'Work', 'Gift', 'Other'];

const VALIDATION_RULES = {
    fullName: { min: 2, max: 100, required: true },
    phone: { pattern: /^(\+63|0)[0-9]{9,10}$/, required: true },
    streetAddress: { min: 5, max: 200, required: true },
    aptSuite: { max: 50 },
    city: { min: 2, max: 50, required: true },
    stateProvince: { max: 50 },
    postalCode: { pattern: /^\d{3,4}$/, required: true },
};

export const AddressForm: React.FC<AddressFormProps> = ({
    initialData = {},
    onSave,
    onCancel,
    showSaveCheckbox = false,
    isSaving = false,
    mode = 'create',
}) => {
    const [form, setForm] = useState<AddressFormData>({
        label: initialData.label || '',
        fullName: initialData.fullName || '',
        phone: initialData.phone || '',
        streetAddress: initialData.streetAddress || '',
        aptSuite: initialData.aptSuite || '',
        city: initialData.city || '',
        stateProvince: initialData.stateProvince || '',
        postalCode: initialData.postalCode || '',
        country: initialData.country || 'Philippines',
        isDefault: initialData.isDefault ?? true,
    });

    const [saveForFuture, setSaveForFuture] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

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
            // @ts-ignore - pass saveForFuture flag for checkout flow
            _saveForFuture: saveForFuture,
        });
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

    return (
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

            {/* Full Name */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'fullName' && styles.inputFocused,
                        errors.fullName && styles.inputError
                    ]}
                    value={form.fullName}
                    onChangeText={(text) => handleChange('fullName', text)}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor={theme.colors.textLight}
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
                        errors.phone && styles.inputError
                    ]}
                    value={form.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                    placeholder="e.g. 09171234567"
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Street Address */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Street Address *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'streetAddress' && styles.inputFocused,
                        errors.streetAddress && styles.inputError
                    ]}
                    value={form.streetAddress}
                    onChangeText={(text) => handleChange('streetAddress', text)}
                    placeholder="e.g. 123 Main Street, Barangay Sample"
                    placeholderTextColor={theme.colors.textLight}
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
                        focusedField === 'aptSuite' && styles.inputFocused
                    ]}
                    value={form.aptSuite}
                    onChangeText={(text) => handleChange('aptSuite', text)}
                    placeholder="e.g. Unit 4B"
                    placeholderTextColor={theme.colors.textLight}
                    onFocus={() => setFocusedField('aptSuite')}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            {/* City and State/Province */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>City *</Text>
                    <TextInput
                        style={[
                            styles.input,
                            focusedField === 'city' && styles.inputFocused,
                            errors.city && styles.inputError
                        ]}
                        value={form.city}
                        onChangeText={(text) => handleChange('city', text)}
                        placeholder="e.g. Manila"
                        placeholderTextColor={theme.colors.textLight}
                        onFocus={() => setFocusedField('city')}
                        onBlur={() => setFocusedField(null)}
                    />
                    {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                </View>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Province</Text>
                    <TextInput
                        style={[
                            styles.input,
                            focusedField === 'stateProvince' && styles.inputFocused
                        ]}
                        value={form.stateProvince}
                        onChangeText={(text) => handleChange('stateProvince', text)}
                        placeholder="e.g. NCR"
                        placeholderTextColor={theme.colors.textLight}
                        onFocus={() => setFocusedField('stateProvince')}
                        onBlur={() => setFocusedField(null)}
                    />
                </View>
            </View>

            {/* Postal Code and Country */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Postal Code *</Text>
                    <TextInput
                        style={[
                            styles.input,
                            focusedField === 'postalCode' && styles.inputFocused,
                            errors.postalCode && styles.inputError
                        ]}
                        value={form.postalCode}
                        onChangeText={(text) => handleChange('postalCode', text)}
                        placeholder="e.g. 1000"
                        placeholderTextColor={theme.colors.textLight}
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
                <Text style={styles.switchLabel}>Set as default address</Text>
                <Switch
                    value={form.isDefault}
                    onValueChange={(value) => handleChange('isDefault', value)}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                    thumbColor={form.isDefault ? theme.colors.primary : theme.colors.surface}
                />
            </View>

            {/* Save for Future Orders (checkout flow only) */}
            {showSaveCheckbox && (
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Save this address for future orders</Text>
                    <Switch
                        value={saveForFuture}
                        onValueChange={setSaveForFuture}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
                        thumbColor={saveForFuture ? theme.colors.primary : theme.colors.surface}
                    />
                </View>
            )}

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
        </ScrollView>
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
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 16,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14, // increased vertical padding
        fontSize: theme.typography.sizes.base,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.surface,
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
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg,
        marginBottom: 40,
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
});

export default AddressForm;
