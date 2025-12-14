import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Link, usePathname, RelativePathString } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';

const styles = StyleSheet.create({
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
    dropdownContainer: {
        position: 'relative',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 200,
        zIndex: 1000,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownText: {
        color: '#333',
    },
    dropdownTextHovered: {
        color: '#B36979',
    },
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
});


interface DropdownMenuProps {
    links: { title: string, href: RelativePathString }[];
}

export default function DropdownMenu({ links }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pathname = usePathname();

    const isAnyLinkActive = links.some(link => pathname === link.href);

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isOpen ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View style={styles.dropdownContainer}>
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                style={styles.navlinkContainer}
            >
                {({ hovered }) => (
                    <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text>More</Text>
                            <Animated.View style={{ transform: [{ rotate }] }}>
                                <ChevronDown size={16} color="#333" />
                            </Animated.View>
                        </View> 
                        <View style={[styles.underline, (hovered || isAnyLinkActive) && styles.underlineHovered]} />
                    </>
                )}
            </Pressable>

            {isOpen && (
                <View style={styles.dropdown}>
                    {links.map((link) => {
                        const isLinkActive = pathname === link.href;

                        return (
                            <Link key={link.title} href={link.href} asChild>
                                <Pressable
                                    onPress={() => setIsOpen(false)}
                                    style={styles.dropdownItem}
                                >
                                    {({ hovered }) => (
                                        <Text style={[
                                            styles.dropdownText,
                                            (hovered || isLinkActive) && styles.dropdownTextHovered
                                        ]}>
                                            {link.title}
                                        </Text>
                                    )}
                                </Pressable>
                            </Link>
                        );
                    })}
                </View>
            )}

            {isOpen && (
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setIsOpen(false)}
                />
            )}
        </View>
    );
}
