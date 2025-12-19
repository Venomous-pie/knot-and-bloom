import { useAuth } from "@/app/auth";
import { navLinks, sidebarLinks } from "@/constants/categories";
import { Link, RelativePathString, router, usePathname } from "expo-router";
import { Facebook, Heart, Instagram, ShoppingBag, UserRound, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

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
        display: 'flex',
        flexDirection: 'column',
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    menuItems: {
        gap: 10,
    },
    menuItem: {
        fontSize: 16,
        color: '#333',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        fontFamily: 'Quicksand',
    },
    menuItemActive: {
        backgroundColor: '#fce4ec',
        color: '#B36979',
        fontWeight: '600',
    },
    menuItemHovered: {
        backgroundColor: '#f5f5f5',
    },
    buttonItemHovered: {
        backgroundColor: '#b36979ff',
        color: 'white',
    },
    buttonItem: {
        borderColor: '#B36979',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    footer: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderColor: '#eee',
        paddingTop: 20,
        alignItems: 'center',
        gap: 10,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
    }
});

interface MenuSideBarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MenuSideBar({ isOpen, onClose }: MenuSideBarProps) {
    const slideAnim = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const { user } = useAuth();
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
                {/* Header Section */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={styles.subtitle}>{user ? "Hello," : "Welcome,"}</Text>
                            <Text style={styles.title}>{user ? (user.name || user.email) : "Guest"}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#333" />
                        </Pressable>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#eee', marginTop: 15 }} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                    {/* Main Navigation Links */}
                    <View style={styles.menuItems}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Navigation</Text>
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link key={link.title} href={link.href} asChild>
                                    <Pressable onPress={onClose} >
                                        {({ hovered }) => {
                                            return (
                                                <View style={[
                                                    styles.menuItem,
                                                    isActive && styles.menuItemActive,
                                                    (hovered && !isActive) && styles.menuItemHovered
                                                ]}>
                                                    <Text style={{
                                                        color: isActive ? '#B36979' : '#333',
                                                        fontWeight: isActive ? '600' : '400'
                                                    }}>{link.title}</Text>
                                                </View>
                                            );
                                        }}
                                    </Pressable>
                                </Link>
                            );
                        })}

                        <View style={{ height: 15 }} />

                        {/* Links */}
                        <View style={styles.menuItems}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Pages</Text>
                            {sidebarLinks.slice(0, 3).map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.title} href={link.href} asChild>
                                        <Pressable onPress={onClose} >
                                            {({ hovered }) => {
                                                return (
                                                    <View style={[
                                                        styles.menuItem,
                                                        isActive && styles.menuItemActive,
                                                        (hovered && !isActive) && styles.menuItemHovered
                                                    ]}>
                                                        <Text style={{
                                                            color: isActive ? '#B36979' : '#333',
                                                            fontWeight: isActive ? '600' : '400'
                                                        }}>{link.title}</Text>
                                                    </View>
                                                );
                                            }}
                                        </Pressable>
                                    </Link>
                                );
                            })}

                            <View style={{ height: 10 }} />

                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Categories</Text>
                            {sidebarLinks.slice(3).map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.title} href={link.href} asChild>
                                        <Pressable onPress={onClose} >
                                            {({ hovered }) => {
                                                return (
                                                    <View style={[
                                                        styles.menuItem,
                                                        isActive && styles.menuItemActive,
                                                        (hovered && !isActive) && styles.menuItemHovered
                                                    ]}>
                                                        <Text style={{
                                                            color: isActive ? '#B36979' : '#333',
                                                            fontWeight: isActive ? '600' : '400'
                                                        }}>{link.title}</Text>
                                                    </View>
                                                );
                                            }}
                                        </Pressable>
                                    </Link>
                                );
                            })}
                        </View>
                    </View>

                </View>

                <View style={styles.footer}>
                    {user ? (
                        <View style={{ gap: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Link href={"/profile/orders" as any} asChild style={{ flex: 1 }}>
                                    <Pressable
                                        onPress={() => onClose()}>
                                        {({ hovered }) => (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <ShoppingBag size={18} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered]}>Orders</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Link>

                                <Link href={"/wishlist" as any} asChild style={{ flex: 1 }}>
                                    <Pressable
                                        onPress={() => onClose()}>
                                        {({ hovered }) => (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <Heart size={18} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered]}>Wishlist</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Link>
                            </View>
                        </View>
                    ) : (
                        <View style={{ gap: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable
                                    style={{ flex: 1 }}
                                    onPress={() => {
                                        onClose();
                                        router.push("/auth/login" as RelativePathString);
                                    }}>
                                    {({ hovered }) => {
                                        return (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <UserRound size={18} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered]}>Sign In</Text>
                                            </View>
                                        );
                                    }}
                                </Pressable>
                                <Pressable
                                    style={{ flex: 1 }}
                                    onPress={() => {
                                        onClose();
                                        router.push("/auth/register" as RelativePathString);
                                    }}>
                                    {({ hovered }) => {
                                        return (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <UserRound size={18} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered]}>Register</Text>
                                            </View>
                                        );
                                    }}
                                </Pressable>
                            </View>
                        </View>
                    )}

                    <Text style={[styles.footerText, { fontFamily: 'Lovingly', fontSize: 16, color: '#B36979', marginTop: 20 }]}>Thanks for Shopping</Text>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <Pressable onPress={() => { }}>
                            <Instagram size={20} color="#999" />
                        </Pressable>
                        <Pressable onPress={() => { }}>
                            <Facebook size={20} color="#999" />
                        </Pressable>
                    </View>
                    <Text style={styles.footerText}>Version 1.0.0</Text>
                </View>
            </Animated.View >
        </>
    );
}