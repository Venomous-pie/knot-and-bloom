import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';
import { getStatusLabel, getStatusBgColor, getStatusColor } from '@/utils/orderStatus';

interface StatusBadgeProps {
    status: string;
    style?: StyleProp<ViewStyle>;
}

export default function StatusBadge({ status, style }: StatusBadgeProps) {
    return (
        <View style={[styles.badge, { backgroundColor: getStatusBgColor(status) }, style]}>
            <Text style={[styles.text, { color: getStatusColor(status) }]}>
                {getStatusLabel(status)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
});
