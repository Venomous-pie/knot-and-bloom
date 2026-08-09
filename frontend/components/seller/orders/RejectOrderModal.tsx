import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Order } from '@/types/order';
import Button from '@/components/ui/Button';

const P = '#B36979', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5', RED = '#EF4444';

export interface RejectFormData {
    rejectionReason: string;
}

interface Props {
    visible: boolean;
    order: Order | null;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (data: RejectFormData) => void;
}

export default function RejectOrderModal({ visible, order, submitting, onClose, onSubmit }: Props) {
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (visible) setRejectionReason('');
    }, [visible]);

    return (
        <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.content}>
                    <Text style={[s.title, { color: RED }]}>Reject Order #{order?.uid}</Text>

                    <Text style={s.label}>Reason for rejection *</Text>
                    <TextInput
                        style={[s.input, { height: 120, textAlignVertical: 'top' }]}
                        placeholder="e.g. Out of stock, Cannot fulfill timeline..."
                        placeholderTextColor="#AAA"
                        multiline
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                    />

                    <View style={s.modalButtons}>
                        <Button 
                            title="Cancel" 
                            variant="outline" 
                            onPress={onClose} 
                            style={{ borderWidth: 0 }}
                            textStyle={{ color: SUB }}
                        />
                        <Button 
                            title="Reject Order" 
                            variant="danger" 
                            loading={submitting} 
                            onPress={() => onSubmit({ rejectionReason })} 
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    content: { backgroundColor: CARD, width: '90%', maxWidth: 500, padding: 32, borderRadius: 24, elevation: 5 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: TEXT, fontFamily: 'Quicksand' },
    label: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 8 },
    input: { borderWidth: 2, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: BG, color: TEXT, fontFamily: 'Quicksand', marginBottom: 24, outlineStyle: 'none' as any },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
});
