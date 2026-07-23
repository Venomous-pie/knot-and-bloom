import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface CartTableHeaderProps {
    allSelected: boolean;
    onToggleSelectAll: () => void;
}

export const CartTableHeader = ({ allSelected, onToggleSelectAll }: CartTableHeaderProps) => {
    const { width } = useWindowDimensions();
    if (width < 768) return null;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Product: 50% */}
                <View style={styles.productColumn}>
                    <Pressable style={styles.checkboxContainer} onPress={onToggleSelectAll}>
                        <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                            {allSelected && <Ionicons name="checkmark" size={10} color="white" />}
                        </View>
                    </Pressable>
                    <Text style={styles.headerText}>Product</Text>
                </View>
                {/* Unit Price: 12.5% */}
                <View style={{ width: '12.5%', alignItems: 'center' }}>
                    <Text style={styles.headerText}>Unit Price</Text>
                </View>
                {/* Quantity: 12.5% */}
                <View style={{ width: '12.5%', alignItems: 'center' }}>
                    <Text style={styles.headerText}>Quantity</Text>
                </View>
                {/* Total: 12.5% */}
                <View style={{ width: '12.5%', alignItems: 'center' }}>
                    <Text style={styles.headerText}>Total Price</Text>
                </View>
                {/* Actions: 12.5% */}
                <View style={{ width: '12.5%', alignItems: 'center' }}>
                    <Text style={styles.headerText}>Actions</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
        ...theme.shadows.sm,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    productColumn: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkboxContainer: {
        padding: 4,
    },
    checkbox: {
        width: 16,
        height: 16,
        borderRadius: 3,
        borderWidth: 2,
        borderColor: theme.colors.textLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#B36979',
        borderColor: '#B36979',
    },
    headerText: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
});
