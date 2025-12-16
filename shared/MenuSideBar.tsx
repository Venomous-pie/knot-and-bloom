import React, { useEffect, useRef } from "react";
import { Text, View, Animated, Pressable, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { ShoppingBag, Heart, UserRound } from "lucide-react-native";
import { Link, RelativePathString, usePathname } from "expo-router";

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
        padding: 4,
        borderRadius: 5,
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
    underline: {
        height: 2,
        backgroundColor: '#B36979',
        marginTop: 4,
        width: 0,
        // @ts-ignore
        transition: 'width 0.3s ease',
    },
    underlineHovered: {
        width: '100%',
    },
});

const sidebarLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Custom Order~', href: "/custom-order" as RelativePathString },
    { title: 'Contact Us', href: "/contact-us" as RelativePathString },
    { title: 'About Shop', href: "/about-shop" as RelativePathString },

    { title: 'Tops', href: "/products/tops" as RelativePathString },
    { title: 'Hair Tie', href: "/products/hair-tie" as RelativePathString },
    { title: 'Mini Stuffed Toy', href: "/products/mini-stuffed-toy" as RelativePathString },
    { title: 'Fuzzy Wire Bouquet', href: "/products/fuzzy-wire-bouquet" as RelativePathString },
    { title: 'Crochet Flower Bouquet', href: "/products/crochet-flower-bouquet" as RelativePathString },
    { title: 'Crochet Key Chains', href: "/products/crochet-key-chains" as RelativePathString },
]

interface MenuSideBarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MenuSideBar({ isOpen, onClose }: MenuSideBarProps) {
    const slideAnim = useRef(new Animated.Value(300)).current; // Start off-screen
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [shouldRender, setShouldRender] = React.useState(false);

    const pathname = usePathname();

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
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
            ]).start(() => {
                setShouldRender(false);
            });
        }
    }, [isOpen]);

    if (!shouldRender) return null;

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
                        {sidebarLinks.slice(0, 3).map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link key={link.title} href={link.href} asChild>
                                    <Pressable style={styles.menuItem} onPress={onClose} >
                                        {({ hovered }) => {
                                            return (
                                                <>
                                                    <Text key={link.title} >{link.title}</Text>
                                                    <View style={[styles.underline, (hovered || isActive) && styles.underlineHovered]} />
                                                </>
                                            );
                                        }}
                                    </Pressable>
                                </Link>
                            );
                        })}
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#B36979' }}>Categories</Text>
                        {sidebarLinks.slice(3).map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link key={link.title} href={link.href} asChild>
                                    <Pressable style={styles.menuItem} onPress={onClose} >
                                        {({ hovered }) => {
                                            return (
                                                <>
                                                    <Text key={link.title} >{link.title}</Text>
                                                    <View style={[styles.underline, (hovered || isActive) && styles.underlineHovered]} />
                                                </>
                                            );
                                        }}
                                    </Pressable>
                                </Link>
                            );
                        })}
                    </View>
                    <View style={{ gap: 8, borderTopWidth: 1, paddingTop: 20 }}>

                        <Pressable
                            onPress={() => alert("Chat with Us")}>
                            {({ hovered }) => {
                                return (
                                    <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                        <ShoppingBag size={16} />
                                        <Text style={[hovered && styles.buttonItemHovered]}>My Orders</Text>
                                    </View>
                                );
                            }}
                        </Pressable>

                        <Pressable
                            onPress={() => alert("Wishlist Page")}>
                            {({ hovered }) => {
                                return (
                                    <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                        <Heart size={16} />
                                        <Text style={[hovered && styles.buttonItemHovered]}>Wishlist</Text>
                                    </View>
                                );
                            }}
                        </Pressable>

                        <Pressable
                            onPress={() => alert("User Profile Page")}>
                            {({ hovered }) => {
                                return (
                                    <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                        <UserRound size={16} />
                                        <Text style={[hovered && styles.buttonItemHovered]}>Profile</Text>
                                    </View>
                                );
                            }}
                        </Pressable>
                    </View>
                </View>
            </Animated.View >
        </>
    );
}