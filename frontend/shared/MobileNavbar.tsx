import { RelativePathString, router } from "expo-router";
import { Search } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Handbag, Menu } from "lucide-react-native";

const styles = StyleSheet.create({
    iconButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    searchBar: {
        height: 35,
        maxWidth: 200,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: '#f0f0f0ff',
        borderRadius: 9999,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 0,
        paddingHorizontal: 0,
        overflow: 'hidden',
    },
});

interface MobileNavbarProps {
    cartCount: number;
    setCartIconPosition?: (layout: { x: number; y: number }) => void;
    setIsMenuOpen: (open: boolean) => void;
}

export function MobileNavbar({ cartCount, setCartIconPosition, setIsMenuOpen }: MobileNavbarProps) {
    const cartIconRef = React.useRef<View>(null);

    return (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 10, gap: 10 }}>
            {/* Search Bar - Takes all available space */}
            <Pressable
                onPress={() => router.push('/search' as RelativePathString)}
                style={[
                    styles.searchBar,
                    {
                        flex: 1,
                        maxWidth: '100%',
                        backgroundColor: '#f0f0f0',
                        paddingHorizontal: 10,
                        height: 35,
                        justifyContent: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 8,
                    }
                ]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Search size={16} color="#999" />
                    <Text style={{ color: '#999', fontSize: 13 }} numberOfLines={1}>Search...</Text>
                </View>
            </Pressable>

            {/* Right Icons */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                        style={styles.iconButton}
                        onPress={() => router.push("/cart" as RelativePathString)}
                    >
                        <Handbag size={18} />
                        {cartCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: 5,
                                right: 5,
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
                    style={styles.iconButton}
                >
                    <Menu size={18} />
                </Pressable>
            </View>
        </View>
    );
}
