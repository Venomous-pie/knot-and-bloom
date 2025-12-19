import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import '@/global.css';
import { Product } from "@/types/products";
import { Link, RelativePathString, router, Stack, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { navLinks } from "@/constants/categories";
import { getNavbarMargin, isMobile } from "@/constants/layout";
import DropdownMenu from "@/shared/DropdownMenu";
import MenuSideBar from "@/shared/MenuSideBar";
import { Handbag, Heart, Menu, Search, UserRound, X } from "lucide-react-native";
import SearchBarDropdown from "./SearchBarDropdown";

const styles = StyleSheet.create({
    iconHovered: {
        backgroundColor: '#B36979',
        borderRadius: 5,
        padding: 5,
        color: 'white',
    },

    navlinkContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
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

    navlinkButton: {
        fontFamily: 'Quicksand',
    },

    searchBar: {
        width: '100%',
        height: 30,
        maxWidth: 400,
        maxHeight: 50,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: '#f0f0f0ff',
        outline: 'solid',
        outlineColor: 'gray',
        borderRadius: 9999,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
    },

    mobileSearchBar: {
        width: '100%',
        borderRadius: 8,
    },

    searchAccordion: {
        position: 'fixed' as any,
        top: 60, // Account for navbar height
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderColor: '#eee',
        padding: 15,
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    searchBackdrop: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 998,
    },

    isFocused: {
        borderWidth: 1,
        borderColor: '#B36979',
        borderStyle: 'solid'
    },

    searchInput: {
        fontSize: 8,
        justifyContent: 'center',
        borderWidth: 0,
        backgroundColor: 'transparent',
        outlineStyle: 'none' as any
    },

    rightIcons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        alignContent: "center",
        alignItems: 'center'
    },

    dropdownContainer: {
        position: 'relative',
    },
})

function NavLinks({ activeMenu, setActiveMenu }: { activeMenu: string | null, setActiveMenu: (menu: string | null) => void }) {
    const pathname = usePathname();

    return (
        <View style={{ flexDirection: 'row', gap: 35 }}>
            {navLinks.slice(0, 3).map((link) => {
                const isActive = pathname === link.href;

                return ((
                    <Link key={link.title} href={link.href} asChild>
                        <Pressable style={styles.navlinkContainer}>
                            {({ hovered }) => {
                                return (
                                    <>
                                        <Text>{link.title}</Text>
                                        <View style={[styles.underline, (hovered || isActive) && styles.underlineHovered]} />
                                    </>
                                );
                            }}
                        </Pressable>
                    </Link>
                ));
            })}
            {navLinks.length > 3 && (
                <DropdownMenu
                    items={navLinks.slice(3)}
                    isOpen={activeMenu === 'more'}
                    onOpenChange={(open) => setActiveMenu(open ? 'more' : null)}
                />
            )}
        </View>
    );
}

export default function NavBar() {
    const { user, logout } = useAuth();
    const { cartCount, setCartIconPosition } = useCart();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const cartIconRef = React.useRef<View>(null);
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const navMargin = getNavbarMargin(width);

    // Animation for search accordion
    const searchAccordionHeight = useRef(new Animated.Value(0)).current;
    const searchAccordionOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isSearchOpen) {
            Animated.parallel([
                Animated.timing(searchAccordionHeight, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(searchAccordionOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(searchAccordionHeight, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(searchAccordionOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isSearchOpen]);

    const handleSearch = async (search: string) => {
        try {
            const result = await productAPI.searchProducts(search);
            setProducts(result.data.products);
        } catch (error) {
            console.error("Error searching products", error);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerTitleAlign: 'center',
                    headerShown: true,
                    headerLeft: () => {
                        return (
                            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginLeft: width * navMargin }}>
                                {mobile && (
                                    <Pressable
                                        onPress={() => setIsMenuOpen(true)}
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                    >
                                        <Menu size={18} />
                                    </Pressable>
                                )}
                                <Link href='/' asChild>
                                    <View style={{ flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                        <Image source={require('../assets/yarn.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                                        <Text style={{ fontFamily: 'Lovingly', color: '#B36979', marginTop: 10, fontWeight: 'bold' }}>Knot</Text>
                                        <Text style={{ fontFamily: 'Lovingly', color: '#567F4F', marginTop: 10, fontWeight: 'bold' }}>&Bloom</Text>
                                    </View>
                                </Link>
                            </View>
                        );
                    },
                    headerTitle: () => !mobile ? <NavLinks activeMenu={activeMenu} setActiveMenu={setActiveMenu} /> : null,
                    headerRight: () => {
                        return (
                            <View style={[styles.rightIcons, { marginRight: width * navMargin }]}>
                                {!mobile && (
                                    <View style={[styles.navlinkContainer, { position: 'relative', zIndex: 10 }]}>
                                        <View style={[
                                            styles.searchBar,
                                            isFocused && styles.isFocused]}
                                        >
                                            <Search size={18} color={'#00000070'} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Search for products..."
                                                placeholderTextColor='#adadadff'
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                onChangeText={(text) => handleSearch(text)}
                                            />
                                        </View>
                                        {products.length > 0 && (
                                            <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 5 }}>
                                                <SearchBarDropdown products={products} onClose={() => setProducts([])} />
                                            </View>
                                        )}
                                    </View>
                                )}

                                {mobile && (
                                    <Pressable
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                        onPress={() => setIsSearchOpen(!isSearchOpen)}
                                    >
                                        <Search size={18} />
                                    </Pressable>
                                )}

                                <Pressable
                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                    onPress={() => router.push("/wishlist" as RelativePathString)}
                                >
                                    <Heart size={18} />
                                </Pressable>

                                {(user) ? (
                                    <DropdownMenu
                                        items={[
                                            { title: 'Edit Profile', href: '/profile' as RelativePathString },
                                            { title: 'My Orders', href: '/profile/orders' as RelativePathString },
                                            { title: 'Log Out', onPress: handleLogout },
                                        ]}
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                        isOpen={activeMenu === 'profile'}
                                        onOpenChange={(open) => setActiveMenu(open ? 'profile' : null)}
                                    >
                                        <UserRound size={18} />
                                    </DropdownMenu>
                                ) : (
                                    <Pressable
                                        style={({ hovered }) => [
                                            styles.textButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                        onPress={() => router.push("/auth/login" as RelativePathString)}
                                    >
                                        {({ hovered }) => (
                                            <Text style={{ color: hovered ? 'white' : '#B36979' }}>Sign In</Text>
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
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                            { position: 'relative' } // Needed for absolute positioning of badge
                                        ]}
                                        onPress={() => router.push("/cart" as RelativePathString)}
                                    >
                                        <Handbag size={18} />
                                        {cartCount > 0 && (
                                            <View style={{
                                                position: 'absolute',
                                                top: -5,
                                                right: -5,
                                                backgroundColor: '#B36979',
                                                borderRadius: 10,
                                                minWidth: 16,
                                                height: 16,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                paddingHorizontal: 4,
                                                borderWidth: 1,
                                                borderColor: 'white'
                                            }}>
                                                <Text style={{
                                                    color: 'white',
                                                    fontSize: 10,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {cartCount}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        );
                    },
                }}
            />
            {mobile && (
                <>
                    {isSearchOpen && (
                        <Pressable
                            style={styles.searchBackdrop}
                            onPress={() => setIsSearchOpen(false)}
                        />
                    )}
                    <Animated.View
                        style={[
                            styles.searchAccordion,
                            {
                                maxHeight: searchAccordionHeight.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 300], // Max height of accordion
                                }),
                                opacity: searchAccordionOpacity,
                                overflow: 'hidden',
                            },
                        ]}
                        pointerEvents={isSearchOpen ? 'auto' : 'none'}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#333' }}>Search Products</Text>
                            <Pressable
                                onPress={() => setIsSearchOpen(false)}
                                style={[styles.iconButton, { width: 32, height: 32 }]}
                            >
                                <X size={18} color="#666" />
                            </Pressable>
                        </View>
                        <View style={[
                            styles.searchBar,
                            styles.mobileSearchBar,
                            isFocused && styles.isFocused
                        ]}>
                            <Search size={18} color={'#00000070'} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search for products..."
                                placeholderTextColor='#adadadff'
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                onChangeText={(text) => handleSearch(text)}
                                autoFocus={isSearchOpen}
                            />
                        </View>
                        {products.length > 0 && (
                            <View style={{ marginTop: 10 }}>
                                <SearchBarDropdown products={products} onClose={() => setProducts([])} />
                            </View>
                        )}
                    </Animated.View>
                </>
            )}
            <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </View>
    );

}
