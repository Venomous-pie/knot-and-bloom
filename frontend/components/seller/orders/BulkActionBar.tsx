import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Printer, Package, Play, X } from 'lucide-react-native';

const TEXT = '#1A1A2E';
const BG = '#F4F4F8';
const BORDER = '#F0F0F5';
const P = '#B36979';
const GREEN = '#10B981';

interface Props {
    selectedCount: number;
    onStartProduction: () => void;
    onShip: () => void;
    onPrint: () => void;
    onCancel: () => void;
}

export default function BulkActionBar({ selectedCount, onStartProduction, onShip, onPrint, onCancel }: Props) {
    if (selectedCount === 0) return null;

    return (
        <View style={s.bulkBar}>
            <Text style={s.bulkCount}>{selectedCount} Selected</Text>
            <View style={s.bulkActions}>
                <TouchableOpacity style={s.bulkBtn} onPress={onStartProduction}>
                    <Play size={16} color={P} />
                    <Text style={[s.bulkBtnText, { color: P }]}>Start Production</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.bulkBtn} onPress={onShip}>
                    <Package size={16} color={GREEN} />
                    <Text style={[s.bulkBtnText, { color: GREEN }]}>Mark Shipped</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.bulkBtn} onPress={onPrint}>
                    <Printer size={16} color="#374151" />
                    <Text style={s.bulkBtnText}>Print Labels</Text>
                </TouchableOpacity>
                <View style={s.divider} />
                <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
                    <X size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    bulkBar: {
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: [{ translateX: '-50%' as any }],
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 24,
    },
    bulkCount: {
        fontWeight: '700',
        fontSize: 14,
        color: TEXT,
        fontFamily: 'Quicksand'
    },
    bulkActions: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontWeight: '700',
        fontSize: 13,
        color: '#374151',
        fontFamily: 'Quicksand'
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: BORDER,
        marginHorizontal: 4,
    },
    cancelBtn: {
        padding: 4,
    }
});
