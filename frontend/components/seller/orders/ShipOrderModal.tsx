import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Order } from '@/types/order';

const P = '#B36979', P_LIGHT = '#FDEEF1', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5', RED = '#EF4444';

export interface ShipFormData {
    shippingMethod: 'TRACKED' | 'UNTRACKED';
    trackingNumber: string | null;
    courierName: string;
    message: string;
    itemPhotoUri: string;
    packagePhotoUri: string;
    receiptPhotoUri: string | null;
}

interface Props {
    visible: boolean;
    order: Order | null;
    submitting: boolean;
    onClose: () => void;
    onSubmit: (data: ShipFormData) => void;
}

const COURIER_PATTERNS = [
    { name: 'J&T Express', regex: /^\d{12}$/ },
    { name: 'Flash Express', regex: /^P[0-9A-Z]{12}$/ },
    { name: 'Ninja Van', regex: /^(NVP|NVPH)\d{9,10}$/ },
    { name: 'GoGo Xpress', regex: /^([0-9A-Z]{4}-){2}[0-9A-Z]{4}(-[0-9A-Z]{2})?$|^[0-9A-Z]{12}$/ },
    { name: 'Shopee Xpress (SPX)', regex: /^SPEPH([0-9]{12}|[0-9]{11}[0-9A-Z])$/ },
    { name: 'Lazada Express (LEX)', regex: /^\d{9}-\d{4}$|^[A-Z]{4}\d{14}$|^[A-Z]{4}-\d{9}-\d{4}$/ },
];

export default function ShipOrderModal({ visible, order, submitting, onClose, onSubmit }: Props) {
    const [shippingMethod, setShippingMethod] = useState<'TRACKED' | 'UNTRACKED'>('TRACKED');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('');
    const [message, setMessage] = useState('');
    const [itemPhoto, setItemPhoto] = useState<string | null>(null);
    const [packagePhoto, setPackagePhoto] = useState<string | null>(null);
    const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const resetForm = () => {
        setShippingMethod('TRACKED');
        setTrackingNumber('');
        setCourierName('');
        setMessage('');
        setItemPhoto(null);
        setPackagePhoto(null);
        setReceiptPhoto(null);
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const pickImage = async (setter: (uri: string) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) setter(result.assets[0].uri);
    };

    const detectCourier = (text: string) => {
        setTrackingNumber(text);
        if (errors.trackingNumber) setErrors(prev => ({ ...prev, trackingNumber: false }));
        const match = COURIER_PATTERNS.find(c => c.regex.test(text));
        if (match) setCourierName(match.name);
    };

    const handleSubmit = () => {
        const newErrors: Record<string, boolean> = {};
        if (!itemPhoto) newErrors.itemPhoto = true;
        if (!packagePhoto) newErrors.packagePhoto = true;
        if (shippingMethod === 'TRACKED' && !trackingNumber) newErrors.trackingNumber = true;
        if (shippingMethod === 'UNTRACKED' && !receiptPhoto) newErrors.receiptPhoto = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});
        onSubmit({
            shippingMethod,
            trackingNumber: shippingMethod === 'TRACKED' ? trackingNumber : null,
            courierName,
            message,
            itemPhotoUri: itemPhoto!,
            packagePhotoUri: packagePhoto!,
            receiptPhotoUri: receiptPhoto,
        });
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
            <View style={s.overlay}>
                <View style={s.content}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={s.title}>Ship Order #{order?.uid}</Text>

                        {/* Step 1: Proof Photos */}
                        <Text style={s.sectionTitle}>1. Proof Photos *</Text>
                        <View style={s.photoRow}>
                            <TouchableOpacity style={[s.photoBox, errors.itemPhoto && s.photoBoxError]} onPress={() => pickImage(setItemPhoto)}>
                                {itemPhoto ? (
                                    <Image source={{ uri: itemPhoto }} style={s.photoPreview} />
                                ) : (
                                    <View style={s.photoPlaceholder}>
                                        <Text style={s.photoLabel}>Item Photo</Text>
                                        <Text style={s.photoSub}>Can reuse listing info</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.photoBox, errors.packagePhoto && s.photoBoxError]} onPress={() => pickImage(setPackagePhoto)}>
                                {packagePhoto ? (
                                    <Image source={{ uri: packagePhoto }} style={s.photoPreview} />
                                ) : (
                                    <View style={s.photoPlaceholder}>
                                        <Text style={s.photoLabel}>Package Photo</Text>
                                        <Text style={s.photoSub}>With Order # visible</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={s.photoAddPlaceholder}>
                                <Text style={{ fontSize: 24, color: P }}>+</Text>
                                <Text style={s.photoAddText}>Add Image</Text>
                                <Text style={s.photoAddHint}>or drag & drop</Text>
                            </View>
                        </View>

                        {/* Step 2: Method */}
                        <Text style={s.sectionTitle}>2. Shipping Method</Text>
                        <View style={s.methodRow}>
                            <TouchableOpacity style={[s.methodBtn, shippingMethod === 'TRACKED' && s.methodBtnActive]} onPress={() => setShippingMethod('TRACKED')}>
                                <Text style={[s.methodText, shippingMethod === 'TRACKED' && s.methodTextActive]}>Standard Courier</Text>
                                <Text style={s.methodSub}>J&T, Flash, Ninja Van, GoGo</Text>
                                <Text style={s.methodBadge}>14 Days Guarantee</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.methodBtn, shippingMethod === 'UNTRACKED' && s.methodBtnActive]} onPress={() => setShippingMethod('UNTRACKED')}>
                                <Text style={[s.methodText, shippingMethod === 'UNTRACKED' && s.methodTextActive]}>Manual / Other</Text>
                                <Text style={s.methodSub}>PhilPost, Meet-up, Personal</Text>
                                <Text style={s.methodBadge}>7 Days Guarantee</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Step 3: Details */}
                        <Text style={s.sectionTitle}>3. Shipping Details</Text>
                        {shippingMethod === 'TRACKED' ? (
                            <>
                                <Text style={s.label}>Tracking / Waybill Number *</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, width: '100%' }}>
                                    <TextInput
                                        style={[s.input, { flex: 1, marginBottom: 0 }, errors.trackingNumber && s.inputError]}
                                        placeholder="Enter Tracking ID (e.g. PH0912...)"
                                        placeholderTextColor="#AAA"
                                        value={trackingNumber}
                                        onChangeText={detectCourier}
                                    />
                                </View>
                                <Text style={s.label}>Courier Name (Optional)</Text>
                                <TextInput style={s.input} placeholder="e.g. Flash Express, J&T" placeholderTextColor="#AAA" value={courierName} onChangeText={setCourierName} />
                                <View style={s.infoBox}>
                                    <Text style={s.infoText}>💡 Order will auto-complete in <Text style={{ fontWeight: 'bold' }}>14 days</Text> to give time for delivery.</Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={s.label}>Proof of Handover / Receipt *</Text>
                                <TouchableOpacity style={[s.photoBoxFull, errors.receiptPhoto && s.photoBoxError]} onPress={() => pickImage(setReceiptPhoto)}>
                                    {receiptPhoto ? (
                                        <Image source={{ uri: receiptPhoto }} style={s.photoPreview} />
                                    ) : (
                                        <View style={s.photoPlaceholder}>
                                            <Text style={s.photoLabel}>Upload Photo of Receipt or Item with Buyer</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <View style={[s.infoBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                                    <Text style={[s.infoText, { color: '#92400E' }]}>⚠️ Order will auto-complete in <Text style={{ fontWeight: 'bold' }}>7 days</Text> since there is no online tracking.</Text>
                                </View>
                            </>
                        )}

                        <Text style={s.label}>Message (Optional)</Text>
                        <TextInput style={s.input} placeholder="Any notes for the customer?" placeholderTextColor="#AAA" value={message} onChangeText={setMessage} />

                        <View style={s.modalButtons}>
                            <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                                <Text style={s.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.confirmBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
                                <Text style={s.confirmBtnText}>{submitting ? 'Processing...' : 'Confirm Shipping'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    content: { backgroundColor: CARD, width: '90%', maxWidth: 1000, maxHeight: '90%', padding: 32, borderRadius: 24, elevation: 5 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: TEXT, fontFamily: 'Quicksand' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginTop: 20, marginBottom: 12, fontFamily: 'Quicksand' },
    label: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 8 },
    input: { borderWidth: 2, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: BG, color: TEXT, fontFamily: 'Quicksand', marginBottom: 24, outlineStyle: 'none' as any },
    inputError: { borderColor: RED, backgroundColor: P_LIGHT },
    photoRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    photoBox: { width: 250, height: 250, backgroundColor: BG, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
    photoBoxError: { borderColor: RED, backgroundColor: P_LIGHT },
    photoBoxFull: { width: '40%', height: 250, backgroundColor: BG, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginHorizontal: 'auto' },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center', padding: 8 },
    photoLabel: { fontSize: 13, fontWeight: '600', color: TEXT, textAlign: 'center', opacity: 0.6 },
    photoSub: { fontSize: 11, color: SUB, textAlign: 'center', opacity: 0.5 },
    photoAddPlaceholder: { width: 250, height: 250, borderRadius: 16, borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: BG, gap: 6 },
    photoAddText: { fontSize: 13, color: P, fontWeight: '600', fontFamily: 'Quicksand' },
    photoAddHint: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    methodRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    methodBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: BORDER, alignItems: 'flex-start', backgroundColor: CARD },
    methodBtnActive: { backgroundColor: P_LIGHT, borderColor: P },
    methodText: { fontSize: 14, color: TEXT, fontWeight: '600', marginBottom: 2, fontFamily: 'Quicksand' },
    methodTextActive: { color: P },
    methodSub: { fontSize: 11, color: SUB, marginBottom: 6, fontFamily: 'Quicksand' },
    methodBadge: { fontSize: 10, color: SUB, backgroundColor: BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, overflow: 'hidden', fontFamily: 'Quicksand' },
    infoBox: { padding: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', marginTop: 4, marginBottom: 8 },
    infoText: { fontSize: 13, color: '#1E40AF', fontFamily: 'Quicksand' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 32 },
    cancelBtn: { padding: 14, borderRadius: 12, justifyContent: 'center' },
    confirmBtn: { backgroundColor: P, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, justifyContent: 'center' },
    btnText: { color: SUB, fontWeight: '700', fontFamily: 'Quicksand' },
    confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15, fontFamily: 'Quicksand' },
});
