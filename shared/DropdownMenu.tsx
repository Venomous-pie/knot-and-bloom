import { isMobile } from '@/constants/layout';
import { Link, RelativePathString, usePathname } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, PressableProps, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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
        left: '50%',
        // @ts-ignore
        transform: [{ translateX: '-50%' }],
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
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
});

export interface DropdownItem {
    title: string;
    href?: RelativePathString;
    onPress?: () => void;
}

interface DropdownMenuProps {
    items: DropdownItem[];
    children?: React.ReactNode;
    style?: PressableProps['style'];
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
}

export default function DropdownMenu({ items, children, style, isOpen: controlledIsOpen, onOpenChange }: DropdownMenuProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pathname = usePathname();
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const handleToggle = () => {
        const newState = !isOpen;
        if (isControlled && onOpenChange) {
            onOpenChange(newState);
        } else {
            setInternalIsOpen(newState);
        }
    };

    const handleClose = () => {
        if (isControlled && onOpenChange) {
            onOpenChange(false);
        } else {
            setInternalIsOpen(false);
        }
    };

    const isAnyLinkActive = items.some(item => item.href && pathname === item.href);

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
                onPress={handleToggle}
                style={style || (children ? {} : styles.navlinkContainer)}
            >
                {({ hovered, pressed }) => (
                    children ? (
                        <>
                            {children}
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Text>More</Text>
                                <Animated.View style={{ transform: [{ rotate }] }}>
                                    <ChevronDown size={16} color="#333" />
                                </Animated.View>
                            </View>
                            <View style={[styles.underline, (hovered || isAnyLinkActive) && styles.underlineHovered]} />
                        </>
                    )

                )}
            </Pressable>

            {isOpen && (
                <View style={styles.dropdown}>
                    {items.map((item, index) => {
                        const isLinkActive = item.href ? pathname === item.href : false;

                        const content = (
                            <Pressable
                                onPress={() => {
                                    handleClose();
                                    if (item.onPress) item.onPress();
                                }}
                                style={styles.dropdownItem}
                            >
                                {({ hovered }) => (
                                    <Text style={[
                                        (hovered || isLinkActive) && styles.dropdownTextHovered,
                                        { fontSize: mobile ? 12 : 14 }
                                    ]}>
                                        {item.title}
                                    </Text>
                                )}
                            </Pressable>
                        );

                        if (item.href) {
                            return (
                                <Link key={item.title || index} href={item.href} asChild>
                                    {content}
                                </Link>
                            );
                        }

                        return (
                            <React.Fragment key={item.title || index}>
                                {content}
                            </React.Fragment>
                        );
                    })}
                </View>
            )}

            {isOpen && (
                <Pressable
                    style={styles.backdrop}
                    onPress={handleClose}
                />
            )}
        </View>
    );
}
