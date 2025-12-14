import React, { useEffect, useRef } from "react";
import { Text, View, Animated, Pressable, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { ShoppingBag, Heart, UserRound } from "lucide-react-native";

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100%',
        width: 300,
        backgroundColor: 'white',
        zIndex: 1000,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 8,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#B36979',
        marginBottom: 20,
    },
    menuItems: {
        gap: 20,
    },
    menuItem: {
        fontSize: 16,
        color: '#333',
        paddingVertical: 8,
    },
    buttonItemHovered: {
        backgroundColor: '#b36979ff',
        color: 'white',
    },
    buttonItem: {
        borderColor: '#B36979',
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
});

interface MenuSideBarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MenuSideBar({ isOpen, onClose }: MenuSideBarProps) {
    const slideAnim = useRef(new Animated.Value(300)).current; // Start off-screen
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isOpen) {
            // Slide in and fade in backdrop
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide out and fade out backdrop
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 300,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    { opacity: fadeAnim }
                ]}
            >
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                />
            </Animated.View>

            {/* Sidebar */}
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        transform: [{ translateX: slideAnim }]
                    }
                ]}
            >
                {/* Close Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: '#ccc', borderBottomWidth: 1, marginBottom: 20 }}>
                    <Text style={styles.title}>Menu</Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={24} />
                    </Pressable>
                </View>

                {/* Add your menu items here */}
                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View style={styles.menuItems}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#B36979' }}>Other</Text>
                        <Text style={styles.menuItem}>Custom Order~</Text>
                        <Text style={styles.menuItem}>Contact Us</Text>
                        <Text style={styles.menuItem}>About Shop</Text>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#B36979' }}>Categories</Text>
                        <Text style={styles.menuItem}>Tops</Text>
                        <Text style={styles.menuItem}>Hair Tie</Text>
                        <Text style={styles.menuItem}>Mini Stuffed Toy</Text>
                        <Text style={styles.menuItem}>Fuzzy Wire Bouquet</Text>
                        <Text style={styles.menuItem}>Crochet Flower Bouquet</Text>
                        <Text style={styles.menuItem}>Crochet Key Chains</Text>
                    </View>
                    <View style={{ gap: 8, borderTopWidth: 1, paddingTop: 20}}>
                        <Pressable
                            onPress={() => alert("Chat with Us")}
                            style={({ hovered }) => [
                                styles.buttonItem,
                                hovered && styles.buttonItemHovered,
                            ]}
                        >
                            <ShoppingBag size={16} />
                            <Text style={{ color: 'black', fontSize: 12, }}>My Orders</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => alert("Chat with Us")}
                            style={({ hovered }) => [
                                styles.buttonItem,
                                hovered && styles.buttonItemHovered,
                            ]}
                        >
                            <Heart size={16} />
                            <Text style={{ color: 'black', fontSize: 12, }}>My Wishlist</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => alert("Chat with Us")}
                            style={({ hovered }) => [
                                styles.buttonItem,
                                hovered && styles.buttonItemHovered,
                            ]}
                        >
                            <UserRound size={16} />
                            <Text style={{ color: 'black', fontSize: 12, }}>Account</Text>
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        </>
    );
}