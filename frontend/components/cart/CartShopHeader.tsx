import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface CartShopHeaderProps {
    sellerName: string;
    isSelected: boolean;
    onToggleSelect: () => void;
}

export const CartShopHeader = ({ sellerName, isSelected, onToggleSelect }: CartShopHeaderProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Pressable
                    style={styles.checkboxContainer}
                    onPress={onToggleSelect}
                    hitSlop={10}
                >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                </Pressable>

                <Ionicons name="storefront-outline" size={18} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={styles.sellerName}>{sellerName}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        marginTop: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
        // Make it slightly distinct from items
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    checkboxContainer: {
        paddingRight: theme.spacing.md,
        justifyContent: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.textLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    sellerName: {
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.text,
        marginRight: 4,
    }
});
