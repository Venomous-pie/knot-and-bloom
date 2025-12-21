import { useAuth } from "@/app/auth";
import { navLinks, sidebarLinks } from "@/constants/categories";
import { isMobile } from "@/constants/layout";
import { Link, RelativePathString, router, usePathname } from "expo-router";
import { Facebook, Heart, Instagram, ShoppingBag, UserRound, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

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
        backgroundColor: 'white',
        zIndex: 1000,
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
        fontSize: 12,
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
        padding: 8,
        borderRadius: 12,
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

    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const sidebarWidth = mobile ? 250 : 300;

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
                        width: sidebarWidth,
                        padding: mobile ? 15 : 20,
                        transform: [{ translateX: slideAnim }]
                    }
                ]}
            >
                {/* Header Section */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={[styles.subtitle, { fontSize: mobile ? 12 : 14 }]}>{user ? "Hello," : "Welcome,"}</Text>
                            <Text style={[styles.title, { fontSize: mobile ? 16 : 18 }]}>{user ? (user.name || user.email) : "Guest"}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#333" />
                        </Pressable>
                    </View>
                </View>
                {/* Content */}
                <ScrollView
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {/* Main Navigation Links */}
                    <View style={[styles.menuItems, { gap: mobile ? 8 : 10 }]}>
                        <Text style={{ fontSize: mobile ? 12 : 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Navigation</Text>
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
                                                    (hovered && !isActive) && styles.menuItemHovered,
                                                    { paddingVertical: mobile ? 4 : 10 }
                                                ]}>
                                                    <Text style={{
                                                        color: isActive ? '#B36979' : '#333',
                                                        fontWeight: isActive ? '600' : '400',
                                                        fontSize: mobile ? 12 : 14
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
                            <Text style={{ fontSize: mobile ? 12 : 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Pages</Text>
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
                                                        (hovered && !isActive) && styles.menuItemHovered,
                                                        { paddingVertical: mobile ? 4 : 10 }
                                                    ]}>
                                                        <Text style={{
                                                            color: isActive ? '#B36979' : '#333',
                                                            fontWeight: isActive ? '600' : '400',
                                                            fontSize: mobile ? 12 : 14
                                                        }}>{link.title}</Text>
                                                    </View>
                                                );
                                            }}
                                        </Pressable>
                                    </Link>
                                );
                            })}

                            <View style={{ height: 10 }} />

                            {/* Dashboard Links (For Sellers/Admins) */}
                            {/* Dashboard Links (For Sellers/Admins) */}
                            {(() => {
                                if (!user) return null;
                                const showAdminLink = user.role === 'ADMIN';
                                const showSellerLink = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
                                const showPendingBadge = user.sellerId && user.sellerStatus === 'PENDING';
                                const shouldShowDashboard = showAdminLink || showSellerLink || showPendingBadge;

                                if (!shouldShowDashboard) return null;

                                return (
                                    <>
                                        <Text style={{ fontSize: mobile ? 12 : 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Dashboard</Text>

                                        {showAdminLink && (
                                            <Link href={'/admin' as RelativePathString} asChild>
                                                <Pressable onPress={onClose}>
                                                    {({ hovered }) => (
                                                        <View style={[styles.menuItem, pathname === '/admin' && styles.menuItemActive, hovered && styles.menuItemHovered, { paddingVertical: mobile ? 4 : 10 }]}>
                                                            <Text style={{ color: pathname === '/admin' ? '#B36979' : '#333', fontSize: mobile ? 12 : 14 }}>Admin Dashboard</Text>
                                                        </View>
                                                    )}
                                                </Pressable>
                                            </Link>
                                        )}

                                        {showSellerLink && (
                                            <Link href={'/seller-dashboard/orders' as RelativePathString} asChild>
                                                <Pressable onPress={onClose}>
                                                    {({ hovered }) => (
                                                        <View style={[styles.menuItem, pathname === '/seller-dashboard/orders' && styles.menuItemActive, hovered && styles.menuItemHovered, { paddingVertical: mobile ? 4 : 10 }]}>
                                                            <Text style={{ color: pathname === '/seller-dashboard/orders' ? '#B36979' : '#333', fontSize: mobile ? 12 : 14 }}>Seller Dashboard</Text>
                                                        </View>
                                                    )}
                                                </Pressable>
                                            </Link>
                                        )}

                                        {showPendingBadge && (
                                            <View style={[styles.menuItem, { backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFE599' }]}>
                                                <Text style={{ color: '#B8860B', fontSize: mobile ? 11 : 12 }}>⏳ Application Pending</Text>
                                            </View>
                                        )}
                                        <View style={{ height: 10 }} />
                                    </>
                                );
                            })()}

                            <Text style={{ fontSize: mobile ? 12 : 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 5 }}>Categories</Text>
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
                                                        (hovered && !isActive) && styles.menuItemHovered,
                                                        { paddingVertical: mobile ? 4 : 10 }
                                                    ]}>
                                                        <Text style={{
                                                            color: isActive ? '#B36979' : '#333',
                                                            fontWeight: isActive ? '600' : '400',
                                                            fontSize: mobile ? 12 : 14
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

                </ScrollView>

                <View style={styles.footer}>
                    {user ? (
                        <View style={{ gap: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Link href={"/profile/orders" as any} asChild style={{ flex: 1 }}>
                                    <Pressable
                                        onPress={() => onClose()}>
                                        {({ hovered }) => (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <ShoppingBag size={14} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered, { fontSize: mobile ? 12 : 14 }]}>Orders</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Link>

                                <Link href={"/wishlist" as any} asChild style={{ flex: 1 }}>
                                    <Pressable
                                        onPress={() => onClose()}>
                                        {({ hovered }) => (
                                            <View style={[styles.buttonItem, hovered && styles.buttonItemHovered, { justifyContent: 'center' }]}>
                                                <Heart size={14} color={hovered ? 'white' : 'black'} />
                                                <Text style={[hovered && styles.buttonItemHovered, { fontSize: mobile ? 12 : 14 }]}>Wishlist</Text>
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
                                                <UserRound size={16} color={hovered ? 'white' : 'black'} />
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
                                                <UserRound size={16} color={hovered ? 'white' : 'black'} />
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
                    <Text style={[styles.footerText, { fontSize: mobile ? 12 : 14 }]}>Version 1.0.0</Text>
                </View>
            </Animated.View >
        </>
    );
}