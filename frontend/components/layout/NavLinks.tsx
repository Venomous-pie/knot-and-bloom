import { navLinks } from "@/constants/categories";
import { theme } from "@/constants/theme";
import DropdownMenu, { DropdownItem } from "@/components/ui/DropdownMenu";
import { Link, RelativePathString, usePathname } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
    navlinkContainer: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    underline: {
        height: 2,
        backgroundColor: theme.colors.primary,
        marginTop: 4,
        width: 0,
        // @ts-ignore
        transition: 'width 0.3s ease',
    },
    underlineHovered: {
        width: '100%',
    },
});

export function NavLinks({ activeMenu, setActiveMenu }: { activeMenu: string | null, setActiveMenu: (menu: string | null) => void }) {
    const pathname = usePathname();

    const chevronRotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(chevronRotation, {
            toValue: activeMenu === 'shop' ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [activeMenu]);

    const chevronRotate = chevronRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const shopItems: DropdownItem[] = [
        { title: 'All Products', href: '/products/all-products' as RelativePathString },
        { title: 'Popular', href: '/products/popular' as RelativePathString },
        { type: 'separator' },
        { title: 'Crochet', href: '/products/crochet' as RelativePathString },
        { title: 'Fuzzy Wire Art', href: '/products/fuzzy-wire-art' as RelativePathString },
        { title: 'Gift Boxes/Sets', href: '/products/gift-boxes-sets' as RelativePathString },
    ];

    const isShopActive = shopItems.some(item => item.href && pathname === item.href);

    return (
        <View style={{ flexDirection: 'row', gap: 35 }}>
            <Link href="/" asChild>
                <Pressable style={styles.navlinkContainer}>
                    {({ hovered }) => (
                        <>
                            <Text>Home</Text>
                            <View style={[styles.underline, (hovered || pathname === '/') && styles.underlineHovered]} />
                        </>
                    )}
                </Pressable>
            </Link>

            <DropdownMenu
                items={shopItems}
                isOpen={activeMenu === 'shop'}
                onOpenChange={(open) => setActiveMenu(open ? 'shop' : null)}
            >
                {({ hovered }: { hovered: boolean }) => (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text>Shop</Text>
                            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                                <ChevronDown size={14} color={theme.colors.text} />
                            </Animated.View>
                        </View>
                        <View style={[styles.underline, (hovered || isShopActive) && styles.underlineHovered]} />
                    </>
                )}
            </DropdownMenu>

            <Link href="/products/new-arrival" asChild>
                <Pressable style={styles.navlinkContainer}>
                    {({ hovered }) => (
                        <>
                            <Text>New Arrivals</Text>
                            <View style={[styles.underline, (hovered || pathname === '/products/new-arrival') && styles.underlineHovered]} />
                        </>
                    )}
                </Pressable>
            </Link>

            <Link href={"/makers" as RelativePathString} asChild>
                <Pressable style={styles.navlinkContainer}>
                    {({ hovered }) => (
                        <>
                            <Text>Custom Order</Text>
                            <View style={[styles.underline, (hovered || pathname === '/makers') && styles.underlineHovered]} />
                        </>
                    )}
                </Pressable>
            </Link>
        </View>
    );
}
