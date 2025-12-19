import { productAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { useCart } from "@/app/context/CartContext";
import '@/global.css';
import { Product } from "@/types/products";
import { useFonts } from "expo-font";
import { Link, RelativePathString, router, Stack, usePathname } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const { width } = Dimensions.get('window');

import DropdownMenu from "@/shared/DropdownMenu";
import MenuSideBar from "@/shared/MenuSideBar";
import { Handbag, Heart, Menu, Search, UserRound } from "lucide-react-native";
import SearchBarDropdown from "./SearchBarDropdown";

SplashScreen.preventAutoHideAsync();

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
        fontFamily: 'Montserrat-Regular',
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
        marginRight: width * 0.1,
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

const navLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Home', href: "/" as RelativePathString },
    { title: 'Popular', href: "/products/popular" as RelativePathString },
    { title: 'New Arrivals', href: "/products/new-arrival" as RelativePathString },
    { title: 'Crochet', href: '/products/crochet' as RelativePathString },
    { title: 'Fuzzy Wire Art', href: "/products/fuzzy-wire-art" as RelativePathString },
    { title: 'Accessories', href: "/products/accessories" as RelativePathString },
]

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
    const [products, setProducts] = useState<Product[]>([]);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const cartIconRef = React.useRef<View>(null);

    const [fontsLoaded] = useFonts({
        'Lovingly': require('@/assets/fonts/Lovingly/Lovingly.otf'),
        'Montserrat-Regular': require('@/assets/fonts/Montserrat/static/Montserrat-Black.ttf'),
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

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
        <>
            <Stack
                screenOptions={{
                    headerTitleAlign: 'center',
                    headerShown: true,
                    headerLeft: () => {
                        return (
                            <Link href='/' asChild>
                                <View style={{ flexDirection: 'row', gap: 0, alignItems: 'center', marginLeft: visualViewport?.width! * 0.1 }}>
                                    <Image source={require('../assets/yarn.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                                    <Text style={{ fontFamily: 'Lovingly', color: '#B36979', marginTop: 10, fontWeight: 'bold' }}>Knot</Text>
                                    <Text style={{ fontFamily: 'Lovingly', color: '#567F4F', marginTop: 10, fontWeight: 'bold' }}>&Bloom</Text>
                                </View>
                            </Link>
                        );
                    },
                    headerTitle: () => <NavLinks activeMenu={activeMenu} setActiveMenu={setActiveMenu} />,
                    headerRight: () => {
                        return (
                            <View style={styles.rightIcons}>
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
                                <Pressable
                                    onPress={() => setIsMenuOpen(true)}

                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                >
                                    <Menu size={18} />
                                </Pressable>
                            </View>
                        );
                    },
                }}
            />
            <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </>
    );

}
