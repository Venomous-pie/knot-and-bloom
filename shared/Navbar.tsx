import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import { navLinks } from "@/constants/categories";
import { getNavbarMargin, isMobile } from "@/constants/layout";
import '@/global.css';
import DropdownMenu from "@/shared/DropdownMenu";
import MenuSideBar from "@/shared/MenuSideBar";
import { Product } from "@/types/products";
import { Link, RelativePathString, router, Stack, usePathname } from "expo-router";
import { Handbag, Heart, Menu, Search, UserRound, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Keyboard, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import SearchBarDropdown from "./SearchResults";

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
        height: 40, // increased slightly to match iconButton size for smoother transition
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: '#f0f0f0ff',

        borderRadius: 9999,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 0,
        paddingHorizontal: 0,
        overflow: 'hidden', // Ensure content is hidden when collapsed
    },

    mobileSearchBar: {
        width: '100%',
        borderRadius: 8,
    },

    searchModal: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 1001,
        padding: 20,
        paddingTop: 60,
    },

    searchModalBackdrop: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
    },

    searchModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
    },

    searchModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },

    searchModalCloseButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },

    isFocused: {
        borderWidth: 1,
        borderColor: '#B36979',
        borderStyle: 'solid'
    },

    searchInput: {
        fontSize: 14,
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
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const cartIconRef = React.useRef<View>(null);
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const navMargin = getNavbarMargin(width);

    const [searchQuery, setSearchQuery] = useState('');
    const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false);
    const desktopInputRef = useRef<TextInput>(null);
    const isCollapsing = useRef(false);

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

    // Animation for search modal
    const searchModalSlide = useRef(new Animated.Value(1000)).current;
    const searchModalOpacity = useRef(new Animated.Value(0)).current;

    // Fetch suggestions on component mount for better UX
    useEffect(() => {
        if (mobile && suggestedProducts.length === 0) {
            productAPI.searchProducts('', 4)
                .then(res => {
                    setSuggestedProducts(res.data.products);
                })
                .catch(err => console.error('Error fetching suggestions:', err));
        }
    }, [mobile]);

    useEffect(() => {
        if (isSearchOpen && mobile) {
            Animated.parallel([
                Animated.spring(searchModalSlide, {
                    toValue: 0,
                    useNativeDriver: true,
                    friction: 8,
                }),
                Animated.timing(searchModalOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(searchModalSlide, {
                    toValue: 1000,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(searchModalOpacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isSearchOpen, mobile]);

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
                                <Link href='/' asChild>
                                    <View style={{ flexDirection: 'row', gap: 0, alignItems: 'center' }}>
                                        <Image
                                            source={require('../assets/yarn.png')}
                                            style={{
                                                width: mobile ? 30 : 40,
                                                height: mobile ? 30 : 40,
                                            }}
                                            resizeMode='contain'
                                        />
                                        <Text style={{
                                            fontFamily: 'Lovingly',
                                            color: '#B36979',
                                            marginTop: mobile ? 5 : 10,
                                            fontWeight: 'bold',
                                            fontSize: mobile ? 12 : 14
                                        }}>
                                            Knot
                                        </Text>
                                        <Text style={{
                                            fontFamily: 'Lovingly',
                                            color: '#567F4F',
                                            marginTop: mobile ? 5 : 10,
                                            fontWeight: 'bold',
                                            fontSize: mobile ? 12 : 14
                                        }}>
                                            &Bloom
                                        </Text>
                                    </View>
                                </Link>
                            </View>
                        );
                    },
                    headerTitle: () => !mobile ? <NavLinks activeMenu={activeMenu} setActiveMenu={setActiveMenu} /> : null,
                    headerRight: () => {
                        return (
                            <View style={[styles.rightIcons, { marginRight: width * navMargin, gap: mobile ? 5 : 10 }]}>
                                {!mobile && (
                                    <View style={[styles.navlinkContainer, { position: 'relative', zIndex: 10 }]}>

                                        <Animated.View style={[
                                            styles.searchBar,
                                            isFocused && styles.isFocused,
                                            { width: navSearchWidth, backgroundColor: searchBarBg }
                                        ]}
                                        >
                                            <Pressable onPress={toggleDesktopSearch} style={{ padding: 10 }}>
                                                <Search size={18} color={'#000000ff'} />
                                            </Pressable>

                                            <Animated.View style={{ flex: 1, opacity: inputOpacity }}>
                                                <TextInput
                                                    ref={desktopInputRef}
                                                    style={[styles.searchInput, { width: '100%', height: '100%', paddingLeft: 10 }]}
                                                    placeholder="Search for products..."
                                                    placeholderTextColor='#adadadff'
                                                    onFocus={() => setIsFocused(true)}
                                                    onBlur={() => {
                                                        setIsFocused(false);
                                                        // Always collapse on blur, but delay clearing flag to prevent immediate re-open if toggling
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
                                )}


                                {mobile && (
                                    <Pressable
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                        onPress={() => setIsSearchOpen(!isSearchOpen)}
                                    >
                                        <Search size={mobile ? 16 : 18} />
                                    </Pressable>
                                )}

                                <Pressable
                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                    onPress={() => router.push("/wishlist" as RelativePathString)}
                                >
                                    <Heart size={mobile ? 16 : 18} />
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
                                        <UserRound size={mobile ? 16 : 18} />
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
                                        <Handbag size={mobile ? 16 : 18} />
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

                                <Pressable
                                    onPress={() => setIsMenuOpen(true)}
                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                >
                                    <Menu size={mobile ? 16 : 18} />
                                </Pressable>
                            </View >
                        );
                    },
                }}
            />
            {
                mobile && isSearchOpen && (
                    <>
                        <Animated.View
                            style={[
                                styles.searchModalBackdrop,
                                { opacity: searchModalOpacity }
                            ]}
                        >
                            <Pressable
                                style={{ flex: 1 }}
                                onPress={() => setIsSearchOpen(false)}
                            />
                        </Animated.View>
                        <Animated.View
                            style={[
                                styles.searchModal,
                                {
                                    transform: [{ translateY: searchModalSlide }],
                                },
                            ]}
                        >
                            <View style={styles.searchModalHeader}>
                                <Text style={styles.searchModalTitle}>Search</Text>
                                <Pressable
                                    onPress={() => setIsSearchOpen(false)}
                                    style={styles.searchModalCloseButton}
                                >
                                    <X size={24} color="#666" />
                                </Pressable>
                            </View>

                            <View style={[
                                styles.searchBar,
                                { maxWidth: '100%', height: 50 },
                                isFocused && styles.isFocused
                            ]}>
                                <Search size={20} color={'#00000070'} />
                                <TextInput
                                    style={[styles.searchInput, { fontSize: 16 }]}
                                    placeholder="Search for products..."
                                    placeholderTextColor='#adadadff'
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onChangeText={(text) => {
                                        setSearchQuery(text);
                                        handleSearch(text);
                                    }}
                                    value={searchQuery}
                                    autoFocus
                                />
                            </View>

                            {searchQuery && products.length > 0 && (
                                <View style={{ marginTop: 20, flex: 1 }}>
                                    <SearchBarDropdown
                                        products={products}
                                        onClose={() => {
                                            setProducts([]);
                                            setIsSearchOpen(false);
                                        }}
                                        mode="grid"
                                        title="Search Results"
                                    />
                                </View>
                            )}

                            {!searchQuery && suggestedProducts.length > 0 && (
                                <View style={{ marginTop: 20, flex: 1 }}>
                                    <SearchBarDropdown
                                        products={suggestedProducts}
                                        onClose={() => setIsSearchOpen(false)}
                                        mode="grid"
                                        title="Suggested for you"
                                    />
                                </View>
                            )}

                            {!searchQuery && suggestedProducts.length === 0 && (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                                    <Search size={48} color="#ccc" />
                                    <Text style={{ marginTop: 16, fontSize: 16, color: '#999' }}>Start typing to search products</Text>
                                </View>
                            )}
                        </Animated.View>
                    </>
                )
            }
            <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </View >
    );

}
