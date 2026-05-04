import { productAPI, notificationAPI, Notification } from "@/api/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocketContext } from "@/contexts/SocketContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { getNavbarMargin, isMobile } from "@/constants/layout";
import { theme } from "@/constants/theme";
import '@/global.css';
import DropdownMenu from "@/components/ui/DropdownMenu";
import { NavLinks } from "@/components/layout/NavLinks";
import { MobileNavbar } from "@/components/layout/MobileNavbar";
import { Product } from "@/types/products";
import { Link, RelativePathString, router, usePathname } from "expo-router";
import { ChevronLeft, Handbag, Heart, Search, UserRound, LayoutDashboard, Store, User, Package, LogOut, Bell } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import SearchBarDropdown from "../ui/SearchResults";

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        width: '100%',
        zIndex: 100,
    },
    headerDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        paddingHorizontal: 16,
    },
    headerBespoke: {
        height: 60,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface
    },
    iconHovered: {
        backgroundColor: theme.colors.primary,
        borderRadius: 5,
        padding: 5,
        color: 'white',
    },
    navlinkContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    textButton: {
        height: 40,
        paddingHorizontal: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    searchBar: {
        height: 35,
        maxWidth: 200,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: theme.colors.subtle,
        borderRadius: 9999,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 0,
        paddingHorizontal: 0,
        overflow: 'hidden',
    },
    isFocused: {
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderStyle: 'solid'
    },
    searchInput: {
        fontSize: 14,
        justifyContent: 'center',
        borderWidth: 0,
        backgroundColor: 'transparent',
        outlineStyle: 'none' as any,
        flex: 1,
    },
    rightIcons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        alignContent: "center",
        alignItems: 'center'
    },
});

interface GlobalHeaderUIProps {
    setIsMenuOpen: (isOpen: boolean) => void;
    activeMenu: string | null;
    setActiveMenu: (menu: string | null) => void;
}

/** Small circular badge shown on icon buttons (cart, wishlist, notifications). */
function BadgeDot({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <View style={{
            position: 'absolute', top: -5, right: -5,
            backgroundColor: theme.colors.primary, borderRadius: 10,
            minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 4, borderWidth: 1, borderColor: 'white',
        }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                {count > 9 ? '9+' : count}
            </Text>
        </View>
    );
}

export default function GlobalHeaderUI({ setIsMenuOpen, activeMenu, setActiveMenu }: GlobalHeaderUIProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { cartCount, setCartIconPosition } = useCart();
    const { wishlistCount } = useWishlist();
    const [isFocused, setIsFocused] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const cartIconRef = React.useRef<View>(null);
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const navMargin = getNavbarMargin(width);

    const [searchQuery, setSearchQuery] = useState('');
    const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false);
    const desktopInputRef = useRef<TextInput>(null);
    const isCollapsing = useRef(false);

    // Notifications state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifLoading, setNotifLoading] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        setNotifLoading(true);
        try {
            const res = await notificationAPI.getNotifications({ limit: 5 });
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        } catch (e) {
            console.error('Failed to fetch notifications', e);
        } finally {
            setNotifLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const { socket } = useSocketContext();

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (data?: any) => {
            console.log('[Socket] notification:new event received', data);
            fetchNotifications();
        };

        socket.on('notification:new', handleNewNotification);

        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket]);


    const expandedAnim = useRef(new Animated.Value(0)).current;

    const navSearchWidth = expandedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [40, 300]
    });

    const searchBarBg = expandedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(240,240,240,0)', '#f0f0f0']
    });

    const inputOpacity = expandedAnim.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [0, 0, 1]
    });

    const isBespokePage = pathname?.includes('/auth') ||
        pathname?.includes('/secure') ||
        pathname?.includes('/seller/apply') ||
        pathname?.includes('/seller/application-');

    const handleSearch = async (search: string) => {
        try {
            const result = await productAPI.searchProducts(search);
            setProducts(result.data.products);
        } catch (error) {
            console.error("Error searching products", error);
        }
    };

    const toggleDesktopSearch = () => {
        if (isCollapsing.current) return;
        if (desktopSearchExpanded) {
            collapseDesktopSearch();
        } else {
            expandDesktopSearch();
        }
    };

    const expandDesktopSearch = () => {
        setDesktopSearchExpanded(true);
        Animated.timing(expandedAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            desktopInputRef.current?.focus();
        });
    };

    const collapseDesktopSearch = () => {
        setDesktopSearchExpanded(false);
        Keyboard.dismiss();
        desktopInputRef.current?.blur();
        Animated.timing(expandedAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleLogout = logout;

    if (mobile) {
        if (isBespokePage) {
            return (
                <View style={styles.headerBespoke}>
                    <Pressable onPress={() => router.back()} style={{ padding: 5 }}>
                        <ChevronLeft size={24} color={theme.colors.text} />
                    </Pressable>
                    <Pressable onPress={() => router.push('/customer-service/chat' as RelativePathString)}>
                        <Text style={{ color: theme.colors.primary, fontSize: 14 }}>Need Assistance?</Text>
                    </Pressable>
                </View>
            );
        }
        return (
            <View style={{ height: 60, width: '100%', borderBottomWidth: 1, borderBottomColor: theme.colors.subtle, backgroundColor: theme.colors.surface }}>
                <MobileNavbar
                    cartCount={cartCount}
                    setCartIconPosition={setCartIconPosition}
                    setIsMenuOpen={setIsMenuOpen}
                />
            </View>
        );
    }

    // Desktop Layout
    if (isBespokePage) {
        return (
            <View style={[styles.headerDesktop, { paddingHorizontal: width * navMargin }]}>
                <Link href='/' asChild>
                    <Pressable style={{ flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                        <Image source={require('@/assets/yarn.png')} style={{ width: 40, height: 40 }} resizeMode='contain' />
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.primary, marginTop: 10, fontWeight: 'bold', fontSize: 14 }}>Knot</Text>
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.secondary, marginTop: 10, fontWeight: 'bold', fontSize: 14 }}>&Bloom</Text>
                    </Pressable>
                </Link>
                <Pressable onPress={() => router.push('/customer-service/chat' as RelativePathString)}>
                    <Text style={{ color: theme.colors.primary, fontSize: 14, textDecorationLine: 'none' }}>Need Assistance?</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.headerDesktop, { paddingHorizontal: width * navMargin }]}>
                {/* Left: Logo */}
                <Link href='/' asChild>
                    <Pressable style={{ flexDirection: 'row', gap: 0, alignItems: 'center', position: 'relative', zIndex: 10 }}>
                        <Image source={require('@/assets/yarn.png')} style={{ width: 40, height: 40 }} resizeMode='contain' />
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.primary, marginTop: 10, fontWeight: 'bold', fontSize: 14 }}>Knot</Text>
                        <Text style={{ fontFamily: 'Lovingly', color: theme.colors.secondary, marginTop: 10, fontWeight: 'bold', fontSize: 14 }}>&Bloom</Text>
                    </Pressable>
                </Link>

                {/* Center: Nav Links */}
                <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' }}>
                    <View pointerEvents="auto">
                        <NavLinks activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
                    </View>
                </View>

                {/* Right: Icons */}
                <View style={styles.rightIcons}>
                    <View style={[styles.navlinkContainer, { position: 'relative', zIndex: 10 }]}>
                        <Animated.View style={[
                            styles.searchBar,
                            isFocused && styles.isFocused,
                            { width: navSearchWidth, backgroundColor: searchBarBg }
                        ]}>
                            <Pressable onPress={toggleDesktopSearch} style={{ padding: 10 }}>
                                <Search size={18} color={isFocused ? theme.colors.textLight : theme.colors.shadow} />
                            </Pressable>
                            <Animated.View style={{ flex: 1, opacity: inputOpacity }}>
                                <TextInput
                                    ref={desktopInputRef}
                                    style={[styles.searchInput, { width: '100%', height: '100%', paddingLeft: 10 }]}
                                    placeholder="Search for products..."
                                    placeholderTextColor={theme.colors.textLight}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => {
                                        setIsFocused(false);
                                        isCollapsing.current = true;
                                        setTimeout(() => { isCollapsing.current = false; }, 200);
                                        collapseDesktopSearch();
                                    }}
                                    onChangeText={(text) => {
                                        setSearchQuery(text);
                                        handleSearch(text);
                                    }}
                                    value={searchQuery}
                                />
                            </Animated.View>
                        </Animated.View>
                        {products.length > 0 && (
                            <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 5 }}>
                                <SearchBarDropdown products={products} onClose={() => setProducts([])} />
                            </View>
                        )}
                    </View>

                    <View style={{ width: 1, height: 18, backgroundColor: theme.colors.border, marginRight: 6 }} />

                    <DropdownMenu
                        items={[]}
                        isOpen={activeMenu === 'notifications'}
                        onOpenChange={(open) => {
                            setActiveMenu(open ? 'notifications' : null);
                            if (open) fetchNotifications();
                        }}
                        style={({ hovered }) => [styles.iconButton, hovered && styles.iconHovered, { position: 'relative' }]}
                        body={
                            <View style={{ minWidth: 280, maxWidth: 320, paddingVertical: 8, paddingHorizontal: 16 }}>
                                {notifLoading ? (
                                    <View style={{ paddingVertical: 52, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: theme.colors.textLight }}>Loading…</Text>
                                    </View>
                                ) : notifications.length === 0 ? (
                                    <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 6 }}>
                                        <Bell size={28} color={theme.colors.border} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, fontFamily: 'Quicksand' }}>You're all caught up!</Text>
                                        <Text style={{ fontSize: 12, color: theme.colors.textLight, textAlign: 'center' }}>No new notifications right now.</Text>
                                    </View>
                                ) : (
                                    notifications.map((n) => (
                                        <Link href="/profile/notifications" asChild key={n.uid}>
                                            <Pressable
                                                onPress={() => {
                                                    setActiveMenu(null);
                                                }}
                                                style={({ hovered }) => ([
                                                    {
                                                        flexDirection: 'row',
                                                        alignItems: 'flex-start',
                                                        paddingVertical: 10,
                                                        paddingHorizontal: 14,
                                                        gap: 10,
                                                        borderLeftWidth: !n.isRead ? 3 : 0,
                                                        borderLeftColor: theme.colors.primaryLight,
                                                    },
                                                    hovered && { backgroundColor: theme.colors.subtle }
                                                ])}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text
                                                            numberOfLines={1}
                                                            style={{ flexShrink: 1, fontSize: 12, fontWeight: n.isRead ? '500' : '700', color: theme.colors.text, fontFamily: 'Quicksand' }}
                                                        >
                                                            {n.title}
                                                        </Text>
                                                        {!n.isRead && (
                                                            <View style={{
                                                                width: 7, height: 7, borderRadius: 4,
                                                                backgroundColor: theme.colors.secondary,
                                                                flexShrink: 0
                                                            }} />
                                                        )}
                                                    </View>
                                                    <Text numberOfLines={2} style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 16 }}>
                                                        {n.message}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        </Link>
                                    ))
                                )}
                            </View>
                        }
                        footer={
                            <Link href="/profile/notifications" asChild>
                                <Pressable
                                    onPress={() => {
                                        setActiveMenu(null);
                                    }}
                                    style={{ paddingVertical: 10, alignItems: 'center' }}
                                >
                                    {({ hovered }) => (
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: hovered ? theme.colors.primary : theme.colors.textSecondary }}>
                                            View all notifications →
                                        </Text>
                                    )}
                                </Pressable>
                            </Link>
                        }
                    >
                        <View style={{ position: 'relative' }}>
                            <Bell size={18} />
                            {unreadCount > 0 && <BadgeDot count={unreadCount} />}
                        </View>
                    </DropdownMenu>

                    <Pressable
                        style={({ hovered }) => [styles.iconButton, hovered && styles.iconHovered]}
                        onPress={() => router.push("/wishlist" as RelativePathString)}
                    >
                        <View style={{ position: 'relative' }}>
                            <Heart size={18} />
                            <BadgeDot count={wishlistCount} />
                        </View>
                    </Pressable>

                    {(user) ? (
                        <DropdownMenu
                            items={[
                                ...(user.role === 'ADMIN' ? [{ title: 'Admin Dashboard', href: '/admin' as RelativePathString, icon: <LayoutDashboard size={16} color={theme.colors.textSecondary} /> }] : []),
                                ...(user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE') ? [{ title: 'Seller Dashboard', href: '/seller-dashboard' as RelativePathString, icon: <LayoutDashboard size={16} color={theme.colors.textSecondary} /> }] : []),
                                ...(!user.sellerId ? [{ title: 'Become a Seller', href: '/seller/apply' as RelativePathString, icon: <Store size={16} color={theme.colors.textSecondary} /> }] : []),
                                { title: 'View Profile', href: '/profile' as RelativePathString, icon: <User size={16} color={theme.colors.textSecondary} /> },
                                { title: 'My Orders', href: '/profile/orders' as RelativePathString, icon: <Package size={16} color={theme.colors.textSecondary} /> },
                                { type: 'separator' },
                                { title: 'Log Out', onPress: handleLogout, icon: <LogOut size={16} color={theme.colors.textSecondary} /> },
                            ]}
                            style={({ hovered }) => [styles.iconButton, hovered && styles.iconHovered]}
                            isOpen={activeMenu === 'profile'}
                            onOpenChange={(open) => setActiveMenu(open ? 'profile' : null)}
                        >
                            <UserRound size={18} />
                        </DropdownMenu>
                    ) : (
                        <Pressable
                            style={({ hovered }) => [styles.textButton, hovered && styles.iconHovered]}
                            onPress={() => router.push("/auth/login" as RelativePathString)}
                        >
                            {({ hovered }) => (
                                <Text style={{ color: hovered ? 'white' : theme.colors.primary }}>Sign In</Text>
                            )}
                        </Pressable>
                    )}

                    <View
                        ref={cartIconRef}
                        onLayout={() => {
                            cartIconRef.current?.measure((x, y, width, height, pageX, pageY) => {
                                if (setCartIconPosition) {
                                    setCartIconPosition({ x: pageX + width / 2, y: pageY + height / 2 });
                                }
                            });
                        }}
                    >
                        <Pressable
                            style={({ hovered }) => [styles.iconButton, hovered && styles.iconHovered]}
                            onPress={() => router.push("/cart" as RelativePathString)}
                        >
                            <View style={{ position: 'relative' }}>
                                <Handbag size={18} />
                                <BadgeDot count={cartCount} />
                            </View>
                        </Pressable>
                    </View>

                </View>
            </View>
        </View>
    );
}
