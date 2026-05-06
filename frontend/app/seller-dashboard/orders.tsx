
import { useAuth } from "@/contexts/AuthContext";
import { sellerOrdersAPI, servicesAPI } from "@/api/api";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '@/lib/imagekit';
import * as Print from 'expo-print';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const LATE_THRESHOLD_DAYS = 3;

interface OrderItem {
    uid: number;
    quantity: number;
    price: number;
    product: { name: string; image: string | null };
}

interface Order {
    uid: number;
    status: string;
    total: number;
    uploaded: string;
    trackingNumber: string | null;
    courierName: string | null;
    customer: { name: string; email: string };
    items: OrderItem[];
    // Financials
    subtotal: number;
    platformFee: number;
    sellerEarnings: number;
}

export default function SellerOrders() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('');

    // New Shipping State
    const [shippingMethod, setShippingMethod] = useState<'TRACKED' | 'UNTRACKED'>('TRACKED');
    const [itemPhoto, setItemPhoto] = useState<string | null>(null);
    const [packagePhoto, setPackagePhoto] = useState<string | null>(null);
    const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null); // For untracked

    // Status Modals
    const [shipModalVisible, setShipModalVisible] = useState(false);
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);

    // Inputs
    const [estimatedDate, setEstimatedDate] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);

    // Bulk Selection
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const COURIER_PATTERNS = [
        { name: 'J&T Express', regex: /^\d{12}$/ },
        { name: 'Flash Express', regex: /^P[0-9A-Z]{12}$/ },
        { name: 'Ninja Van', regex: /^(NVP|NVPH)\d{9,10}$/ },
        { name: 'GoGo Xpress', regex: /^([0-9A-Z]{4}-){2}[0-9A-Z]{4}(-[0-9A-Z]{2})?$|^[0-9A-Z]{12}$/ },
        { name: 'Shopee Xpress (SPX)', regex: /^SPEPH([0-9]{12}|[0-9]{11}[0-9A-Z])$/ },
        { name: 'Lazada Express (LEX)', regex: /^\d{9}-\d{4}$|^[A-Z]{4}\d{14}$|^[A-Z]{4}-\d{9}-\d{4}$/ },
    ];

    // Authorization Check
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
        if (user?.sellerId) {
            fetchOrders();
        }
    }, [user]);

    const handleUpdateStatus = async (status: string, extraData: any = {}, orderOverrides?: Order[]) => {
        const targets = orderOverrides || (selectedOrder ? [selectedOrder] : []);
        if (targets.length === 0) return false;

        try {
            setSubmitting(true);

            // Sequential update for MVP (Ideal: Bulk API)
            await Promise.all(targets.map(async (order) => {
                const res = await sellerOrdersAPI.updateOrderStatus(order.uid, { status, message, ...extraData });
                const data = res.data;
                if (data.success) {
                    setOrders(prev => prev.map(o => o.uid === order.uid ? { ...o, ...data.order } : o));
                }
            }));

            Alert.alert("Success", targets.length > 1 ? "Bulk update completed" : `Order updated to ${status}`);

            // Close all modals and reset selection
            setShipModalVisible(false);
            setAcceptModalVisible(false);
            setRejectModalVisible(false);
            setSelectedOrder(null);
            setSelectionMode(false);
            setSelectedIds(new Set());
            return true;
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message || "Something went wrong.");
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    const isLate = (order: Order) => {
        if (['SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) return false;
        const uploadedTime = new Date(order.uploaded).getTime();
        const now = Date.now();
        // If > 3 days and still not shipped
        return (now - uploadedTime) > (LATE_THRESHOLD_DAYS * ONE_DAY_MS);
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
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>SKU</th>
                                    </tr>
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
        // Only allow if logic permits (e.g. must be IN_PRODUCTION)
        // For MVP, just try to update all valid ones
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

    const openModal = (order: Order, type: 'ship' | 'accept' | 'reject') => {
        setSelectedOrder(order);
        setMessage('');
        setErrors({}); // Reset errors on open
        if (type === 'ship') {
            setTrackingNumber('');
            setCourierName('');
            setShippingMethod('TRACKED');
            setItemPhoto(null);
            setPackagePhoto(null);
            setReceiptPhoto(null);
            setShipModalVisible(true);
        } else if (type === 'accept') {
            // Default 7 days from now
            const d = new Date();
            d.setDate(d.getDate() + 7);
            setEstimatedDate(d.toISOString().split('T')[0]);
            setAcceptModalVisible(true);
        } else if (type === 'reject') {
            setRejectionReason('');
            setRejectModalVisible(true);
        }
    };

    const pickImage = async (setter: (uri: string) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const detectCourier = (text: string) => {
        setTrackingNumber(text);
        if (errors.trackingNumber) setErrors(prev => ({ ...prev, trackingNumber: false }));

        const match = COURIER_PATTERNS.find(c => c.regex.test(text));
        if (match) {
            setCourierName(match.name);
        }
    };

    const handleScanWaybill = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                base64: true
            });

            if (result.canceled) return;

            setScanning(true);
            const uri = result.assets[0].uri;

            // 1. Upload to ImageKit
            const uploadRes = await uploadToImageKit({ uri, name: `scan_${Date.now()}` });

            // 2. Call Backend OCR
            const res = await servicesAPI.ocr(uploadRes.url);

            const data = res.data;
            if (!data.success) throw new Error("OCR Failed");

            // 3. Extract Tracking Number from Text
            // Remove spaces/newlines for simpler regex matching on the whole block
            const cleanText = data.text.replace(/[\s-]/g, '');

            // We'll search the raw (but cleaned) text for our known patterns
            // This is a heuristic. We iterate patterns.
            let found = null;
            let detectedCourier = '';

            for (const courier of COURIER_PATTERNS) {
                // Create a global version of the regex to find matches in the big string
                // Note: The original regexes have ^ and $ anchors which we need to remove for searching inside text
                const source = courier.regex.source.replace('^', '').replace('$', '');
                const re = new RegExp(source, 'i'); // Case insensitive search
                const match = cleanText.match(re);
                if (match) {
                    found = match[0];
                    detectedCourier = courier.name;
                    break;
                }
            }

            if (found) {
                setTrackingNumber(found);
                setCourierName(detectedCourier);
                Alert.alert("Scanned!", `Detected ${detectedCourier}: ${found}`);
            } else {
                Alert.alert("No Match", "Could not find a valid tracking number in the image.");
                // console.log("OCR Text:", data.text); // Debug
            }

        } catch (error: any) {
            let errorMsg = "Failed to process image.";
            if (error.message && error.message.includes("OCR Failed")) {
                errorMsg = "Ensure the image is clear and contains readable text.";
            } else if (error.message && error.message.includes("Network")) {
                errorMsg = "Network error. Please check your internet connection.";
            }
            Alert.alert("Scan Failed", `We couldn't read the tracking number.\n\n${errorMsg}`);
            console.error("Scan Error:", error);
        } finally {
            setScanning(false);
        }
    };

    const handleShipSubmit = async () => {
        // Validation
        const newErrors: Record<string, boolean> = {};
        if (!itemPhoto) newErrors.itemPhoto = true;
        if (!packagePhoto) newErrors.packagePhoto = true;

        if (shippingMethod === 'TRACKED' && !trackingNumber) newErrors.trackingNumber = true;
        if (shippingMethod === 'UNTRACKED' && !receiptPhoto) newErrors.receiptPhoto = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert("Missing Fields", "Please correct the highlighted fields.");
            return;
        }

        try {
            setSubmitting(true);
            setErrors({}); // Clear errors

            // Upload Photos
            const itemRes = await uploadToImageKit({ uri: itemPhoto!, name: `item_${selectedOrder?.uid}` });
            const pkgRes = await uploadToImageKit({ uri: packagePhoto!, name: `pkg_${selectedOrder?.uid}` });

            const proofPhotos = [itemRes.url, pkgRes.url];

            if (receiptPhoto) {
                const receiptRes = await uploadToImageKit({ uri: receiptPhoto, name: `receipt_${selectedOrder?.uid}` });
                proofPhotos.push(receiptRes.url);
            }

            // Call API
            const success = await handleUpdateStatus('SHIPPED', {
                shippingMethod,
                proofPhotos: JSON.stringify(proofPhotos),
                trackingNumber: shippingMethod === 'TRACKED' ? trackingNumber : null,
                courierName
            });

            // handleUpdateStatus handles success UI (closing modal etc)
            // If failed, it alerts. We just need to stop submitting.
            if (!success) setSubmitting(false);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to upload photos or update order.");
            setSubmitting(false); // Only reset if error, success resets explicitly
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return '#F59E0B'; // Amber
            case 'CONFIRMED': return '#3B82F6'; // Blue
            case 'IN_PRODUCTION': return '#8B5CF6'; // Purple
            case 'READY_TO_SHIP': return '#EC4899'; // Pink
            case 'SHIPPED': return '#10B981'; // Green
            case 'DELIVERED': return '#059669'; // Emerald
            case 'COMPLETED': return '#059669'; // Emerald
            case 'CANCELLED': return '#EF4444'; // Red
            case 'DISPUTED': return '#DC2626'; // Red
            default: return 'gray';
        }
    };

    const renderOrderActions = (item: Order) => {
        switch (item.status) {
            case 'PENDING':
                return (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => openModal(item, 'reject')}>
                            <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => openModal(item, 'accept')}>
                            <Text style={styles.primaryBtnText}>Accept Order</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'CONFIRMED':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => handleUpdateStatus('IN_PRODUCTION', {}, [item])}>
                        <Text style={styles.primaryBtnText}>Start Production</Text>
                    </TouchableOpacity>
                );
            case 'IN_PRODUCTION':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => handleUpdateStatus('READY_TO_SHIP', {}, [item])}>
                        <Text style={styles.primaryBtnText}>Mark Ready to Ship</Text>
                    </TouchableOpacity>
                );
            case 'READY_TO_SHIP':
                return (
                    <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={() => openModal(item, 'ship')}>
                        <Text style={styles.primaryBtnText}>Ship Order</Text>
                    </TouchableOpacity>
                );
            default:
                return null;
        }
    };

    const renderOrder = ({ item }: { item: Order }) => {
        const late = isLate(item);
        const isSelected = selectedIds.has(item.uid);

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => toggleSelection(item.uid)}
                onPress={() => selectionMode ? toggleSelection(item.uid) : null}
                style={[styles.card, isSelected && styles.cardSelected, late && styles.cardLate]}
            >
                {/* Selection Overlay */}
                {selectionMode && (
                    <View style={styles.checkboxOverlay}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                        </View>
                    </View>
                )}

                {late && (
                    <View style={styles.lateBadge}>
                        <Ionicons name="alarm" size={14} color="#B91C1C" />
                        <Text style={styles.lateText}>Late Shipment</Text>
                    </View>
                )}

                <View style={styles.header}>
                    <View>
                        <Text style={styles.orderId}>Order #{item.uid}</Text>
                        <Text style={styles.date}>{new Date(item.uploaded).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.replace(/_/g, ' ')}</Text>
                    </View>
                </View>

                <View style={styles.customerInfo}>
                    <Text style={styles.customerConfig}>Customer: {item.customer.name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subText}>Subtotal: ₱{Number(item.subtotal || item.total).toFixed(2)}</Text>
                        <Text style={[styles.subText, { color: '#EF4444' }]}>Platform Fee (5%): -₱{Number(item.platformFee || 0).toFixed(2)}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.earningsText}>Earnings: ₱{Number(item.sellerEarnings || item.total).toFixed(2)}</Text>
                    </View>
                </View>

                {/* Escrow Note for Pending/Confirmed */}
                {['PENDING', 'CONFIRMED', 'IN_PRODUCTION'].includes(item.status) && (
                    <View style={styles.escrowNote}>
                        <Text style={styles.escrowText}>🔒 Payment held in Escrow</Text>
                    </View>
                )}

                <View style={styles.itemsList}>
                    {item.items.map(orderItem => (
                        <View key={orderItem.uid} style={styles.itemRow}>
                            {orderItem.product.image && <Image source={{ uri: orderItem.product.image }} style={styles.image} />}
                            <View style={styles.itemDetails}>
                                <Text style={styles.productName}>{orderItem.product.name}</Text>
                                <Text style={styles.qtyText}>Qty: {orderItem.quantity} x ₱{Number(orderItem.price).toFixed(2)}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {!selectionMode && (
                    <View style={styles.actions}>
                        {renderOrderActions(item)}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Seller Orders" }} />
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <Text style={styles.pageTitle}>Orders</Text>
                    <TouchableOpacity onPress={() => router.push('/seller-dashboard/products' as any)} style={styles.navBtn}>
                        <Text style={styles.navBtnText}>Manage Products</Text>
                        <ChevronRight size={16} color={P} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={item => String(item.uid)}
                        renderItem={renderOrder}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
                    />
                )}
            </View>

            {/* Bulk Action Bar */}
            {selectionMode && (
                <View style={styles.bulkBar}>
                    <Text style={styles.bulkCount}>{selectedIds.size} Selected</Text>
                    <View style={styles.bulkActions}>
                        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkPrint}>
                            <Ionicons name="print" size={20} color="#374151" />
                            <Text style={styles.bulkBtnText}>Print</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkReady}>
                            <Ionicons name="cube" size={20} color="#10B981" />
                            <Text style={[styles.bulkBtnText, { color: '#10B981' }]}>Ship</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkBtn} onPress={() => { setSelectedIds(new Set()); setSelectionMode(false); }}>
                            <Ionicons name="close" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Ship Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={shipModalVisible}
                onRequestClose={() => setShipModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Ship Order #{selectedOrder?.uid}</Text>

                            {/* Step 1: Proof Photos */}
                            <Text style={styles.sectionTitle}>1. Proof Photos *</Text>
                            <View style={styles.photoRow}>
                                <TouchableOpacity style={[styles.photoBox, errors.itemPhoto && styles.photoBoxError]} onPress={() => pickImage(setItemPhoto)}>
                                    {itemPhoto ? (
                                        <Image source={{ uri: itemPhoto }} style={styles.photoPreview} />
                                    ) : (
                                        <View style={styles.photoPlaceholder}>
                                            <Text style={styles.photoLabel}>Item Photo</Text>
                                            <Text style={styles.photoSub}>Can reuse listing info</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.photoBox, errors.packagePhoto && styles.photoBoxError]} onPress={() => pickImage(setPackagePhoto)}>
                                    {packagePhoto ? (
                                        <Image source={{ uri: packagePhoto }} style={styles.photoPreview} />
                                    ) : (
                                        <View style={styles.photoPlaceholder}>
                                            <Text style={styles.photoLabel}>Package Photo</Text>
                                            <Text style={styles.photoSub}>With Order # visible</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.photoAddPlaceholder}>
                                    <Text style={{ fontSize: 24, color: '#B36979' }}>+</Text>
                                    <Text style={styles.photoAddText}>Add Image</Text>
                                    <Text style={styles.photoAddHint}>or drag & drop</Text>
                                </View>
                            </View>

                            {/* Step 2: Method */}
                            <Text style={styles.sectionTitle}>2. Shipping Method</Text>
                            <View style={styles.methodRow}>
                                <TouchableOpacity
                                    style={[styles.methodBtn, shippingMethod === 'TRACKED' && styles.methodBtnActive]}
                                    onPress={() => setShippingMethod('TRACKED')}
                                >
                                    <View>
                                        <Text style={[styles.methodText, shippingMethod === 'TRACKED' && styles.methodTextActive]}>Standard Courier</Text>
                                        <Text style={styles.methodSub}>J&T, Flash, Ninja Van, GoGo</Text>
                                        <Text style={styles.methodBadge}>14 Days Guarantee</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.methodBtn, shippingMethod === 'UNTRACKED' && styles.methodBtnActive]}
                                    onPress={() => setShippingMethod('UNTRACKED')}
                                >
                                    <View>
                                        <Text style={[styles.methodText, shippingMethod === 'UNTRACKED' && styles.methodTextActive]}>Manual / Other</Text>
                                        <Text style={styles.methodSub}>PhilPost, Meet-up, Personal</Text>
                                        <Text style={styles.methodBadge}>7 Days Guarantee</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Step 3: Details */}
                            <Text style={styles.sectionTitle}>3. Shipping Details</Text>

                            {shippingMethod === 'TRACKED' ? (
                                <>
                                    <Text style={styles.label}>Tracking / Waybill Number *</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, width: '100%' }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginBottom: 0 }, errors.trackingNumber && styles.inputError]}
                                            placeholder="Enter Tracking ID (e.g. PH0912...)"
                                            placeholderTextColor="#AAA"
                                            value={trackingNumber}
                                            onChangeText={detectCourier}
                                        />
                                        {/* OCR Scanner on hold for later iteration
                                        <TouchableOpacity
                                            style={[styles.scanBtn, { marginLeft: 8 }, scanning && { opacity: 0.7 }]}
                                            onPress={handleScanWaybill}
                                            disabled={scanning}
                                        >
                                            {scanning ? (
                                                <ActivityIndicator color="white" size="small" />
                                            ) : (
                                                <Ionicons name="camera" size={24} color="white" />
                                            )}
                                        </TouchableOpacity>
                                        */}
                                    </View>
                                    <Text style={styles.label}>Courier Name (Optional)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Flash Express, J&T"
                                        placeholderTextColor="#AAA"
                                        value={courierName}
                                        onChangeText={setCourierName}
                                    />
                                    <View style={styles.infoBox}>
                                        <Text style={styles.infoText}>💡 Order will auto-complete in <Text style={{ fontWeight: 'bold' }}>14 days</Text> to give time for delivery.</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.label}>Proof of Handover / Receipt *</Text>
                                    <TouchableOpacity style={[styles.photoBoxFull, errors.receiptPhoto && styles.photoBoxError]} onPress={() => pickImage(setReceiptPhoto)}>
                                        {receiptPhoto ? (
                                            <Image source={{ uri: receiptPhoto }} style={styles.photoPreview} />
                                        ) : (
                                            <View style={styles.photoPlaceholder}>
                                                <Text style={styles.photoLabel}>Upload Photo of Receipt or Item with Buyer</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
                                        <Text style={[styles.infoText, { color: '#92400E' }]}>⚠️ Order will auto-complete in <Text style={{ fontWeight: 'bold' }}>7 days</Text> since there is no online tracking.</Text>
                                    </View>
                                </>
                            )}

                            <Text style={styles.label}>Message (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Any notes for the customer?"
                                placeholderTextColor="#AAA"
                                value={message}
                                onChangeText={setMessage}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShipModalVisible(false)}>
                                    <Text style={styles.btnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
                                    onPress={handleShipSubmit}
                                    disabled={submitting}
                                >
                                    <Text style={styles.confirmBtnText}>{submitting ? "Processing..." : "Confirm Shipping"}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Accept Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={acceptModalVisible}
                onRequestClose={() => setAcceptModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Accept Order #{selectedOrder?.uid}</Text>
                        <Text style={styles.subTitle}>When will this be ready?</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#AAA"
                            value={estimatedDate}
                            onChangeText={setEstimatedDate}
                        />

                        <Text style={styles.label}>Message (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Thanks! Will start soon."
                            placeholderTextColor="#AAA"
                            value={message}
                            onChangeText={setMessage}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAcceptModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
                                onPress={() => handleUpdateStatus('CONFIRMED', { estimatedCompletionDate: estimatedDate })}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>Confirm & Accept</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={rejectModalVisible}
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: '#EF4444' }]}>Reject Order #{selectedOrder?.uid}</Text>

                        <Text style={styles.label}>Reason for rejection *</Text>
                        <TextInput
                            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="e.g. Out of stock, Cannot fulfill timeline..."
                            multiline
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: '#EF4444' }, submitting && { opacity: 0.7 }]}
                                onPress={() => handleUpdateStatus('CANCELLED', { rejectionReason })}
                                disabled={submitting}
                            >
                                <Text style={styles.confirmBtnText}>Reject Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    pageTitle: { fontSize: 24, fontWeight: 'bold', color: TEXT, fontFamily: 'Quicksand' },
    
    list: { padding: 20 },
    empty: { textAlign: 'center', marginTop: 20, color: SUB, fontFamily: 'Quicksand' },
    card: {
        backgroundColor: CARD,
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: BORDER
    },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'flex-start' },
    orderId: { fontWeight: '700', fontSize: 16, color: TEXT, fontFamily: 'Quicksand' },
    date: { color: SUB, fontSize: 13, marginTop: 2, fontFamily: 'Quicksand' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontWeight: '700', fontSize: 12 },

    customerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 12 },
    customerConfig: { color: SUB, fontSize: 14, fontFamily: 'Quicksand' },
    totalAmount: { fontWeight: '700', fontSize: 15, color: TEXT, fontFamily: 'Quicksand' },

    escrowNote: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
    escrowText: { fontSize: 12, color: '#92400E', fontWeight: '600', fontFamily: 'Quicksand' },

    itemsList: { marginBottom: 16 },
    itemRow: { flexDirection: 'row', marginBottom: 12 },
    image: { width: 48, height: 48, borderRadius: 12, marginRight: 12, backgroundColor: BG },
    itemDetails: { flex: 1, justifyContent: 'center' },
    productName: { fontWeight: '600', fontSize: 14, color: TEXT, marginBottom: 2, fontFamily: 'Quicksand' },
    qtyText: { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },

    // Financial Styles
    subText: { fontSize: 12, color: SUB, marginBottom: 2, fontFamily: 'Quicksand' },
    earningsText: { fontSize: 14, fontWeight: '700', color: GREEN, marginTop: 2, fontFamily: 'Quicksand' },
    divider: { height: 1, backgroundColor: BORDER, width: '100%', marginVertical: 4 },

    actions: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16, alignItems: 'flex-end' },
    actionRow: { flexDirection: 'row', gap: 12 },
    btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, minWidth: 100, alignItems: 'center' },
    primaryBtn: { backgroundColor: P },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    rejectBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: RED },
    rejectBtnText: { color: RED, fontWeight: '600', fontSize: 14, fontFamily: 'Quicksand' },

    navBtn: { marginRight: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
    navBtnText: { color: TEXT, fontWeight: '600', fontFamily: 'Quicksand' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: CARD, width: '90%', maxWidth: 1000, maxHeight: '90%', padding: 32, borderRadius: 24, elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: TEXT, fontFamily: 'Quicksand' },
    subTitle: { fontSize: 14, color: SUB, marginBottom: 20, fontFamily: 'Quicksand' },

    // Matched styles from ProductFormWizard
    label: { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand', marginBottom: 8 },
    input: { borderWidth: 2, borderColor: BORDER, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: BG, color: TEXT, fontFamily: 'Quicksand', marginBottom: 24, outlineStyle: 'none' as any },
    inputError: { borderColor: RED, backgroundColor: P_LIGHT },
    scanBtn: { backgroundColor: P, padding: 14, borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center', width: 50 },

    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 32 },
    cancelBtn: { padding: 14, borderRadius: 12, justifyContent: 'center' },
    confirmBtn: { backgroundColor: P, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16, justifyContent: 'center' },
    btnText: { color: SUB, fontWeight: '700', fontFamily: 'Quicksand' },
    confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15, fontFamily: 'Quicksand' },

    // Legacy mapping (keep just to be safe if reused)
    trackingInfo: { backgroundColor: BG, padding: 8, borderRadius: 8, marginBottom: 12 },
    trackingLabel: { fontSize: 12, color: SUB, marginBottom: 2 },
    trackingText: { fontWeight: '600', color: TEXT },

    // New Styles for Revamped Modal
    sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginTop: 20, marginBottom: 12, fontFamily: 'Quicksand' },
    photoRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    photoBox: { width: 250, height: 250, backgroundColor: BG, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
    photoBoxError: { borderColor: RED, backgroundColor: P_LIGHT },

    photoBoxFull: { width: '40%', height: 250, backgroundColor: BG, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginHorizontal: 'auto', },

    // Placeholder style from ImageUploader
    photoAddPlaceholder: { width: 250, height: 250, borderRadius: 16, borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: BG, gap: 6 },
    photoAddText: { fontSize: 13, color: P, fontWeight: '600', fontFamily: 'Quicksand' },
    photoAddHint: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },

    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center', padding: 8 },
    photoLabel: { fontSize: 13, fontWeight: '600', color: TEXT, textAlign: 'center', opacity: 0.6 },
    photoSub: { fontSize: 11, color: SUB, textAlign: 'center', opacity: 0.5 },

    methodRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    methodBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: BORDER, alignItems: 'flex-start', backgroundColor: CARD },
    methodBtnActive: { backgroundColor: P_LIGHT, borderColor: P },
    methodText: { fontSize: 14, color: TEXT, fontWeight: '600', marginBottom: 2, fontFamily: 'Quicksand' },
    methodTextActive: { color: P },
    methodSub: { fontSize: 11, color: SUB, marginBottom: 6, fontFamily: 'Quicksand' },
    methodBadge: { fontSize: 10, color: SUB, backgroundColor: BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, overflow: 'hidden', fontFamily: 'Quicksand' },

    infoBox: { padding: 12, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', marginTop: 4, marginBottom: 8, },
    infoText: { fontSize: 13, color: '#1E40AF', fontFamily: 'Quicksand' },

    // Late & Selection Styles
    cardLate: {
        borderLeftWidth: 4,
        borderLeftColor: RED,
    },
    cardSelected: {
        borderColor: P,
        borderWidth: 2,
        backgroundColor: P_LIGHT
    },
    lateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
        backgroundColor: P_LIGHT,
        padding: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    lateText: {
        fontSize: 12,
        color: RED,
        fontWeight: 'bold',
        fontFamily: 'Quicksand'
    },
    checkboxOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: P,
        backgroundColor: CARD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: P,
    },
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
