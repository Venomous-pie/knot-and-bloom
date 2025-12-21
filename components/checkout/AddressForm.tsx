import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';

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
                    style={[styles.input, errors.fullName && styles.inputError]}
                    value={form.fullName}
                    onChangeText={(text) => handleChange('fullName', text)}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor="#9ca3af"
                    autoComplete="name"
                />
                {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                    style={[styles.input, errors.phone && styles.inputError]}
                    value={form.phone}
                    onChangeText={(text) => handleChange('phone', text)}
                    placeholder="e.g. 09171234567"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Street Address */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Street Address *</Text>
                <TextInput
                    style={[styles.input, errors.streetAddress && styles.inputError]}
                    value={form.streetAddress}
                    onChangeText={(text) => handleChange('streetAddress', text)}
                    placeholder="e.g. 123 Main Street, Barangay Sample"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={2}
                />
                {errors.streetAddress && <Text style={styles.errorText}>{errors.streetAddress}</Text>}
            </View>

            {/* Apt/Suite */}
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Apt, Suite, Unit (optional)</Text>
                <TextInput
                    style={styles.input}
                    value={form.aptSuite}
                    onChangeText={(text) => handleChange('aptSuite', text)}
                    placeholder="e.g. Unit 4B"
                    placeholderTextColor="#9ca3af"
                />
            </View>

            {/* City and State/Province */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>City *</Text>
                    <TextInput
                        style={[styles.input, errors.city && styles.inputError]}
                        value={form.city}
                        onChangeText={(text) => handleChange('city', text)}
                        placeholder="e.g. Manila"
                        placeholderTextColor="#9ca3af"
                    />
                    {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                </View>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Province</Text>
                    <TextInput
                        style={styles.input}
                        value={form.stateProvince}
                        onChangeText={(text) => handleChange('stateProvince', text)}
                        placeholder="e.g. NCR"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>

            {/* Postal Code and Country */}
            <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                    <Text style={styles.formLabel}>Postal Code *</Text>
                    <TextInput
                        style={[styles.input, errors.postalCode && styles.inputError]}
                        value={form.postalCode}
                        onChangeText={(text) => handleChange('postalCode', text)}
                        placeholder="e.g. 1000"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
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
                    trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
                    thumbColor={form.isDefault ? '#7c3aed' : '#f4f3f4'}
                />
            </View>

            {/* Save for Future Orders (checkout flow only) */}
            {showSaveCheckbox && (
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Save this address for future orders</Text>
                    <Switch
                        value={saveForFuture}
                        onValueChange={setSaveForFuture}
                        trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
                        thumbColor={saveForFuture ? '#7c3aed' : '#f4f3f4'}
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
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    labelSection: {
        marginBottom: 16,
    },
    labelOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    labelPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    labelPillActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#7c3aed',
    },
    labelPillText: {
        fontSize: 14,
        color: '#6b7280',
    },
    labelPillTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#111827',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    disabledInput: {
        backgroundColor: '#f9fafb',
        color: '#9ca3af',
    },
    errorText: {
        fontSize: 12,
        color: '#ef4444',
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    flex1: {
        flex: 1,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    switchLabel: {
        fontSize: 14,
        color: '#374151',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
        marginBottom: 40,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },
    saveButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 8,
        backgroundColor: '#7c3aed',
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    disabledButton: {
        opacity: 0.6,
    },
});

export default AddressForm;
