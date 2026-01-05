import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface AddressMapPickerProps {
    onLocationSelect: (address: any) => void;
    onClose: () => void;
    initialLocation?: { lat: number; lng: number };
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({ onClose }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pick Location</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                </Pressable>
            </View>

            <View style={styles.webFallback}>
                <Ionicons name="map-outline" size={64} color={theme.colors.textSecondary} style={{ marginBottom: 16 }} />
                <Text style={styles.msgTitle}>Map Not Available on Web</Text>
                <Text style={styles.msgText}>
                    The map picker is currently optimized for our mobile app.
                    Please enter your address manually below.
                </Text>

                <Pressable onPress={onClose} style={styles.closeAction}>
                    <Text style={styles.closeText}>Close & Enter Address</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    webFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    msgTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    msgText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 400,
        marginBottom: 32,
        lineHeight: 24,
    },
    closeAction: { // Renamed from confirmButton to avoid confusion
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    }
});
