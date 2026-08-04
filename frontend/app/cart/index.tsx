import { cartAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { CartItem as CartItemType } from "@/types/cart";
import { router, Stack } from "expo-router";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    ActivityIndicator,
    LayoutAnimation,
    Alert,
    FlatList,
    StyleSheet,
    View,
    Platform,
    useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

import { CartEmptyState } from "@/components/cart/CartEmptyState";

import { CartBottomBar } from "@/components/cart/CartBottomBar";
import { CartTableHeader } from "@/components/cart/CartTableHeader";
import { CartShopGroup } from "@/components/cart/CartShopGroup";
import { CartPageSkeleton } from "@/components/cart/CartPageSkeleton";
import { useDialog } from "@/contexts/DialogContext";
interface ShopGroup {
    sellerName: string;
    sellerId?: number | null;
    isOfficialShop: boolean;
    freeShippingEnabled?: boolean;
    freeShippingThreshold?: number | null;
    items: CartItemType[];
}

export default function CartPage() {
    const { user } = useAuth();
    const { refreshCart, cartItems: globalCartItems } = useCart();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;

    const [cartItems, setCartItems] = useState<CartItemType[]>(globalCartItems || []);
    const [loading, setLoading] = useState(false);
    const [subtotal, setSubtotal] = useState(0);
    const [totalSavings, setTotalSavings] = useState(0);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
    const { confirm } = useDialog();

    // Group items by seller
    const shopGroups: ShopGroup[] = useMemo(() => {
        const groups: { [key: string]: ShopGroup } = {};
        cartItems.forEach(item => {
            const sellerName = item.product.seller?.name || 'Knot & Bloom';
            const sellerId = item.product.sellerId;
            if (!groups[sellerName]) {
                groups[sellerName] = {
                    sellerName,
                    sellerId,
                    isOfficialShop: sellerName === 'Knot & Bloom',
                    freeShippingEnabled: item.product.seller?.freeShippingEnabled,
                    freeShippingThreshold: item.product.seller?.freeShippingThreshold,
                    items: []
                };
            }
            groups[sellerName].items.push(item);
        });
        return Object.values(groups);
    }, [cartItems]);

    useEffect(() => {
        if (globalCartItems && globalCartItems.length > 0) {
            setCartItems(globalCartItems);
            if (selectedItems.size === 0) {
                setSelectedItems(new Set(globalCartItems.map((i: CartItemType) => i.uid)));
            }
        }
    }, [globalCartItems]);

    useEffect(() => {
        if (user) {
            // We still fetch quietly in the background to ensure it's fresh
            fetchCart();
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        calculateSubtotal();
    }, [cartItems, selectedItems]);

    const fetchCart = async () => {
        try {
            // Only show loading if we have NO items yet
            if (cartItems.length === 0) setLoading(true);
            if (!user?.uid) return;
            const response = await cartAPI.getCart(user.uid);
            const items = response.data.cart.items || [];
            setCartItems(items);
            if (items.length > 0 && selectedItems.size === 0) {
                setSelectedItems(new Set(items.map((i: CartItemType) => i.uid)));
            }
        } catch (error) {
            console.error("Failed to fetch cart:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        let total = 0, savings = 0;
        cartItems.forEach(item => {
            if (selectedItems.has(item.uid)) {
                if (item.priceInfo) {
                    const lineTotal = item.priceInfo.finalPrice * item.quantity;
                    total += lineTotal;
                    if (item.priceInfo.hasDiscount) {
                        savings += (item.priceInfo.effectivePrice * item.quantity) - lineTotal;
                    }
                } else {
                    total += Number(item.product.basePrice) * item.quantity;
                }
            }
        });
        setSubtotal(total);
        setTotalSavings(savings);
    };

    // Debounce timers for quantity changes
    const quantityDebounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const pendingQuantities = useRef<Map<number, number>>(new Map());

    const syncQuantityToServer = useCallback(async (itemId: number, quantity: number) => {
        try {
            await cartAPI.updateCartItem(itemId, quantity);
            // Silently refresh price info in the background
            const response = await cartAPI.getCart(user!.uid);
            const updated = response.data.cart.items.find((i: CartItemType) => i.uid === itemId);
            if (updated) {
                setCartItems(prev => prev.map(i => i.uid === itemId ? { ...i, priceInfo: updated.priceInfo } : i));
            }
        } catch {
            // Revert to server state on error
            const response = await cartAPI.getCart(user!.uid);
            setCartItems(response.data.cart.items || []);
            Alert.alert("Error", "Failed to update quantity");
        } finally {
            pendingQuantities.current.delete(itemId);
        }
    }, [user]);

    const handleQuantityChange = useCallback((item: CartItemType, newQty: number) => {
        if (newQty < 1) return;

        // Immediately update UI (optimistic)
        setCartItems(prev => prev.map(i => i.uid === item.uid ? { ...i, quantity: newQty } : i));

        // Track pending quantity
        pendingQuantities.current.set(item.uid, newQty);

        // Clear existing timer for this item
        const existingTimer = quantityDebounceTimers.current.get(item.uid);
        if (existingTimer) clearTimeout(existingTimer);

        // Set new debounced timer (500ms delay)
        const timer = setTimeout(() => {
            const finalQty = pendingQuantities.current.get(item.uid);
            if (finalQty !== undefined) {
                syncQuantityToServer(item.uid, finalQty);
            }
            quantityDebounceTimers.current.delete(item.uid);
        }, 500);

        quantityDebounceTimers.current.set(item.uid, timer);
    }, [syncQuantityToServer]);

    const handleRemoveItem = async (itemId: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const oldItems = [...cartItems];
        setCartItems(prev => prev.filter(i => i.uid !== itemId));
        setSelectedItems(prev => { const n = new Set(prev); n.delete(itemId); return n; });
        try {
            await cartAPI.removeFromCart(itemId);
            await refreshCart();
        } catch {
            setCartItems(oldItems);
            Alert.alert("Error", "Failed to remove item");
        }
    };

    const toggleItemSelect = (id: number) => {
        const n = new Set(selectedItems);
        n.has(id) ? n.delete(id) : n.add(id);
        setSelectedItems(n);
    };

    const toggleShopSelect = (items: CartItemType[]) => {
        const ids = items.map(i => i.uid);
        const allSelected = ids.every(id => selectedItems.has(id));
        const n = new Set(selectedItems);
        if (allSelected) ids.forEach(id => n.delete(id));
        else ids.forEach(id => n.add(id));
        setSelectedItems(n);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === cartItems.length) setSelectedItems(new Set());
        else setSelectedItems(new Set(cartItems.map(i => i.uid)));
    };

    const handleDeleteSelected = async () => {
        if (selectedItems.size === 0) return;

        const confirmed = await confirm({
            title: "Delete Selected",
            message: `Remove ${selectedItems.size} item(s)?`,
            confirmText: "Delete",
            cancelText: "Cancel"
        });

        if (confirmed) {
            Array.from(selectedItems).forEach(id => handleRemoveItem(id));
        }
    };

    const handleCheckout = () => {
        if (selectedItems.size === 0) {
            Alert.alert("No Items", "Please select items to checkout.");
            return;
        }
        setCheckoutLoading(true);
        setTimeout(() => {
            router.push(`/checkout?items=${Array.from(selectedItems).join(',')}`);
            setCheckoutLoading(false);
        }, 300);
    };

    if (!user || (loading && cartItems.length === 0)) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ title: 'Shopping Cart', headerTitleStyle: { fontFamily: theme.typography.fontFamily }, headerStyle: { backgroundColor: theme.colors.background } }} />
                <View style={styles.contentContainer}>
                    <CartPageSkeleton />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ title: `Shopping Cart (${cartItems.length})`, headerTitleStyle: { fontFamily: theme.typography.fontFamily }, headerStyle: { backgroundColor: theme.colors.background } }} />

            <View style={styles.contentContainer}>
                <FlatList
                    data={shopGroups}
                    keyExtractor={(group) => group.sellerName}
                    contentContainerStyle={[
                        cartItems.length === 0 ? styles.listContent : undefined,
                        cartItems.length > 0 ? { paddingBottom: 140 } : { flexGrow: 1, justifyContent: 'center' }
                    ]}
                    ListHeaderComponent={
                        cartItems.length > 0 ? (
                            <CartTableHeader
                                allSelected={selectedItems.size === cartItems.length && cartItems.length > 0}
                                onToggleSelectAll={toggleSelectAll}
                            />
                        ) : null
                    }
                    ListEmptyComponent={<CartEmptyState />}
                    renderItem={({ item: group }) => (
                        <CartShopGroup
                            sellerName={group.sellerName}
                            isOfficialShop={group.isOfficialShop}
                            freeShippingEnabled={group.freeShippingEnabled}
                            freeShippingThreshold={group.freeShippingThreshold}
                            items={group.items}
                            selectedItems={selectedItems}
                            updatingItems={updatingItems}
                            onToggleShopSelect={toggleShopSelect}
                            onToggleItemSelect={toggleItemSelect}
                            onUpdateQuantity={handleQuantityChange}
                            onRemoveItem={handleRemoveItem}
                        />
                    )}
                />
            </View>

            {cartItems.length > 0 && (
                <CartBottomBar
                    subtotal={subtotal}
                    totalSavings={totalSavings}
                    selectedCount={selectedItems.size}
                    totalItems={cartItems.length}
                    allSelected={selectedItems.size === cartItems.length && cartItems.length > 0}
                    onToggleSelectAll={toggleSelectAll}
                    onCheckout={handleCheckout}
                    onDeleteSelected={handleDeleteSelected}
                    loading={checkoutLoading}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    contentContainer: { flex: 1, maxWidth: 1100, width: '100%', alignSelf: 'center' },
    centerContainer: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: theme.spacing.lg },
});
