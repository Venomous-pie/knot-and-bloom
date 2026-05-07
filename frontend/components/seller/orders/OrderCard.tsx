import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@/types/order';

const P = '#B36979', P_LIGHT = '#FDEEF1', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5', GREEN = '#10B981', RED = '#EF4444';
const LATE_THRESHOLD_DAYS = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        PENDING: '#F59E0B', CONFIRMED: '#3B82F6', IN_PRODUCTION: '#8B5CF6',
        READY_TO_SHIP: '#EC4899', SHIPPED: '#10B981', DELIVERED: '#059669',
        COMPLETED: '#059669', CANCELLED: '#EF4444', DISPUTED: '#DC2626',
    };
    return map[status] || 'gray';
};

const isLate = (order: Order) => {
    if (['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return false;
    return (Date.now() - new Date(order.uploaded).getTime()) > (LATE_THRESHOLD_DAYS * ONE_DAY_MS);
};

interface Props {
    order: Order;
    isSelected: boolean;
    selectionMode: boolean;
    onToggleSelection: (id: number) => void;
    onOpenModal: (order: Order, type: 'ship' | 'accept' | 'reject') => void;
    onQuickAction: (status: string, order: Order) => void;
}

export default function OrderCard({ order, isSelected, selectionMode, onToggleSelection, onOpenModal, onQuickAction }: Props) {
    const late = isLate(order);

    const renderActions = () => {
        switch (order.status) {
            case 'PENDING':
                return (
                    <View style={s.actionRow}>
                        <TouchableOpacity style={[s.btn, s.rejectBtn]} onPress={() => onOpenModal(order, 'reject')}>
                            <Text style={s.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.btn, s.primaryBtn]} onPress={() => onOpenModal(order, 'accept')}>
                            <Text style={s.primaryBtnText}>Accept Order</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'CONFIRMED':
                return (
                    <TouchableOpacity style={[s.btn, s.primaryBtn]} onPress={() => onQuickAction('IN_PRODUCTION', order)}>
                        <Text style={s.primaryBtnText}>Start Production</Text>
                    </TouchableOpacity>
                );
            case 'IN_PRODUCTION':
                return (
                    <TouchableOpacity style={[s.btn, s.primaryBtn]} onPress={() => onQuickAction('READY_TO_SHIP', order)}>
                        <Text style={s.primaryBtnText}>Mark Ready to Ship</Text>
                    </TouchableOpacity>
                );
            case 'READY_TO_SHIP':
                return (
                    <TouchableOpacity style={[s.btn, s.primaryBtn]} onPress={() => onOpenModal(order, 'ship')}>
                        <Text style={s.primaryBtnText}>Ship Order</Text>
                    </TouchableOpacity>
                );
            default: return null;
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => onToggleSelection(order.uid)}
            onPress={() => selectionMode ? onToggleSelection(order.uid) : null}
            style={[s.card, isSelected && s.cardSelected, late && s.cardLate]}
        >
            {selectionMode && (
                <View style={s.checkboxOverlay}>
                    <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                </View>
            )}
            {late && (
                <View style={s.lateBadge}>
                    <Ionicons name="alarm" size={14} color="#B91C1C" />
                    <Text style={s.lateText}>Late Shipment</Text>
                </View>
            )}
            <View style={s.header}>
                <View>
                    <Text style={s.orderId}>Order #{order.uid}</Text>
                    <Text style={s.date}>{new Date(order.uploaded).toLocaleDateString()}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[s.statusText, { color: getStatusColor(order.status) }]}>{order.status.replace(/_/g, ' ')}</Text>
                </View>
            </View>
            <View style={s.customerInfo}>
                <Text style={s.customerName}>Customer: {order.customer.name}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.subText}>Subtotal: ₱{Number(order.subtotal || order.total).toFixed(2)}</Text>
                    <Text style={[s.subText, { color: '#EF4444' }]}>Platform Fee (5%): -₱{Number(order.platformFee || 0).toFixed(2)}</Text>
                    <View style={s.divider} />
                    <Text style={s.earningsText}>Earnings: ₱{Number(order.sellerEarnings || order.total).toFixed(2)}</Text>
                </View>
            </View>
            {['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(order.status) && (
                <View style={s.escrowNote}>
                    <Text style={s.escrowText}>🔒 Payment held in Escrow</Text>
                </View>
            )}
            <View style={s.itemsList}>
                {order.items.map(oi => (
                    <View key={oi.uid} style={s.itemRow}>
                        {oi.product.image && <Image source={{ uri: oi.product.image }} style={s.image} />}
                        <View style={s.itemDetails}>
                            <Text style={s.productName}>{oi.product.name}</Text>
                            <Text style={s.qtyText}>Qty: {oi.quantity} x ₱{Number(oi.price).toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </View>
            {!selectionMode && <View style={s.actions}>{renderActions()}</View>}
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    card: { backgroundColor: CARD, padding: 20, borderRadius: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: BORDER },
    cardLate: { borderLeftWidth: 4, borderLeftColor: RED },
    cardSelected: { borderColor: P, borderWidth: 2, backgroundColor: P_LIGHT },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' },
    orderId: { fontWeight: '700', fontSize: 16, color: TEXT, fontFamily: 'Quicksand' },
    date: { color: SUB, fontSize: 13, marginTop: 2, fontFamily: 'Quicksand' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontWeight: '700', fontSize: 12 },
    customerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 12 },
    customerName: { color: SUB, fontSize: 14, fontFamily: 'Quicksand' },
    escrowNote: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
    escrowText: { fontSize: 12, color: '#92400E', fontWeight: '600', fontFamily: 'Quicksand' },
    subText: { fontSize: 12, color: SUB, marginBottom: 2, fontFamily: 'Quicksand' },
    earningsText: { fontSize: 14, fontWeight: '700', color: GREEN, marginTop: 2, fontFamily: 'Quicksand' },
    divider: { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 4 },
    itemsList: { marginBottom: 16 },
    itemRow: { flexDirection: 'row', marginBottom: 12 },
    image: { width: 48, height: 48, borderRadius: 12, marginRight: 12, backgroundColor: BG },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontWeight: '600', fontSize: 14, color: TEXT, marginBottom: 2, fontFamily: 'Quicksand' },
    qtyText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    actions: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16, alignItems: 'flex-end' },
    actionRow: { flexDirection: 'row', gap: 12 },
    btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, minWidth: 100, alignItems: 'center' },
    primaryBtn: { backgroundColor: P },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    rejectBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: RED },
    rejectBtnText: { color: RED, fontWeight: '600', fontSize: 14, fontFamily: 'Quicksand' },
    lateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, backgroundColor: P_LIGHT, padding: 6, borderRadius: 8, alignSelf: 'flex-start' },
    lateText: { fontSize: 12, color: RED, fontWeight: 'bold', fontFamily: 'Quicksand' },
    checkboxOverlay: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
    checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: P, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
    checkboxSelected: { backgroundColor: P },
});
