import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import type { Order } from '@/types/order';

const P = '#B36979', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5';

export interface AcceptFormData {
    estimatedCompletionDate: string;
    message: string;
}

interface Props {
    visible: boolean;
    order: Order | null;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (data: AcceptFormData) => void;
}

export default function AcceptOrderModal({ visible, order, submitting, onClose, onSubmit }: Props) {
    const [estimatedDate, setEstimatedDate] = useState('');
    const [message, setMessage] = useState('');

    // Reset defaults when modal opens
    useEffect(() => {
        if (visible) {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            setEstimatedDate(d.toISOString().split('T')[0]);
            setMessage('');
        }
    }, [visible]);

    return (
        <Modal animationType="none" transparent visible={visible} onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.content}>
                    <Text style={s.title}>Accept Order #{order?.uid}</Text>
                    <Text style={s.subTitle}>When will this be ready?</Text>

                    <Text style={s.label}>Target Date (MM/DD/YYYY)</Text>

                    {Platform.OS === 'web' ? (
                        React.createElement('input', {
                            type: 'date',
                            style: {
                                border: `2px solid ${BORDER}`,
                                borderRadius: 12,
                                padding: 14,
                                fontSize: 15,
                                backgroundColor: BG,
                                color: TEXT,
                                fontFamily: 'Quicksand',
                                marginBottom: 24,
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box'
                            },
                            value: estimatedDate,
                            onChange: (e: any) => setEstimatedDate(e.target.value),
                            min: new Date().toISOString().split('T')[0] // prevent past dates
                        })
                    ) : (
                        <TextInput
                            style={s.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#AAA"
                            value={estimatedDate}
                            onChangeText={(text) => {
                                // strict YYYY-MM-DD enforcement for native
                                let val = text.replace(/[^0-9]/g, '');
                                if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4);
                                if (val.length > 7) val = val.slice(0, 7) + '-' + val.slice(7);
                                setEstimatedDate(val.slice(0, 10));
                            }}
                            keyboardType="number-pad"
                            maxLength={10}
                        />
                    )}

                    <Text style={s.label}>Message (Optional)</Text>
                    <TextInput
                        style={[s.input, { flex: 1, textAlignVertical: 'top' }]}
                        placeholder="e.g. Thanks! Will start soon."
                        placeholderTextColor="#AAA"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                    />

                    <View style={s.modalButtons}>
                        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                            <Text style={s.btnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.confirmBtn, submitting && { opacity: 0.7 }]}
                            onPress={() => onSubmit({ estimatedCompletionDate: estimatedDate, message })}
                            disabled={submitting}
                        >
                            <Text style={s.confirmBtnText}>Confirm & Accept</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    content: { backgroundColor: CARD, width: '90%', maxWidth: 500, aspectRatio: 1, padding: 32, borderRadius: 24, elevation: 5 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: TEXT, fontFamily: 'Quicksand' },
    subTitle: { fontSize: 14, color: SUB, marginBottom: 20, fontFamily: 'Quicksand' },
    label: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 8 },
    input: { borderWidth: 2, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: BG, color: TEXT, fontFamily: 'Quicksand', marginBottom: 24, outlineStyle: 'none' as any },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 32 },
    cancelBtn: { padding: 14, borderRadius: 12, justifyContent: 'center' },
    confirmBtn: { backgroundColor: P, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, justifyContent: 'center' },
    btnText: { color: SUB, fontWeight: '700', fontFamily: 'Quicksand' },
    confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15, fontFamily: 'Quicksand' },
});
