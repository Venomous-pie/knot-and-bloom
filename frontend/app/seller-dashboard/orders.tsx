import { useAuth } from "@/contexts/AuthContext";
import { sellerOrdersAPI } from "@/api/api";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight } from 'lucide-react-native';
import * as Print from 'expo-print';
import { uploadToImageKit } from '@/lib/imagekit';

import type { Order } from '@/types/order';
import OrderCard from '@/components/seller/orders/OrderCard';
import ShipOrderModal, { ShipFormData } from '@/components/seller/orders/ShipOrderModal';
import AcceptOrderModal, { AcceptFormData } from '@/components/seller/orders/AcceptOrderModal';
import RejectOrderModal, { RejectFormData } from '@/components/seller/orders/RejectOrderModal';
import BulkActionBar from '@/components/seller/orders/BulkActionBar';

const P = '#B36979';
const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';

export default function SellerOrders() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [shipModalVisible, setShipModalVisible] = useState(false);
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Bulk Selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login');
                return;
            }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/');
            }
        }
    }, [user, authLoading]);

    const fetchOrders = async () => {
        const targetSellerId = user?.sellerId;
        if (!targetSellerId && user?.role !== 'ADMIN') return;
        if (!targetSellerId) return;

        try {
            setLoading(true);
            const res = await sellerOrdersAPI.getSellerOrders(targetSellerId);
            setOrders(res.data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.sellerId) fetchOrders();
    }, [user]);

    const handleUpdateStatus = async (status: string, extraData: any = {}, orderOverrides?: Order[]) => {
        const targets = orderOverrides || (selectedOrder ? [selectedOrder] : []);
        if (targets.length === 0) return false;

        try {
            setSubmitting(true);
            await Promise.all(targets.map(async (order) => {
                const res = await sellerOrdersAPI.updateOrderStatus(order.uid, { status, ...extraData });
                const data = res.data;
                if (data.success) {
                    setOrders(prev => prev.map(o => o.uid === order.uid ? { ...o, ...data.order } : o));
                }
            }));

            Alert.alert("Success", targets.length > 1 ? "Bulk update completed" : `Order updated to ${status}`);
            closeAllModals();
            return true;
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Something went wrong.");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const closeAllModals = () => {
        setShipModalVisible(false);
        setAcceptModalVisible(false);
        setRejectModalVisible(false);
        setSelectedOrder(null);
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelection = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
            if (newSet.size === 0) setSelectionMode(false);
        } else {
            newSet.add(id);
            setSelectionMode(true);
        }
        setSelectedIds(newSet);
    };

    const openModal = (order: Order, type: 'ship' | 'accept' | 'reject') => {
        setSelectedOrder(order);
        if (type === 'ship') setShipModalVisible(true);
        if (type === 'accept') setAcceptModalVisible(true);
        if (type === 'reject') setRejectModalVisible(true);
    };

    const handleBulkPrint = async () => {
        if (selectedIds.size === 0) return;
        const selectedOrders = orders.filter(o => selectedIds.has(o.uid));

        try {
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .slip { border-bottom: 2px dashed #333; padding-bottom: 20px; margin-bottom: 20px; page-break-after: always; }
                        .header { text-align: center; margin-bottom: 20px; }
                        .title { font-size: 20px; font-weight: bold; }
                        .meta { display: flex; justify-content: space-between; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    ${selectedOrders.map(order => `
                        <div class="slip">
                            <div class="header">
                                <div class="title">PACKING SLIP</div>
                                <div>Order #${order.uid}</div>
                            </div>
                            <div class="meta">
                                <div>
                                    <strong>Customer:</strong><br>
                                    ${order.customer.name}<br>
                                    ${order.customer.email}
                                </div>
                                <div style="text-align: right;">
                                    <strong>Date:</strong> ${new Date(order.uploaded).toLocaleDateString()}<br>
                                    <strong>Status:</strong> ${order.status}
                                </div>
                            </div>
                            <table>
                                <thead>
                                    <tr><th>Item</th><th>Qty</th><th>SKU</th></tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => `
                                        <tr>
                                            <td>${item.product.name}</td>
                                            <td>${item.quantity}</td>
                                            <td>-</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
            await Print.printAsync({ html });
        } catch (error) {
            Alert.alert("Error", "Failed to print");
        }
    };

    const handleBulkReady = () => {
        const selectedOrders = orders.filter(o => selectedIds.has(o.uid));
        const validOrders = selectedOrders.filter(o => o.status === 'IN_PRODUCTION');
        if (validOrders.length === 0) {
            Alert.alert("Info", "Only orders in 'In Production' status can be marked as Ready to Ship.");
            return;
        }
        Alert.alert(
            "Confirm Bulk Update",
            `Mark ${validOrders.length} orders as Ready to Ship?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => handleUpdateStatus('READY_TO_SHIP', {}, validOrders) }
            ]
        );
    };

    const onShipSubmit = async (data: ShipFormData) => {
        try {
            setSubmitting(true);
            const itemRes = await uploadToImageKit({ uri: data.itemPhotoUri, name: `item_${selectedOrder?.uid}` });
            const pkgRes = await uploadToImageKit({ uri: data.packagePhotoUri, name: `pkg_${selectedOrder?.uid}` });
            const proofPhotos = [itemRes.url, pkgRes.url];

            if (data.receiptPhotoUri) {
                const receiptRes = await uploadToImageKit({ uri: data.receiptPhotoUri, name: `receipt_${selectedOrder?.uid}` });
                proofPhotos.push(receiptRes.url);
            }

            const success = await handleUpdateStatus('SHIPPED', {
                shippingMethod: data.shippingMethod,
                proofPhotos: JSON.stringify(proofPhotos),
                trackingNumber: data.trackingNumber,
                courierName: data.courierName,
                message: data.message
            });
            if (!success) setSubmitting(false);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to upload photos or update order.");
            setSubmitting(false);
        }
    };

    const onAcceptSubmit = (data: AcceptFormData) => handleUpdateStatus('CONFIRMED', data);
    const onRejectSubmit = (data: RejectFormData) => handleUpdateStatus('CANCELLED', data);

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Seller Orders" }} />
            <View style={s.headerContainer}>
                <View style={s.headerRow}>
                    <Text style={s.pageTitle}>Orders</Text>
                    <TouchableOpacity onPress={() => router.push('/seller-dashboard/products' as any)} style={s.navBtn}>
                        <Text style={s.navBtnText}>Manage Products</Text>
                        <ChevronRight size={16} color={P} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={s.listWrapper}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={item => String(item.uid)}
                        renderItem={({ item }) => (
                            <OrderCard
                                order={item}
                                isSelected={selectedIds.has(item.uid)}
                                selectionMode={selectionMode}
                                onToggleSelection={toggleSelection}
                                onOpenModal={openModal}
                                onQuickAction={(status, order) => {
                                    setSelectedOrder(order);
                                    handleUpdateStatus(status, {}, [order]);
                                }}
                            />
                        )}
                        contentContainerStyle={s.list}
                        ListEmptyComponent={<Text style={s.empty}>No orders found.</Text>}
                    />
                )}
            </View>

            {selectionMode && (
                <BulkActionBar
                    selectedCount={selectedIds.size}
                    onPrint={handleBulkPrint}
                    onShip={handleBulkReady}
                    onCancel={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
                />
            )}

            <ShipOrderModal visible={shipModalVisible} order={selectedOrder} submitting={submitting} onClose={() => setShipModalVisible(false)} onSubmit={onShipSubmit} />
            <AcceptOrderModal visible={acceptModalVisible} order={selectedOrder} submitting={submitting} onClose={() => setAcceptModalVisible(false)} onSubmit={onAcceptSubmit} />
            <RejectOrderModal visible={rejectModalVisible} order={selectedOrder} submitting={submitting} onClose={() => setRejectModalVisible(false)} onSubmit={onRejectSubmit} />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: TEXT, fontFamily: 'Quicksand' },
    navBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
    navBtnText: { color: TEXT, fontWeight: '600', fontFamily: 'Quicksand', marginRight: 4 },
    listWrapper: { flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' },
    list: { padding: 20 },
    empty: { textAlign: 'center', marginTop: 20, color: SUB, fontFamily: 'Quicksand' }
});
