import { useAuth } from "@/app/auth";
import { navLinks, sidebarLinks } from "@/constants/categories";
import { isMobile } from "@/constants/layout";
import { Link, RelativePathString, router, usePathname } from "expo-router";
import { Clock, Facebook, Heart, Instagram, Moon, ShoppingBag, Sun, Sunrise, Sunset, UserRound, UserRoundPlus, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

// Helper function to get time-based greeting
const getGreeting = (hour: number): { message: string; icon: React.ReactNode } => {
    if (hour >= 0 && hour < 5) {
        return { message: "Midnight Shopping?", icon: <Moon size={18} color="#B36979" /> };
    } else if (hour >= 5 && hour < 12) {
        return { message: "Good Morning", icon: <Sunrise size={18} color="#B36979" /> };
    } else if (hour >= 12 && hour < 17) {
        return { message: "Good Afternoon", icon: <Sun size={18} color="#B36979" /> };
    } else {
        return { message: "Good Evening", icon: <Sunset size={18} color="#B36979" /> };
    }
};

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        marginBottom: 2,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 2,
        fontFamily: 'Quicksand',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#999',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
        marginLeft: 12,
        fontFamily: 'Quicksand',
        letterSpacing: 0.5,
    },
    menuItems: {
        gap: 4,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 2,
    },
    menuItemActive: {
        backgroundColor: '#F9F9F9',
        // borderLeftWidth: 3,
        // borderLeftColor: '#B36979',
    },
    menuItemHovered: {
        backgroundColor: '#F5F5F5',
    },
    menuItemText: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
        fontFamily: 'Quicksand',
    },
    menuItemTextActive: {
        color: '#B36979',
        fontWeight: '700',
    },
    footer: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderColor: '#f0f0f0',
        paddingTop: 24,
        gap: 16,
    },
    authButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    buttonItem: {
        flex: 1,
        backgroundColor: 'white',
        borderColor: '#eee',
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10, // Pill shape
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    buttonItemHovered: {
        backgroundColor: '#B36979',
        borderColor: '#B36979',
    },
    buttonText: {
        fontSize: 14,
        color: '#333',
        fontFamily: 'Quicksand',
    },
    buttonTextHovered: {
        color: 'white',
    },
    footerBrand: {
        alignItems: 'center',
        gap: 12,
    },
    thanksText: {
        fontFamily: 'Lovingly',
        fontSize: 18,
        color: '#B36979',
    },
    socialIcons: {
        flexDirection: 'row',
        gap: 20,
    },
    versionText: {
        fontSize: 11,
        color: '#ccc',
        marginTop: 8,
    },
    pendingBadge: {
        backgroundColor: '#FFF9E6',
        borderWidth: 1,
        borderColor: '#FFE599',
    },
    pendingBadgeText: {
        color: '#B8860B',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Quicksand',
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
    const sidebarWidth = mobile ? 300 : 350;

    const { user } = useAuth();
    const [shouldRender, setShouldRender] = React.useState(false);

    const pathname = usePathname();

    // Time-based greeting state
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const greeting = getGreeting(currentTime.getHours());
    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {greeting.icon}
                                    <Text style={styles.subtitle}>{greeting.message}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Clock size={14} color="#999" />
                                    <Text style={{ fontSize: 13, color: '#999', fontFamily: 'Quicksand', marginRight: 6 }}>{formattedTime}</Text>
                                </View>
                            </View>
                            <Text style={styles.title} numberOfLines={1}>
                                {user ? (user.name || user.email?.split('@')[0]) : "Guest"}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={20} color="#555" />
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
                    <View style={styles.menuItems}>
                        <Text style={styles.sectionTitle}>Navigation</Text>
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
                                                    <Text style={[
                                                        styles.menuItemText,
                                                        isActive && styles.menuItemTextActive
                                                    ]}>{link.title}</Text>
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
                            <Text style={styles.sectionTitle}>Pages</Text>
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
                                                        <Text style={[
                                                            styles.menuItemText,
                                                            isActive && styles.menuItemTextActive
                                                        ]}>{link.title}</Text>
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
                                        <Text style={styles.sectionTitle}>Dashboard</Text>

                                        {showAdminLink && (
                                            <Link href={'/admin' as RelativePathString} asChild>
                                                <Pressable onPress={onClose}>
                                                    {({ hovered }) => (
                                                        <View style={[
                                                            styles.menuItem,
                                                            pathname === '/admin' && styles.menuItemActive,
                                                            hovered && styles.menuItemHovered
                                                        ]}>
                                                            <Text style={[
                                                                styles.menuItemText,
                                                                pathname === '/admin' && styles.menuItemTextActive
                                                            ]}>Admin Dashboard</Text>
                                                        </View>
                                                    )}
                                                </Pressable>
                                            </Link>
                                        )}

                                        {showSellerLink && (
                                            <Link href={'/seller-dashboard/orders' as RelativePathString} asChild>
                                                <Pressable onPress={onClose}>
                                                    {({ hovered }) => (
                                                        <View style={[
                                                            styles.menuItem,
                                                            pathname === '/seller-dashboard/orders' && styles.menuItemActive,
                                                            hovered && styles.menuItemHovered
                                                        ]}>
                                                            <Text style={[
                                                                styles.menuItemText,
                                                                pathname === '/seller-dashboard/orders' && styles.menuItemTextActive
                                                            ]}>Seller Dashboard</Text>
                                                        </View>
                                                    )}
                                                </Pressable>
                                            </Link>
                                        )}

                                        {showPendingBadge && (
                                            <View style={[styles.menuItem, styles.pendingBadge]}>
                                                <Text style={styles.pendingBadgeText}>⏳ Application Pending</Text>
                                            </View>
                                        )}
                                        <View style={{ height: 10 }} />
                                    </>
                                );
                            })()}

                            <Text style={styles.sectionTitle}>Categories</Text>
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
                                                        <Text style={[
                                                            styles.menuItemText,
                                                            isActive && styles.menuItemTextActive
                                                        ]}>{link.title}</Text>
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
                        <View style={styles.authButtons}>
                            <Link href={"/profile/orders" as any} asChild>
                                <Pressable onPress={onClose} style={{ flex: 1 }}>
                                    {({ hovered }) => (
                                        <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                            <ShoppingBag size={18} color={hovered ? 'white' : '#555'} />
                                            <Text style={[styles.buttonText, hovered && styles.buttonTextHovered]}>Orders</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </Link>

                            <Link href={"/wishlist" as any} asChild>
                                <Pressable onPress={onClose} style={{ flex: 1 }}>
                                    {({ hovered }) => (
                                        <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                            <Heart size={18} color={hovered ? 'white' : '#555'} />
                                            <Text style={[styles.buttonText, hovered && styles.buttonTextHovered]}>Wishlist</Text>
                                        </View>
                                    )}
                                </Pressable>
                            </Link>
                        </View>
                    ) : (
                        <View style={styles.authButtons}>
                            <Pressable
                                style={{ flex: 1 }}
                                onPress={() => {
                                    onClose();
                                    router.push("/auth/login" as RelativePathString);
                                }}>
                                {({ hovered }) => (
                                    <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                        <UserRound size={18} color={hovered ? 'white' : '#555'} />
                                        <Text style={[styles.buttonText, hovered && styles.buttonTextHovered]}>Sign In</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable
                                style={{ flex: 1 }}
                                onPress={() => {
                                    onClose();
                                    router.push("/auth/register" as RelativePathString);
                                }}>
                                {({ hovered }) => (
                                    <View style={[styles.buttonItem, hovered && styles.buttonItemHovered]}>
                                        <UserRoundPlus size={18} color={hovered ? 'white' : '#555'} />
                                        <Text style={[styles.buttonText, hovered && styles.buttonTextHovered]}>Register</Text>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    )}

                    <View style={styles.footerBrand}>
                        <Text style={styles.thanksText}>Thanks for Shopping</Text>
                        <View style={styles.socialIcons}>
                            <Pressable onPress={() => { }}>
                                <Instagram size={20} color="#999" />
                            </Pressable>
                            <Pressable onPress={() => { }}>
                                <Facebook size={20} color="#999" />
                            </Pressable>
                        </View>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>
            </Animated.View >
        </>
    );
}