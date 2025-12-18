import { productAPI } from "@/api/api";
import '@/global.css';
import { Product } from "@/types/products";
import { useFonts } from "expo-font";
import { Link, RelativePathString, Stack, usePathname } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const { width } = Dimensions.get('window');

import DropdownMenu from "@/shared/DropdownMenu";
import MenuSideBar from "@/shared/MenuSideBar";
import { Heart, Menu, Search, UserRound } from "lucide-react-native";
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

function NavLinks() {
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
                <DropdownMenu links={navLinks.slice(3)} />
            )}
        </View>
    );
}

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

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
                    headerTitle: () => <NavLinks />,
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
                                    onPress={() => alert("Wishlist Page")}
                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                >
                                    <Heart size={18} />
                                </Pressable>

                                <Pressable
                                    style={({ hovered }) => [
                                        styles.iconButton,
                                        hovered && styles.iconHovered,
                                    ]}
                                >
                                    <UserRound size={18} />
                                </Pressable>
                                <Link href='/cart' asChild>
                                    <Pressable
                                        style={({ hovered }) => [
                                            styles.iconButton,
                                            hovered && styles.iconHovered,
                                        ]}
                                    >
                                        <Text style={{ fontSize: 18 }}>🛒</Text>
                                    </Pressable>
                                </Link>
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
