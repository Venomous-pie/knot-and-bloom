import { orderAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStatusColor,
  getStatusBgColor,
  getStatusLabel,
} from "@/utils/orderStatus";
import {
  RelativePathString,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  Linking,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

interface OrderDetail {
  uid: number;
  customerId: number;
  total: string;
  products: string; // JSON string: { product: Product, quantity: number, variant?: string }[]
  uploaded: string;
  discount?: string;
  status: string;
  trackingNumber?: string | null;
  courierName?: string | null;
  shippedAt?: string | null;
  estimatedCompletionDate?: string | null;
  estimatedDeliveryDate?: string | null;
  rejectionReason?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  // New fields for Guarantee
  autoConfirmAt?: string | null;
  extensionCount?: number;
  reminderStage?: number;
  disputeStartedAt?: string | null;
  shippingMethod?: string | null;
  proofPhotos?: string | null; // JSON string
  shippingAddressSnapshot?: string | null; // JSON string
  referenceNumber?: string;
  subtotal?: string; // Product subtotal from backend
  shippingFee?: string; // Shipping fee from backend (0 for free shipping)
  timeline: {
    uid: number;
    status: string;
    title: string;
    message: string | null;
    createdAt: string;
  }[];
  progressImages?: string[];
}

interface OrderItemSnapshot {
  product: {
    uid: number;
    name: string;
    image: string | null;
    // Legacy support
    basePrice?: string | number;
    discountedPrice?: string | number;
    seller?: { name: string } | null;
  };
  quantity: number;
  unitPrice?: number; // Snapshot price
  finalPrice?: number; // Snapshot final price
  discountPercentage?: number;
  variant?: string | { uid: number; name: string } | null;
}

import { useSocketContext } from "@/contexts/SocketContext";

export default function OrderDetailsPage() {
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { on } = useSocketContext();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemSnapshot[]>([]);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login" as RelativePathString);
    } else if (user && id) {
      fetchOrder();
    }
  }, [user, id, authLoading]);

  // Real-time Status Updates
  useEffect(() => {
    if (!order) return;

    const handleStatusUpdate = (data: any) => {
      if (data.orderId === order.uid) {
        // Refresh full order details to get latest timeline, status, etc.
        fetchOrder();
        // Optionally show a toast here
      }
    };

    const unsubscribe = on("order_timeline_created", handleStatusUpdate);

    return () => {
      unsubscribe();
    };
  }, [on, order?.uid]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getOrderById(id as string);
      const orderData = response.data;
      setOrder(orderData);

      // Parse products JSON
      try {
        const parsedProducts = JSON.parse(orderData.products);
        setOrderItems(Array.isArray(parsedProducts) ? parsedProducts : []);
      } catch (e) {
        console.error("Failed to parse order items", e);
        setOrderItems([]);
      }

      // Parse Shipping Snapshot
      try {
        if (orderData.shippingAddressSnapshot) {
          setShippingAddress(JSON.parse(orderData.shippingAddressSnapshot));
        }
      } catch (e) {
        console.error("Failed to parse shipping snapshot", e);
      }
    } catch (error) {
      console.error("Failed to fetch order details", error);
      Alert.alert("Error", "Failed to load order details");
      router.navigate("/profile" as RelativePathString);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = () => {
    const title = "Confirm Receipt";
    const message =
      "Are you sure you have received this order and are satisfied? This will release payment to the seller.";

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        performConfirmReceipt();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm Received", onPress: performConfirmReceipt },
      ]);
    }
  };

  const performConfirmReceipt = async () => {
    try {
      setActionLoading(true);
      await orderAPI.updateStatus(order!.uid, "COMPLETED");
      if (Platform.OS === "web") {
        window.alert("Success: Order completed!");
      } else {
        Alert.alert("Success", "Order completed!");
      }
      fetchOrder();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "Failed to confirm receipt";
      if (Platform.OS === "web") window.alert(`Error: ${errMsg}`);
      else Alert.alert("Error", errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendGuarantee = () => {
    const title = "Extend Guarantee";
    const message =
      "Need more time? You can extend the guarantee period by 7 days.";

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        performExtendGuarantee();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Extend (+7 Days)", onPress: performExtendGuarantee },
      ]);
    }
  };

  const performExtendGuarantee = async () => {
    try {
      setActionLoading(true);
      await orderAPI.extendOrderGuarantee(order!.uid);
      if (Platform.OS === "web") {
        window.alert("Success: Guarantee extended!");
      } else {
        Alert.alert("Success", "Guarantee extended!");
      }
      fetchOrder();
    } catch (error: any) {
      const errMsg =
        error.response?.data?.error || "Failed to extend guarantee";
      if (Platform.OS === "web") window.alert(`Error: ${errMsg}`);
      else Alert.alert("Error", errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!disputeReason.trim()) {
      Alert.alert("Required", "Please provide a reason for the dispute.");
      return;
    }
    try {
      setActionLoading(true);
      await orderAPI.updateStatus(order!.uid, "DISPUTED", {
        message: disputeReason,
      });
      setReportModalVisible(false);
      if (Platform.OS === "web") {
        window.alert("Dispute Filed: Timer Paused.");
      } else {
        Alert.alert(
          "Dispute Filed",
          "The order timer has been paused while we resolve this.",
        );
      }
      fetchOrder();
    } catch (error: any) {
      const errMsg = error.response?.data?.error || "Failed to file dispute";
      Alert.alert("Error", errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primaryLight} />
      </View>
    );
  }

  if (!order) return null;

  // Use shared status color utilities (imported at top)

  const maxExtensions = order.status === "SHIPPED" ? 2 : 1;
  const canExtend =
    (order.status === "SHIPPED" || order.status === "DELIVERED") &&
    order.autoConfirmAt &&
    (order.extensionCount || 0) < maxExtensions;

  // Use actual shipping fee from order, fallback to 0 for legacy orders without the field
  const shippingFee = order.shippingFee ? parseFloat(order.shippingFee) : 0;
  // Use subtotal from order if available, otherwise calculate from total minus shipping
  const subtotal = order.subtotal
    ? parseFloat(order.subtotal)
    : parseFloat(order.total);
  const totalAmount = subtotal + shippingFee;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.navigate("/profile" as RelativePathString)}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back to Orders</Text>
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>
            Order #{order.referenceNumber || order.uid}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(order.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(order.status) },
              ]}
            >
              {order.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>
        <Text style={styles.date}>
          Placed on {new Date(order.uploaded).toLocaleDateString()} at{" "}
          {new Date(order.uploaded).toLocaleTimeString()}
        </Text>

        {/* Latest Status/Timeline Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Status</Text>

          {/* Guarantee / Auto Validation Section */}
          {(order.status === "SHIPPED" ||
            order.status === "DELIVERED" ||
            order.status === "DISPUTED") && (
              <View
                style={[
                  styles.infoBanner,
                  {
                    backgroundColor:
                      order.status === "DISPUTED" ? "#FEE2E2" : "#F0F9FF",
                    borderColor:
                      order.status === "DISPUTED" ? "#FECACA" : "#BAE6FD",
                    marginBottom: 20,
                  },
                ]}
              >
                {order.status === "DISPUTED" ? (
                  <>
                    <Text style={[styles.infoBannerTitle, { color: "#B91C1C" }]}>
                      🛑 Timer Paused
                    </Text>
                    <Text style={{ color: "#7F1D1D", marginBottom: 4 }}>
                      This order is currently under dispute. The auto-confirmation
                      timer is paused.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.infoBannerText,
                        { color: "#0369A1", marginBottom: 6 },
                      ]}
                    >
                      🛡️ Knot & Bloom Guarantee
                    </Text>
                    {order.autoConfirmAt && (
                      <Text style={{ color: "#0C4A6E", marginBottom: 12 }}>
                        Order will automatically complete on:{" "}
                        <Text style={{ fontWeight: "bold" }}>
                          {new Date(order.autoConfirmAt).toLocaleDateString()}{" "}
                          {new Date(order.autoConfirmAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </Text>
                    )}

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={handleConfirmReceipt}
                        disabled={actionLoading}
                        style={[
                          styles.actionButton,
                          { backgroundColor: "#059669", flex: 2 },
                        ]}
                      >
                        {actionLoading ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text style={styles.actionButtonText}>
                            Order Received
                          </Text>
                        )}
                      </Pressable>

                      {canExtend && (
                        <Pressable
                          onPress={handleExtendGuarantee}
                          disabled={actionLoading}
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor: "white",
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                              flex: 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: theme.colors.text },
                            ]}
                          >
                            Extend
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Dispute & Receipt Actions */}
                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 10 }}
                    >
                      <Pressable
                        onPress={() => setReportModalVisible(true)}
                        style={[styles.textBtn]}
                      >
                        <Text style={styles.textBtnText}>Report Issue</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setReceiptModalVisible(true)}
                        style={[styles.textBtn]}
                      >
                        <Text style={[styles.textBtnText, { color: "#3B82F6" }]}>
                          View Receipt
                        </Text>
                      </Pressable>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        Extensions used: {order.extensionCount || 0} (Max:{" "}
                        {order.status === "SHIPPED" ? 2 : 1})
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

          {/* Key Info Banner */}
          {order.status === "CONFIRMED" && order.estimatedCompletionDate && (
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" },
              ]}
            >
              <Text style={[styles.infoBannerText, { color: "#0369A1" }]}>
                🗓️ Estimated Completion:{" "}
                {new Date(order.estimatedCompletionDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {order.estimatedDeliveryDate && (
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD", marginTop: order.status === "CONFIRMED" && order.estimatedCompletionDate ? 10 : 0 },
              ]}
            >
              <Text style={[styles.infoBannerText, { color: "#0369A1" }]}>
                🚚 Estimated Delivery:{" "}
                {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
              </Text>
            </View>
          )}
          {order.status === "CANCELLED" && order.rejectionReason && (
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
              ]}
            >
              <Text style={[styles.infoBannerTitle, { color: "#B91C1C" }]}>
                Cancellation Reason:
              </Text>
              <Text style={{ color: "#7F1D1D" }}>{order.rejectionReason}</Text>
            </View>
          )}

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {order.timeline && order.timeline.length > 0 ? (
              order.timeline.map((event, index) => (
                <View key={event.uid} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.dot,
                        index === 0
                          ? {
                            backgroundColor: getStatusColor(event.status),
                            width: 12,
                            height: 12,
                          }
                          : {},
                      ]}
                    />
                    {index !== order.timeline.length - 1 && (
                      <View style={styles.line} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTitle,
                        index === 0 && { color: "#111", fontWeight: "bold" },
                      ]}
                    >
                      {event.title}
                    </Text>
                    {event.message && (
                      <Text style={styles.timelineMessage}>
                        {event.message}
                      </Text>
                    )}
                    <Text style={styles.timelineDate}>
                      {new Date(event.createdAt).toLocaleDateString()} •{" "}
                      {new Date(event.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontStyle: "italic",
                }}
              >
                No timeline updates yet.
              </Text>
            )}
          </View>
        </View>

        {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Courier:</Text>
              <Text style={styles.infoValue}>
                {order.courierName || "Standard Shipping"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Method:</Text>
              <Text style={styles.infoValue}>
                {order.shippingMethod || "Standard"}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tracking #:</Text>
              <Text style={styles.infoValue}>
                {order.trackingNumber || "Un-tracked"}
              </Text>
            </View>
            {order.shippedAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shipped On:</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.shippedAt).toLocaleDateString()}
                </Text>
              </View>
            )}
            {order.status === "SHIPPED" && (
              <Text style={styles.helpText}>
                You can use this tracking number on the courier's website to
                track your package.
              </Text>
            )}
          </View>
        )}

        {order.progressImages && order.progressImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Production Updates</Text>
            <Text style={styles.helpText}>
              Your seller has uploaded these photos to show you the progress of your handmade items.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 12 }}>
              {order.progressImages.map((uri, idx) => (
                <View key={idx} style={{ width: 140, height: 140, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border }}>
                  <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.itemsList}>
            {orderItems.map((item, index) => {
              // Determine price: prefer snapshot finalPrice, then unitPrice, then product current price fallback
              const price =
                item.finalPrice ??
                item.unitPrice ??
                item.product.discountedPrice ??
                item.product.basePrice ??
                0;

              return (
                <Pressable
                  key={index}
                  style={styles.itemCard}
                  onPress={() =>
                    router.push(
                      `/product/${item.product.uid}` as RelativePathString,
                    )
                  }
                >
                  {item.product.image && (
                    <Image
                      source={{ uri: item.product.image }}
                      style={styles.itemImage}
                    />
                  )}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <View style={styles.itemMeta}>
                      {item.variant && (
                        <Text style={styles.variantText}>
                          Variant:{" "}
                          {typeof item.variant === "string"
                            ? item.variant
                            : (item.variant as any).name || "Default"}
                        </Text>
                      )}
                      <Text style={styles.quantityText}>
                        Qty: {item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      ₱{parseFloat(String(price)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                      <Text style={{ color: theme.colors.textLight }}>
                        x {item.quantity}
                      </Text>
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          {order.discount && parseFloat(order.discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>-₱{parseFloat(order.discount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping Fee</Text>
            <Text
              style={[
                styles.summaryValue,
                shippingFee === 0 && { color: "#059669", fontWeight: "600" },
              ]}
            >
              {shippingFee === 0 ? "Free" : `₱${shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              {
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={
                order.paymentMethod &&
                  order.paymentMethod.toUpperCase() !== "COD"
                  ? [styles.totalLabel, { color: theme.colors.text }]
                  : styles.summaryLabel
              }
            >
              Order Total
            </Text>
            <Text
              style={
                order.paymentMethod &&
                  order.paymentMethod.toUpperCase() !== "COD"
                  ? [styles.totalValue, { color: theme.colors.primary }]
                  : styles.summaryValue
              }
            >
              ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          {order.paymentStatus === "PARTIALLY_PAID" && (
            <>
              <View style={styles.summaryRow}>
                <Text
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Less: Deposit Paid (20%)
                </Text>
                <Text style={[styles.summaryValue, { color: "#dd1537ff" }]}>
                  -₱{(totalAmount * 0.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryRow,
                  {
                    marginTop: 4,
                    paddingTop: 4,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.totalLabel, { color: theme.colors.text }]}>
                  Balance Due
                </Text>
                <Text
                  style={[styles.totalValue, { color: theme.colors.primary }]}
                >
                  ₱{(totalAmount * 0.8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </>
          )}

          {/* Payment Status Info */}
          <View
            style={{
              marginTop: 12,
              backgroundColor: theme.colors.background,
              padding: 12,
              borderRadius: 8,
            }}
          >
            <View style={[styles.summaryRow, { marginBottom: 4 }]}>
              <Text style={styles.summaryLabel}>Payment Method:</Text>
              <Text style={[styles.summaryValue, { fontWeight: "600" }]}>
                {order.paymentMethod || "N/A"}
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginBottom: 0 }]}>
              <Text style={styles.summaryLabel}>Status:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color:
                      order.paymentStatus === "PARTIALLY_PAID"
                        ? theme.colors.primary
                        : "#059669",
                  },
                ]}
              >
                {order.paymentStatus?.replace(/_/g, " ") || "PENDING"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Details</Text>
          {shippingAddress ? (
            <>
              <Text
                style={[
                  styles.addressText,
                  { fontWeight: "600", color: theme.colors.text },
                ]}
              >
                {shippingAddress.fullName}
              </Text>
              <Text style={styles.addressText}>{shippingAddress.address}</Text>
              <Text style={styles.addressText}>
                {shippingAddress.city}, {shippingAddress.postalCode}
              </Text>
              <Text style={styles.addressText}>{shippingAddress.phone}</Text>
              <View
                style={{
                  marginTop: 8,
                  padding: 8,
                  backgroundColor: theme.colors.background,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                    fontStyle: "italic",
                  }}
                >
                  Note: {(!shippingAddress.notes || shippingAddress.notes === "{}" || String(shippingAddress.notes).trim() === "") ? "No notes" : shippingAddress.notes}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.addressText}>{user?.name}</Text>
              <Text style={styles.addressText}>
                {user?.address || "Address not recorded"}
              </Text>
              <Text style={styles.addressText}>{user?.phone}</Text>
              <Text style={styles.addressText}>{user?.email}</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textLight,
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                {user?.address
                  ? "(Current Profile Address)"
                  : "(Shipping address unavailable)"}
              </Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Report Issue Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.reportModalTitle, { color: "#B91C1C" }]}>
              Report an Issue
            </Text>
            <Text style={styles.subTitle}>
              Please describe the problem. This will pause the auto-completion
              timer.
            </Text>

            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              placeholder="e.g. Broken item, package not received..."
              multiline
              value={disputeReason}
              onChangeText={setDisputeReason}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtn,
                  { backgroundColor: "#B91C1C" },
                  actionLoading && { opacity: 0.7 },
                ]}
                onPress={handleReportIssue}
                disabled={actionLoading}
              >
                <Text style={styles.confirmBtnText}>
                  {actionLoading ? "Submitting..." : "Submit Dispute"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={receiptModalVisible}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { maxHeight: "90%", width: "100%", maxWidth: 500 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Receipt</Text>
              <Pressable
                onPress={() => setReceiptModalVisible(false)}
                hitSlop={10}
              >
                <Text
                  style={{
                    fontSize: 24,
                    color: theme.colors.textSecondary,
                    lineHeight: 28,
                  }}
                >
                  ×
                </Text>
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Receipt Header */}
              <View style={styles.receiptHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  <Image
                    source={require("@/assets/yarn.png")}
                    style={{ width: 50, height: 50, marginRight: -5 }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{
                      fontFamily: "Lovingly",
                      color: theme.colors.primary,
                      fontWeight: "bold",
                      marginTop: 12,
                      fontSize: 32,
                    }}
                  >
                    Knot
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Lovingly",
                      color: "#567F4F",
                      fontWeight: "bold",
                      marginTop: 12,
                      fontSize: 32,
                    }}
                  >
                    &Bloom
                  </Text>
                </View>
                <Text style={styles.receiptSubHeader}>
                  Thank you for your order!
                </Text>
              </View>

              <View style={styles.receiptDivider} />

              {/* Order Meta & Customer Info Grid */}
              <View style={styles.receiptSection}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Order ID:</Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      {
                        fontFamily:
                          Platform.OS === "ios" ? "Courier New" : "monospace",
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {order.referenceNumber || `#${order.uid}`}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Date:</Text>
                  <Text style={styles.receiptValue}>
                    {new Date(order.uploaded).toLocaleDateString()}{" "}
                    {new Date(order.uploaded).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      {
                        color: getStatusColor(order.status),
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment:</Text>
                  <Text style={styles.receiptValue}>
                    {order.paymentMethod || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              {/* Customer & Shipping */}
              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Customer Details</Text>
                <Text style={styles.receiptText}>
                  {shippingAddress?.fullName || user?.name || "Guest"}
                </Text>
                <Text style={styles.receiptText}>
                  {shippingAddress?.phone || user?.phone || ""}
                </Text>
                <Text style={styles.receiptText}>
                  {shippingAddress?.email || user?.email || ""}
                </Text>

                <Text style={[styles.receiptSectionTitle, { marginTop: 12 }]}>
                  Shipping Address
                </Text>
                {shippingAddress ? (
                  <>
                    <Text style={styles.receiptText}>
                      {shippingAddress.address}
                    </Text>
                    <Text style={styles.receiptText}>
                      {shippingAddress.city}, {shippingAddress.postalCode}
                    </Text>
                    <Text style={styles.receiptText}>
                      {shippingAddress.country || "Philippines"}
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.receiptText,
                      { color: theme.colors.textLight, fontStyle: "italic" },
                    ]}
                  >
                    No shipping address recorded
                  </Text>
                )}
              </View>

              <View style={styles.receiptDivider} />

              {/* Items List */}
              <View style={styles.receiptSection}>
                <Text style={styles.receiptSectionTitle}>Order Items</Text>
                <View style={{ marginTop: 8 }}>
                  {orderItems.map((item, index) => {
                    const price =
                      item.finalPrice ??
                      item.unitPrice ??
                      item.product.discountedPrice ??
                      item.product.basePrice ??
                      0;
                    const lineTotal = parseFloat(String(price));

                    return (
                      <View key={index} style={{ marginBottom: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.receiptItemName}>
                              {item.product.name}
                            </Text>
                            {item.product.seller?.name && (
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: theme.colors.textLight,
                                  fontStyle: "italic",
                                  marginBottom: 2,
                                }}
                              >
                                Sold by: {item.product.seller.name}
                              </Text>
                            )}
                            {item.variant && (
                              <Text style={styles.receiptItemVariant}>
                                {typeof item.variant === "string"
                                  ? item.variant
                                  : (item.variant as any).name}
                              </Text>
                            )}
                            {/* Fallback Vendor Name if we had it, otherwise generic */}
                            {/* <Text style={{fontSize: 10, color: '#999'}}>Sold by: Knot & Bloom</Text> */}
                          </View>
                          <Text style={styles.receiptItemTotal}>
                            ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginTop: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: theme.colors.textSecondary,
                            }}
                          >
                            ₱{parseFloat(String(price)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x{" "}
                            {item.quantity}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View
                style={[styles.receiptDivider, { borderStyle: "dashed" }]}
              />

              {/* Totals */}
              <View style={styles.receiptSection}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Subtotal</Text>
                  <Text style={styles.receiptValue}>
                    ₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Shipping Fee</Text>
                  <Text
                    style={[
                      styles.receiptValue,
                      shippingFee === 0 && { color: "#059669" },
                    ]}
                  >
                    {shippingFee === 0 ? "Free" : `₱${shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </Text>
                </View>
                {/* Discount placeholder if needed */}
                {/* <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Discount</Text>
                                    <Text style={[styles.receiptValue, { color: 'green' }]}>-₱0.00</Text>
                                </View> */}
                <View
                  style={[
                    styles.receiptRow,
                    {
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.receiptLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[styles.receiptValue, { color: theme.colors.text }]}
                  >
                    ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                {order.paymentStatus === "PARTIALLY_PAID" && (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>
                        Less: Deposit (20%)
                      </Text>
                      <Text
                        style={[styles.receiptValue, { color: "#dd1537ff" }]}
                      >
                        -₱{(totalAmount * 0.2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.receiptRow,
                        {
                          marginTop: 8,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: theme.colors.border,
                          borderStyle: "dashed",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.receiptLabel,
                          {
                            fontSize: 16,
                            fontWeight: "bold",
                            color: theme.colors.text,
                          },
                        ]}
                      >
                        BALANCE DUE
                      </Text>
                      <Text
                        style={[
                          styles.receiptValue,
                          {
                            fontSize: 18,
                            fontWeight: "bold",
                            color: theme.colors.primary,
                          },
                        ]}
                      >
                        ₱{(totalAmount * 0.8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Proof Photos */}
              {(() => {
                let photos: string[] = [];
                try {
                  photos = order.proofPhotos
                    ? JSON.parse(order.proofPhotos)
                    : [];
                } catch (e) { }

                if (photos.length > 0) {
                  return (
                    <View style={{ marginTop: 10 }}>
                      <View style={styles.receiptDivider} />
                      <Text style={styles.receiptSectionTitle}>
                        Proof of Fulfillment
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flexDirection: "row", marginTop: 8 }}
                      >
                        {photos.map((url, i) => (
                          <Image
                            key={i}
                            source={{ uri: url }}
                            style={styles.proofPhoto}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  );
                }
                return null;
              })()}

              {/* Footer / QR / Policy */}
              <View
                style={{
                  alignItems: "center",
                  marginTop: 30,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#eee",
                  borderStyle: "dashed",
                }}
              >
                <View style={styles.qrContainer}>
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ORDER-${order.uid}`,
                    }}
                    style={styles.qrCode}
                  />
                  <Text style={[styles.qrText, { marginTop: 8 }]}>
                    Scan for digital copy
                  </Text>
                </View>

                <Text
                  style={{
                    textAlign: "center",
                    color: "#888",
                    fontSize: 12,
                    marginTop: 20,
                    lineHeight: 18,
                  }}
                >
                  If you have any questions, please contact us at{"\n"}
                  <Text
                    style={{
                      color: "#B36979",
                      fontWeight: "bold",
                      textDecorationLine: "underline",
                    }}
                    onPress={() =>
                      Linking.openURL(
                        "mailto:knotandbloom.shop+support@gmail.com",
                      )
                    }
                  >
                    knotandbloom.shop+support@gmail.com
                  </Text>
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    color: "#aaa",
                    fontSize: 10,
                    marginTop: 10,
                  }}
                >
                  Returns accepted within 5 business days after delivery.{"\n"}
                  See our website for full return policy.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.confirmBtn,
                  { marginTop: 24, backgroundColor: "#B36979" },
                ]}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.confirmBtnText}>Close Receipt</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    padding: 20,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: Platform.OS === "web" ? "serif" : "System",
  },
  date: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 30,
  },
  statusBadge: {
    backgroundColor: "#E6F0E6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: "#4A7A4A",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
  },
  itemsList: {
    gap: 16,
  },
  itemCard: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.subtle,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: theme.colors.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  variantText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  quantityText: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontFamily,
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
    fontFamily: theme.typography.fontFamily,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: "600",
    width: 100,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
  },
  infoValue: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "500",
    fontFamily: theme.typography.fontFamily,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 8,
    fontStyle: "italic",
  },
  // Timeline Styles
  timelineContainer: { marginTop: 8 },
  timelineItem: { flexDirection: "row", marginBottom: 20 },
  timelineLeft: { alignItems: "center", marginRight: 16, width: 20 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  timelineContent: { flex: 1 },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  timelineMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timelineDate: { fontSize: 12, color: theme.colors.textLight },

  infoBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBannerText: { fontWeight: "600", fontSize: 14 },
  infoBannerTitle: { fontWeight: "bold", marginBottom: 4 },

  // Receipt Modal Styles
  receiptHeader: { alignItems: "center", marginBottom: 20 },
  receiptBrand: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
    fontFamily: Platform.OS === "web" ? "serif" : "System",
  },
  receiptSubHeader: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  receiptSection: { marginBottom: 16 },
  receiptSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.textLight,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  receiptLabel: { fontSize: 14, color: theme.colors.textSecondary },
  receiptValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  receiptText: { fontSize: 14, color: theme.colors.text, marginBottom: 2 },

  receiptItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },

  proofPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  receiptItemVariant: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  receiptItemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: theme.colors.text }, // Existing or update
  qrContainer: { alignItems: "center", justifyContent: "center" },
  qrCode: { width: 100, height: 100 },
  qrText: { fontSize: 12, color: theme.colors.textLight, marginTop: 4 },

  // New Action Button Styles
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  // New Styles for Modals
  textBtn: { padding: 8 },
  textBtnText: { color: "#DC2626", fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    width: "90%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    elevation: 5,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: theme.colors.text,
  },
  subTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 15,
    backgroundColor: theme.colors.surface,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { padding: 12, borderRadius: 8 },
  confirmBtn: {
    backgroundColor: "#5A4A42",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: theme.colors.textSecondary, fontWeight: "600" },
  confirmBtnText: { color: "white", fontWeight: "600" },
});
