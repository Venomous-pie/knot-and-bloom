import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock, AlertTriangle, Lock, Package, CheckSquare, Square } from 'lucide-react-native';
import type { Order } from '@/types/order';

const P = '#B36979', P_LIGHT = '#FDEEF1', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5', GREEN = '#10B981', RED = '#EF4444', AMBER = '#F59E0B';
const INDIGO = '#6366F1', TEAL = '#14B8A6', BLUE = '#3B82F6', PINK = '#EC4899';

const LATE_THRESHOLD_DAYS = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
        PENDING: AMBER, CONFIRMED: BLUE, IN_PRODUCTION: INDIGO,
        READY_TO_SHIP: PINK, SHIPPED: TEAL, DELIVERED: GREEN,
        COMPLETED: GREEN, CANCELLED: RED, DISPUTED: RED,
    };
    return map[status] || SUB;
};

const isLate = (order: Order) => {
    if (['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return false;
    return (Date.now() - new Date(order.uploaded).getTime()) > (LATE_THRESHOLD_DAYS * ONE_DAY_MS);
};

interface Props {
    order: Order;
    onOpenModal: (order: Order, type: 'ship' | 'accept' | 'reject') => void;
    onQuickAction: (status: string, order: Order) => void;
}

export default function OrderCard({ order, onOpenModal, onQuickAction }: Props) {
    const late = isLate(order);
    const statusColor = getStatusColor(order.status);

    const renderActions = () => {
        switch (order.status) {
            case 'PENDING':
                return (
                    <View style={s.actionRow}>
                        <TouchableOpacity style={[s.btn, s.rejectBtn, { flex: 1 }]} onPress={() => onOpenModal(order, 'reject')}>
                            <Text style={s.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.btn, s.primaryBtn, { flex: 1 }]} onPress={() => onOpenModal(order, 'accept')}>
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
        <View style={[s.card, late && s.cardLate]}>
            {/* Header Section */}
            <View style={s.header}>
                <View style={s.headerLeft}>
                    <View>
                        <Text style={s.orderId}>Order #{order.uid}</Text>
                        <View style={s.dateRow}>
                            <Clock size={12} color={SUB} />
                            <Text style={s.dateText}>
                                {new Date(order.uploaded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={[s.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>
                        {order.status.replace(/_/g, ' ')}
                    </Text>
                </View>
            </View>

            {/* Late Warning */}
            {late && (
                <View style={s.lateBanner}>
                    <AlertTriangle size={14} color={RED} />
                    <Text style={s.lateText}>Shipment is overdue! Please process immediately.</Text>
                </View>
            )}

            <View style={s.divider} />

            {/* Customer & Items */}
            <View style={s.contentSection}>
                <View style={s.customerRow}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{order.customer.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={s.customerName}>{order.customer.name}</Text>
                        <Text style={s.customerLabel}>Customer</Text>
                    </View>
                </View>

                <View style={s.itemsList}>
                    {order.items.map(oi => (
                        <View key={oi.uid} style={s.itemRow}>
                            {oi.product.image ? (
                                <Image source={{ uri: oi.product.image }} style={s.image} />
                            ) : (
                                <View style={[s.image, { alignItems: 'center', justifyContent: 'center' }]}>
                                    <Package size={20} color={SUB} />
                                </View>
                            )}
                            <View style={s.itemDetails}>
                                <Text style={s.productName} numberOfLines={2}>{oi.product.name}</Text>
                                <Text style={s.qtyText}>Qty: {oi.quantity} x ₱{Number(oi.price).toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Financial Summary */}
            <View style={s.summaryBox}>
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Subtotal</Text>
                    <Text style={s.summaryValue}>₱{Number(order.subtotal || order.total).toFixed(2)}</Text>
                </View>
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Platform Fee (5%)</Text>
                    <Text style={[s.summaryValue, { color: RED }]}>-₱{Number(order.platformFee || 0).toFixed(2)}</Text>
                </View>
                <View style={[s.divider, { marginVertical: 8, backgroundColor: BORDER }]} />
                <View style={s.summaryRow}>
                    <Text style={s.earningsLabel}>Your Earnings</Text>
                    <Text style={s.earningsValue}>₱{Number(order.sellerEarnings || order.total).toFixed(2)}</Text>
                </View>
            </View>

            {/* Escrow Notice */}
            {['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(order.status) && (
                <View style={s.escrowNote}>
                    <Lock size={12} color="#92400E" />
                    <Text style={s.escrowText}>Funds secured in Escrow until delivery</Text>
                </View>
            )}

            {/* Actions */}
            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && order.status !== 'SHIPPED' && (
                <View style={s.actionsContainer}>
                    {renderActions()}
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
    cardLate: { borderColor: RED + '40', borderWidth: 1 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    orderId: { fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    dateText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    
    lateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginTop: 16 },
    lateText: { fontSize: 13, color: RED, fontWeight: '600', fontFamily: 'Quicksand' },
    
    divider: { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 20 },
    
    contentSection: { marginBottom: 20 },
    customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    customerName: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    customerLabel: { fontSize: 12, color: SUB, fontFamily: 'Quicksand', marginTop: 2 },
    
    itemsList: { gap: 12 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    image: { width: 56, height: 56, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4, lineHeight: 20 },
    qtyText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    
    summaryBox: { backgroundColor: BG, borderRadius: 16, padding: 16, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    summaryLabel: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    summaryValue: { fontSize: 13, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    earningsLabel: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    earningsValue: { fontSize: 16, fontWeight: '800', color: GREEN, fontFamily: 'Quicksand' },
    
    escrowNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
    escrowText: { fontSize: 12, color: '#92400E', fontWeight: '600', fontFamily: 'Quicksand' },
    
    actionsContainer: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: BORDER },
    actionRow: { flexDirection: 'row', gap: 12 },
    btn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    primaryBtn: { backgroundColor: P },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    rejectBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: RED },
    rejectBtnText: { color: RED, fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
});
