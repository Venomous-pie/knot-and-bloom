import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface LocationPickerFieldProps {
    region?: string;
    province?: string;
    city?: string;
    barangay?: string;
    onPress: () => void;
    error?: string;
    isFocused?: boolean;
}

export const LocationPickerField: React.FC<LocationPickerFieldProps> = ({
    region, province, city, barangay, onPress, error, isFocused
}) => {
    const hasSelection = region || province || city || barangay;

    const getDisplayText = () => {
        if (!hasSelection) {
            return 'Region, Province, City, Barangay';
        }
        const parts = [region, province, city, barangay].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Location *</Text>
            <Pressable
                style={[
                    styles.field,
                    isFocused && styles.fieldFocused,
                    error && styles.fieldError
                ]}
                onPress={onPress}
            >
                <Text
                    style={[styles.text, !hasSelection && styles.placeholder]}
                    numberOfLines={2}
                >
                    {getDisplayText()}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textLight} />
            </Pressable>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 6,
        fontFamily: theme.typography.fontFamily,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FAFAFA',
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 12,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 14,
    },
    fieldFocused: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    fieldError: {
        borderColor: theme.colors.error,
    },
    text: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    placeholder: {
        color: theme.colors.textLight,
    },
    errorText: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.error,
        marginTop: 4,
        fontFamily: theme.typography.fontFamily,
    },
});

export default LocationPickerField;
