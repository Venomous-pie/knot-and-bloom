import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Clock, AlertTriangle, Lock, Package, CheckSquare, Square, X, MapPin, CreditCard, Mail, FileText, UploadCloud } from 'lucide-react-native';
import type { Order } from '@/types/order';
import ImageUploader from '../ImageUploader';
import { orderAPI } from '@/api/api';

const P = '#B36979', P_LIGHT = '#FDEEF1', BG = '#F4F4F8', CARD = '#FFFFFF';
const TEXT = '#1A1A2E', SUB = '#6B7280', BORDER = '#F0F0F5', GREEN = '#10B981', RED = '#EF4444', AMBER = '#F59E0B';
const INDIGO = '#6366F1', TEAL = '#14B8A6', BLUE = '#3B82F6', PINK = '#EC4899';

const LATE_THRESHOLD_DAYS = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getOrderProcessingDays = (order: Order): number => {
    let maxDays = LATE_THRESHOLD_DAYS;
    
    order.items?.forEach(item => {
        const pt = (item.product as any)?.processingTime;
        if (!pt) return;
        
        let days = 0;
        const nums = pt.match(/\d+/g);
        if (nums && nums.length > 0) {
            days = Math.max(...nums.map(Number));
        }
        
        if (pt.toLowerCase().includes('week')) {
            days *= 7;
        } else if (pt.toLowerCase().includes('month')) {
            days *= 30;
        }
        
        if (days > maxDays) {
            maxDays = days;
        }
    });
    
    return maxDays;
};

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
    return (Date.now() - new Date(order.uploaded).getTime()) > (getOrderProcessingDays(order) * ONE_DAY_MS);
};

interface Props {
    order: Order;
    onOpenModal: (order: Order, type: 'ship' | 'accept' | 'reject') => void;
    onQuickAction: (status: string, order: Order) => Promise<void> | void;
    onClose?: () => void;
}

export default function OrderCard({ order, onOpenModal, onQuickAction, onClose }: Props) {
    const late = isLate(order);
    const statusColor = getStatusColor(order.status);
    const [submitting, setSubmitting] = React.useState(false);
    
    // Progress Images State
    const [progressImages, setProgressImages] = React.useState<{uri: string, isUrl?: boolean}[]>(
        order.progressImages ? order.progressImages.map(url => ({ uri: url, isUrl: true })) : []
    );
    const [savingImages, setSavingImages] = React.useState(false);

    const getBuyerNote = () => {
        if (!order.shippingAddressSnapshot) return null;
        try {
            const addr = JSON.parse(order.shippingAddressSnapshot);
            if (!addr.notes) return null;
            
            // notes might be a JSON string of { [sellerId]: string }
            let notesObj;
            try {
                notesObj = JSON.parse(addr.notes);
            } catch (e) {
                // If it's not JSON, maybe it's just a raw string
                return typeof addr.notes === 'string' && addr.notes.trim() !== '' ? addr.notes : null;
            }

            if (order.sellerId && notesObj[order.sellerId]) {
                const note = notesObj[order.sellerId];
                return typeof note === 'string' ? note.trim() : null;
            }

            const noteValues = Object.values(notesObj) as string[];
            if (noteValues.length > 0 && noteValues[0]) {
                const note = noteValues[0];
                return typeof note === 'string' ? note.trim() : null;
            }
        } catch (e) {
            // ignore
        }
        return null;
    };
    const buyerNote = getBuyerNote();

    const handleSaveProgressImages = async () => {
        setSavingImages(true);
        try {
            const urls = progressImages.map(img => img.uri);
            await orderAPI.updateStatus(order.uid, order.status, { 
                progressImages: urls,
                message: "Uploaded progress images."
            });
            Alert.alert("Success", "Progress images saved successfully!");
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to save progress images");
        } finally {
            setSavingImages(false);
        }
    };

    const handleQuickAction = async (status: string, o: Order) => {
        setSubmitting(true);
        try {
            await onQuickAction(status, o);
        } finally {
            setSubmitting(false);
        }
    };

    const renderActions = () => {
        switch (order.status) {
            case 'PENDING':
                return (
                    <View style={s.actionRow}>
                        <TouchableOpacity disabled={submitting} style={[s.btn, s.rejectBtn, { flex: 1, opacity: submitting ? 0.7 : 1 }]} onPress={() => onOpenModal(order, 'reject')}>
                            <Text style={s.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={submitting} style={[s.btn, s.primaryBtn, { flex: 1, opacity: submitting ? 0.7 : 1 }]} onPress={() => onOpenModal(order, 'accept')}>
                            <Text style={s.primaryBtnText}>Accept Order</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'CONFIRMED':
                return (
                    <TouchableOpacity disabled={submitting} style={[s.btn, s.primaryBtn, { opacity: submitting ? 0.7 : 1 }]} onPress={() => handleQuickAction('IN_PRODUCTION', order)}>
                        {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Start Production</Text>}
                    </TouchableOpacity>
                );
            case 'IN_PRODUCTION':
                return (
                    <TouchableOpacity disabled={submitting} style={[s.btn, s.primaryBtn, { opacity: submitting ? 0.7 : 1 }]} onPress={() => handleQuickAction('READY_TO_SHIP', order)}>
                        {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Mark Ready to Ship</Text>}
                    </TouchableOpacity>
                );
            case 'READY_TO_SHIP':
                return (
                    <TouchableOpacity disabled={submitting} style={[s.btn, s.primaryBtn, { opacity: submitting ? 0.7 : 1 }]} onPress={() => onOpenModal(order, 'ship')}>
                        <Text style={s.primaryBtnText}>Ship Order</Text>
                    </TouchableOpacity>
                );
            default: return null;
        }
    };

    return (
        <View style={[s.card, late && s.cardLate, { flex: 1 }]}>
            {/* Header Section (Sticky) */}
            <View style={[s.header, { paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24 }]}>
                <View style={s.headerLeft}>
                    <View>
                        <Text style={s.orderId}>Order #{order.referenceNumber || order.uid}</Text>
                        <View style={s.dateRow}>
                            <Clock size={12} color={SUB} />
                            <Text style={s.dateText}>
                                {new Date(order.uploaded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={s.headerRight}>
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                            <X size={18} color={TEXT} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
                {/* Late Warning */}
                {late && (
                    <View style={s.lateBanner}>
                        <AlertTriangle size={14} color={RED} />
                        <Text style={s.lateText}>Shipment is overdue! Please process immediately.</Text>
                    </View>
                )}

                <View style={[s.contentSection, { marginTop: late ? 24 : 0 }]}>
                    <View style={[s.customerRow, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={s.avatar}>
                                <Text style={s.avatarText}>{order.customer.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={s.customerName}>{order.customer.name}</Text>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}>
                                     <Mail size={12} color={SUB} />
                                     <Text style={s.customerLabel}>{order.customer.email}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: statusColor + '20', marginTop: 0 }]}>
                            <Text style={[s.statusText, { color: statusColor }]}>
                                {order.status.replace(/_/g, ' ')}
                            </Text>
                        </View>
                    </View>

                <View style={s.infoGrid}>
                    {/* Shipping Info */}
                    <View style={s.infoCard}>
                        <View style={s.infoHeader}>
                            <MapPin size={16} color={P} />
                            <Text style={s.infoTitle}>Delivery Details</Text>
                        </View>
                        {order.shippingAddressSnapshot ? (
                            (() => {
                                try {
                                    const addr = JSON.parse(order.shippingAddressSnapshot);
                                    return (
                                        <View>
                                            <Text style={[s.infoText, { fontWeight: '700' }]}>{addr.fullName}</Text>
                                            <Text style={s.infoText}>{addr.phone}</Text>
                                            <Text style={[s.infoText, {marginTop: 6}]} numberOfLines={2}>
                                                {[addr.street, addr.barangay].filter(Boolean).join(', ')}
                                            </Text>
                                            <Text style={s.infoText}>
                                                {[addr.city, addr.province, addr.zipCode].filter(Boolean).join(', ')}
                                            </Text>
                                        </View>
                                    );
                                } catch (e) {
                                    return <Text style={s.infoText}>{order.shippingAddressSnapshot}</Text>;
                                }
                            })()
                        ) : (
                            <Text style={s.infoText}>No shipping address provided.</Text>
                        )}
                        {order.shippingMethod && (
                            <View style={s.shippingMethodTag}>
                                <Text style={s.shippingMethodText}>{order.shippingMethod}</Text>
                            </View>
                        )}
                    </View>
                    
                    {/* Payment Info */}
                    <View style={s.infoCard}>
                        <View style={s.infoHeader}>
                            <CreditCard size={16} color={P} />
                            <Text style={s.infoTitle}>Payment Details</Text>
                        </View>
                        <View style={s.paymentDetailRow}>
                            <Text style={s.paymentDetailLabel}>Method</Text>
                            <Text style={s.paymentDetailValue}>{order.paymentMethod || 'N/A'}</Text>
                        </View>
                        <View style={s.paymentDetailRow}>
                            <Text style={s.paymentDetailLabel}>Status</Text>
                            <Text style={[s.paymentDetailValue, { color: order.paymentStatus === 'PAID' ? GREEN : order.paymentStatus === 'FAILED' ? RED : AMBER }]}>
                                {order.paymentStatus || 'PENDING'}
                            </Text>
                        </View>
                        {order.cancellationReason && (
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER }}>
                                <Text style={[s.paymentDetailLabel, { color: RED }]}>Cancellation Reason</Text>
                                <Text style={[s.paymentDetailValue, { color: RED, marginTop: 4 }]}>{order.cancellationReason}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {buyerNote && (
                    <View style={s.noteCard}>
                        <View style={s.infoHeader}>
                            <FileText size={16} color={P} />
                            <Text style={s.infoTitle}>Note from Buyer</Text>
                        </View>
                        <Text style={s.noteText}>{buyerNote}</Text>
                    </View>
                )}

                {order.status === 'IN_PRODUCTION' && (
                    <View style={s.progressCard}>
                        <View style={s.infoHeader}>
                            <UploadCloud size={16} color={P} />
                            <Text style={s.infoTitle}>Production Progress Images</Text>
                        </View>
                        <Text style={[s.infoText, { marginBottom: 12, color: SUB }]}>
                            Upload up to 3 images to keep your customer updated.
                        </Text>
                        <ImageUploader
                            images={progressImages}
                            onImagesChange={setProgressImages}
                            maxImages={3}
                            compact={true}
                        />
                        {progressImages.length > 0 && (
                            <TouchableOpacity 
                                style={[s.saveImageBtn, savingImages && { opacity: 0.7 }]} 
                                onPress={handleSaveProgressImages}
                                disabled={savingImages}
                            >
                                {savingImages ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={s.saveImageBtnText}>Save Images</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

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
                {!!order.shippingFee && (
                    <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>Shipping Fee</Text>
                        <Text style={s.summaryValue}>₱{Number(order.shippingFee).toFixed(2)}</Text>
                    </View>
                )}
                <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { fontWeight: '700', color: TEXT }]}>Customer Total (Product + Shipping)</Text>
                    <Text style={[s.summaryValue, { fontWeight: '800' }]}>₱{Number(Number(order.subtotal || order.total) + Number(order.shippingFee || 0)).toFixed(2)}</Text>
                </View>
                <View style={[s.divider, { marginVertical: 12, backgroundColor: BORDER }]} />
                <View style={s.summaryRow}>
                    <Text style={s.summaryLabel}>Seller Transaction Fee (5%)</Text>
                    <Text style={[s.summaryValue, { color: RED }]}>-₱{Number(Number(order.subtotal || order.total) - Number(order.sellerEarnings || order.total)).toFixed(2)}</Text>
                </View>
                {!!order.shippingFee && (
                    <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>Shipping (Paid to you)</Text>
                        <Text style={[s.summaryValue, { color: GREEN }]}>+₱{Number(order.shippingFee).toFixed(2)}</Text>
                    </View>
                )}
                <View style={[s.divider, { marginVertical: 12, backgroundColor: BORDER }]} />
                <View style={s.summaryRow}>
                    <Text style={s.earningsLabel}>Your Net Earnings</Text>
                    <Text style={s.earningsValue}>₱{Number(Number(order.sellerEarnings || order.total) + Number(order.shippingFee || 0)).toFixed(2)}</Text>
                </View>
            </View>
            </ScrollView>
            
            {/* Actions (Sticky Footer) */}
            <View style={s.actionsContainer}>
                {['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(order.status) && (
                    <View style={[s.escrowNote, { width: '100%', marginBottom: 16, justifyContent: 'center' }]}>
                        <Lock size={12} color="#92400E" />
                        <Text style={s.escrowText}>Funds secured in Escrow until delivery</Text>
                    </View>
                )}
                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && order.status !== 'SHIPPED' && (
                    renderActions()
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    card: { 
    },
    cardLate: {},
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    orderId: { fontSize: 22, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    dateText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontWeight: '600' },
    
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontSize: 12, fontWeight: '700', fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    
    lateBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: RED + '30', shadowColor: RED, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    lateText: { fontSize: 14, color: RED, fontWeight: '700', fontFamily: 'Quicksand' },
    
    divider: { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 24 },
    
    contentSection: { marginBottom: 24 },
    customerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '800', color: P, fontFamily: 'Quicksand' },
    customerName: { fontSize: 16, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    customerLabel: { fontSize: 12, color: SUB, fontFamily: 'Quicksand', fontWeight: '500' },
    
    infoGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    infoCard: { flex: 1, minWidth: 230, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16 },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    infoTitle: { fontFamily: 'Quicksand', fontSize: 13, fontWeight: '700', color: TEXT },
    infoText: { fontFamily: 'Quicksand', fontSize: 13, color: TEXT, lineHeight: 18 },
    noteCard: { backgroundColor: CARD, borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: BORDER },
    noteText: { fontFamily: 'Quicksand', fontSize: 13, color: TEXT, lineHeight: 20, fontStyle: 'italic', marginTop: 8 },
    progressCard: { backgroundColor: CARD, borderRadius: 12, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: BORDER },
    saveImageBtn: { backgroundColor: P, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    saveImageBtnText: { color: '#FFF', fontFamily: 'Quicksand', fontWeight: '700', fontSize: 14 },
    shippingMethodTag: { marginTop: 12, backgroundColor: BG, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    shippingMethodText: { color: P, fontSize: 10, fontWeight: '800', fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    paymentDetailLabel: { fontSize: 12, color: SUB, fontFamily: 'Quicksand', fontWeight: '600' },
    paymentDetailValue: { fontSize: 12, color: TEXT, fontFamily: 'Quicksand', fontWeight: '800' },
    
    itemsList: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    image: { width: 56, height: 56, borderRadius: 12, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4, lineHeight: 20 },
    qtyText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontWeight: '600' },
    
    summaryBox: { backgroundColor: BG, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: BORDER },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    summaryLabel: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontWeight: '600' },
    summaryValue: { fontSize: 13, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    earningsLabel: { fontSize: 15, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' },
    earningsValue: { fontSize: 20, fontWeight: '800', color: GREEN, fontFamily: 'Quicksand' },
    
    escrowNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignSelf: 'flex-start' },
    escrowText: { fontSize: 13, color: '#92400E', fontWeight: '700', fontFamily: 'Quicksand' },
    
    actionsContainer: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 24, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: CARD },
    actionRow: { flexDirection: 'row', gap: 16 },
    btn: { flex: 1, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    primaryBtn: { backgroundColor: P },
    primaryBtnText: { color: 'white', fontWeight: '800', fontSize: 15, fontFamily: 'Quicksand' },
    rejectBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: RED, shadowOpacity: 0.05 },
    rejectBtnText: { color: RED, fontWeight: '800', fontSize: 15, fontFamily: 'Quicksand' },
});
