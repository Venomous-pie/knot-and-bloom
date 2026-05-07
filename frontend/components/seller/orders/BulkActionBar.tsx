import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEXT = '#1A1A2E';
const BG = '#F4F4F8';
const BORDER = '#F0F0F5';

interface Props {
    selectedCount: number;
    onPrint: () => void;
    onShip: () => void;
    onCancel: () => void;
}

export default function BulkActionBar({ selectedCount, onPrint, onShip, onCancel }: Props) {
    if (selectedCount === 0) return null;

    return (
        <View style={s.bulkBar}>
            <Text style={s.bulkCount}>{selectedCount} Selected</Text>
            <View style={s.bulkActions}>
                <TouchableOpacity style={s.bulkBtn} onPress={onPrint}>
                    <Ionicons name="print" size={20} color="#374151" />
                    <Text style={s.bulkBtnText}>Print</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.bulkBtn} onPress={onShip}>
                    <Ionicons name="cube" size={20} color="#10B981" />
                    <Text style={[s.bulkBtnText, { color: '#10B981' }]}>Ship</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.bulkBtn} onPress={onCancel}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    bulkBar: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
        borderWidth: 1,
        borderColor: BORDER,
    },
    bulkCount: {
        fontWeight: 'bold',
        fontSize: 16,
        color: TEXT,
        marginLeft: 8,
        fontFamily: 'Quicksand'
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 12,
    },
    bulkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: BG,
        borderRadius: 12,
    },
    bulkBtnText: {
        fontWeight: '600',
        fontSize: 13,
        color: TEXT,
        fontFamily: 'Quicksand'
    }
});
