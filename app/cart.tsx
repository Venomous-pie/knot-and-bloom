import { cartAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import { CartItem } from "@/types/cart";
import { calculatePrice } from "@/utils/pricing";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";

const { width } = Dimensions.get('window');

const SimpleCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <Pressable
        style={[styles.checkbox, checked && styles.checkboxChecked]}
        onPress={onChange}
    >
        {checked && <Text style={styles.checkmark}>✓</Text>}
    </Pressable>
);

export default function CartPage() {
    const { user } = useAuth();
    const { refreshCart } = useCart();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [subtotal, setSubtotal] = useState(0);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            // Redirect or show login prompt if not authenticated
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        calculateSubtotal();
    }, [cartItems, selectedItems]);

    const fetchCart = async () => {
        try {
            setLoading(true);
            if (!user?.uid) return;
            const response = await cartAPI.getCart(user.uid);
            console.log("🛒 Fetched Cart:", response.data.cart.items.length, "items");
            setCartItems(response.data.cart.items);
            // Default select all? Or none? Let's select all by default for convenience
            const allIds = new Set(response.data.cart.items.map(item => item.uid));
            setSelectedItems(allIds);
        } catch (error) {
            console.error("Failed to fetch cart:", error);
            if (typeof window !== 'undefined') {
                window.alert("Error: Could not load your cart.");
            }
        } finally {
            setLoading(false);
        }
    };

    const calculateSubtotal = () => {
        let total = 0;
        cartItems.forEach(item => {
            if (selectedItems.has(item.uid)) {
                const priceCalc = calculatePrice(item.product, item.productVariant);
                total += priceCalc.finalPrice * item.quantity;
            }
        });
        setSubtotal(total);
    };

    const handleQuantityChange = async (item: CartItem, change: number) => {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return;

        try {
            // Optimistic update
            const updatedItems = cartItems.map(i =>
                i.uid === item.uid ? { ...i, quantity: newQuantity } : i
            );
            setCartItems(updatedItems);

            await cartAPI.updateCartItem(item.uid, newQuantity);
        } catch (error) {
            console.error("Failed to update quantity:", error);
            // Revert on failure
            fetchCart();
        }
    };

    const handleRemoveItem = async (itemId: number) => {
        console.log("🗑️ Attempting to remove item:", itemId);

        if (typeof window !== 'undefined') {
            const confirmed = window.confirm("Are you sure you want to remove this item?");

            if (confirmed) {
                try {
                    // Optimistic Update
                    const updatedItems = cartItems.filter(i => i.uid !== itemId);
                    setCartItems(updatedItems);
                    const newSelected = new Set(selectedItems);
                    newSelected.delete(itemId);
                    setSelectedItems(newSelected);

                    console.log("📡 Sending delete request for item:", itemId);
                    await cartAPI.removeFromCart(itemId);

                    // Refresh global cart state (badge)
                    await refreshCart();
                } catch (error) {
                    console.error("Failed to remove item:", error);
                    // Revert on failure
                    fetchCart();
                    window.alert("Error: Failed to remove item. Please try again.");
                }
            }
        }
    };

    const toggleSelection = (itemId: number) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleCheckout = async () => {
        if (selectedItems.size === 0) {
            if (typeof window !== 'undefined') {
                window.alert("No Items Selected: Please select items to checkout.");
            }
            return;
        }

        try {
            setCheckoutLoading(true);
            if (!user?.uid) return;

            const response = await cartAPI.checkout(user.uid, Array.from(selectedItems));

            if (typeof window !== 'undefined') {
                window.alert("Order Placed! Your order has been successfully placed.");
            }
            fetchCart();
            await refreshCart();

        } catch (error: any) {
            console.error("Checkout failed:", error);
            if (typeof window !== 'undefined') {
                window.alert("Checkout Failed: " + (error.response?.data?.message || "Something went wrong."));
            }
        } finally {
            setCheckoutLoading(false);
        }
    };

    const renderItem = ({ item }: { item: CartItem }) => {
        // Calculate Price for display using helper
        const priceCalc = calculatePrice(item.product, item.productVariant);
        const displayPrice = priceCalc.finalPrice;

        // Determine Image
        const imageUrl = item.productVariant?.image || item.product.image;

        // Stock Logic
        const maxStock = item.productVariant?.stock ?? 0;
        const isMaxStock = item.quantity >= maxStock;

        return (
            <View style={styles.cartItem}>
                <View style={styles.itemHeader}>
                    <SimpleCheckbox
                        checked={selectedItems.has(item.uid)}
                        onChange={() => toggleSelection(item.uid)}
                    />
                </View>

                <Pressable
                    style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
                    onPress={() => router.push(`/product/${item.productId}`)}
                >
                    <View style={styles.imageContainer}>
                        {imageUrl ? (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.productImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={{ fontSize: 24 }}>📦</Text>
                        )}
                    </View>

                    <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
                        {item.productVariant && <Text style={styles.variantText}>Variant: {item.productVariant.name}</Text>}
                        <Text style={styles.itemPrice}>
                            ₱{displayPrice.toFixed(2)}
                        </Text>

                        {/* Move controls out of Pressable to prevent conflict, or handle propagation? 
                            Actually, nested Pressables can be tricky. 
                            Better to keep controls OUTSIDE the main navigation press area 
                            OR put the items in a View and only make the text/image clickable.
                            The current structure wraps Image + Details.
                            The Controls are inside Details. 
                            We should move Controls OUT of the Pressable.
                        */}
                    </View>
                </Pressable>

                {/* Controls - Moved outside the navigation pressable for better touch handling */}
                <View style={styles.controlsLeft}>
                    <View style={styles.quantityControls}>
                        <Pressable
                            style={styles.qtyBtn}
                            onPress={() => handleQuantityChange(item, -1)}
                        >
                            <Text style={styles.qtyBtnText}>-</Text>
                        </Pressable>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <Pressable
                            style={[styles.qtyBtn, isMaxStock && styles.disabledQtyBtn]}
                            onPress={() => {
                                if (!isMaxStock) handleQuantityChange(item, 1);
                            }}
                        >
                            <Text style={[styles.qtyBtnText, isMaxStock && styles.disabledQtyBtnText]}>+</Text>
                        </Pressable>
                    </View>

                    <Pressable onPress={() => handleRemoveItem(item.uid)} style={{ marginTop: 8 }}>
                        <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    if (!user) {
        return (
            <View style={styles.centered}>
                <Text style={styles.messageText}>Please log in to view your cart.</Text>
                <Pressable style={styles.loginBtn} onPress={() => router.push('/auth')}>
                    <Text style={styles.loginBtnText}>Go to Login</Text>
                </Pressable>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={{ marginTop: 10 }}>Loading Cart...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Shopping Cart ({cartItems.length})</Text>

            <FlatList
                data={cartItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Your cart is empty.</Text>
                        <Pressable style={styles.shopBtn} onPress={() => router.push('/')}>
                            <Text style={styles.shopBtnText}>Start Shopping</Text>
                        </Pressable>
                    </View>
                }
            />

            {cartItems.length > 0 && (
                <View style={styles.footer}>
                    <View style={styles.summaryContainer}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Selected Total:</Text>
                            <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
                        </View>
                        {(() => {
                            // Calculate savings using helper
                            let savings = 0;
                            cartItems.forEach(item => {
                                if (selectedItems.has(item.uid)) {
                                    const priceCalc = calculatePrice(item.product, item.productVariant);

                                    // Savings = difference between effective price and final discounted price
                                    if (priceCalc.hasDiscount) {
                                        const savingsPerItem = priceCalc.effectivePrice - priceCalc.finalPrice;
                                        savings += savingsPerItem * item.quantity;
                                    }
                                }
                            });

                            if (savings > 0) {
                                return (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.savingsLabel}>You Saved:</Text>
                                        <Text style={styles.savingsValue}>₱{savings.toFixed(2)}</Text>
                                    </View>
                                );
                            }
                            return null;
                        })()}
                    </View>
                    <Pressable
                        style={[
                            styles.checkoutBtn,
                            (selectedItems.size === 0 || checkoutLoading) && styles.disabledBtn
                        ]}
                        onPress={handleCheckout}
                        disabled={selectedItems.size === 0 || checkoutLoading}
                    >
                        {checkoutLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.checkoutBtnText}>Checkout ({selectedItems.size})</Text>
                        )}
                    </Pressable>
                </View>
            )}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 20,
        color: '#111827',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    cartItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    itemHeader: {
        marginRight: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#8b5cf6',
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#8b5cf6',
    },
    checkmark: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    imageContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 4,
    },
    variantText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#10b981',
        marginBottom: 8,
    },
    controlsLeft: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginLeft: 10
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    disabledQtyBtn: {
        opacity: 0.3
    },
    disabledQtyBtnText: {
        color: '#ccc'
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    qtyBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    qtyBtnText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    quantityText: {
        paddingHorizontal: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    removeText: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    summaryContainer: {
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#10b981',
    },
    savingsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
    },
    savingsValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    checkoutBtn: {
        backgroundColor: '#8b5cf6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: '#d1d5db',
    },
    checkoutBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    messageText: {
        fontSize: 16,
        color: '#374151',
        marginBottom: 20,
    },
    loginBtn: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    loginBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#6b7280',
        marginBottom: 20,
    },
    shopBtn: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    shopBtnText: {
        color: 'white',
        fontWeight: '600',
    },
});
