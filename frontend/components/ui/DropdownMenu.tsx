import { theme } from '@/constants/theme';
import { Link, RelativePathString, router, usePathname } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    dropdownContainer: {
        position: 'relative',
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: '50%',
        // @ts-ignore
        transform: [{ translateX: '-50%' }],
        marginTop: 4,
        backgroundColor: 'white',
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderTopColor: theme.colors.primaryLight,
        borderBottomColor: theme.colors.primaryLight,
        borderRadius: 6,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        minWidth: 160,
        // @ts-ignore
        width: Platform.OS === 'web' ? 'max-content' : undefined,
        zIndex: 1000,
    },
    dropdownItem: {
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    dropdownText: {
        color: theme.colors.text,
        fontSize: 13,
        // @ts-ignore
        whiteSpace: Platform.OS === 'web' ? 'nowrap' : undefined,
    },
    dropdownTextHovered: {
        color: theme.colors.primary,
    },
    // Native-only backdrop (web uses a plain <div onClick> to avoid the RN responder chain)
    nativeBackdrop: {
        position: 'fixed' as any,
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
    },
}) as unknown as {
    navlinkContainer: ViewStyle;
    underline: ViewStyle;
    underlineHovered: ViewStyle;
    dropdownContainer: ViewStyle;
    dropdown: ViewStyle;
    dropdownItem: ViewStyle;
    dropdownText: TextStyle;
    dropdownTextHovered: TextStyle;
    nativeBackdrop: ViewStyle;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropdownItem {
    title?: string;
    href?: RelativePathString;
    onPress?: () => void;
    type?: 'link' | 'separator';
    icon?: React.ReactNode;
}

interface DropdownMenuProps {
    items: DropdownItem[];
    children?: React.ReactNode | ((props: { hovered: boolean }) => React.ReactNode);
    style?: PressableProps['style'];
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    footer?: React.ReactNode;
    /** Custom content rendered inside the panel above the items list */
    body?: React.ReactNode;
    placement?: 'top' | 'bottom';
    align?: 'start' | 'center' | 'end';
    alignOffset?: number;
}

// ─── Shared item content (icon + label row) ──────────────────────────────────

function ItemContent({ icon, title, hovered, active }: { icon?: React.ReactNode; title?: string; hovered: boolean; active: boolean }) {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {icon && <View style={{ width: 18, alignItems: 'center' }}>{icon}</View>}
            <Text style={[styles.dropdownText, (hovered || active) && styles.dropdownTextHovered]}>
                {title}
            </Text>
        </View>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DropdownMenu({ items, children, style, isOpen: controlledIsOpen, onOpenChange, footer, body, placement = 'bottom', align = 'center', alignOffset = 0 }: DropdownMenuProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const pathname = usePathname();

    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const handleToggle = () => {
        const next = !isOpen;
        isControlled ? onOpenChange?.(next) : setInternalIsOpen(next);
    };

    const handleClose = () => {
        isControlled ? onOpenChange?.(false) : setInternalIsOpen(false);
    };

    const isAnyLinkActive = items.some(item => item.href && pathname === item.href);

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isOpen ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    const placementStyle = placement === 'top' ? { bottom: '100%', top: 'auto', marginBottom: 4, marginTop: 0 } : {};
    
    let alignStyle: any = {};
    if (align === 'start') {
        alignStyle = { left: alignOffset, transform: [] };
    } else if (align === 'end') {
        alignStyle = { right: alignOffset, left: 'auto', transform: [] };
    } else {
        alignStyle = { left: '50%', transform: [{ translateX: '-50%' }] };
    }

    return (
        <View style={styles.dropdownContainer}>
            {/* Backdrop — web: native <div> bypasses RN responder chain (no press latency).
                          native: Pressable with fixed positioning. */}
            {isOpen && (
                Platform.OS === 'web'
                    ? <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 999 }} /> // @ts-ignore
                    : <Pressable style={styles.nativeBackdrop} onPress={handleClose} />
            )}

            <Pressable onPress={handleToggle} style={style || styles.navlinkContainer}>
                {({ hovered }) => (
                    children
                        ? (typeof children === 'function' ? children({ hovered }) : children)
                        : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Text>More</Text>
                                    <Animated.View style={{ transform: [{ rotate }] }}>
                                        <ChevronDown size={16} color={theme.colors.text} />
                                    </Animated.View>
                                </View>
                                <View style={[styles.underline, (hovered || isAnyLinkActive) && styles.underlineHovered]} />
                            </>
                        )
                )}
            </Pressable>

            {isOpen && (
                <View style={[styles.dropdown, placementStyle as any, alignStyle]}>
                    {body && <View>{body}</View>}
                    {body && items.length > 0 && (
                        <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
                    )}

                    {items.map((item, index) => {
                        if (item.type === 'separator') {
                            return (
                                <View
                                    key={index}
                                    style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4, marginHorizontal: 10 }}
                                />
                            );
                        }

                        const isActive = item.href ? pathname === item.href : false;

                        if (item.href) {
                            return (
                                <Link key={item.title || index} href={item.href} asChild>
                                    <Pressable
                                        onPress={() => {
                                            handleClose();
                                            item.onPress?.();
                                        }}
                                        style={styles.dropdownItem}
                                    >
                                        {({ hovered }) => <ItemContent icon={item.icon} title={item.title} hovered={hovered} active={isActive} />}
                                    </Pressable>
                                </Link>
                            );
                        }

                        return (
                            <Pressable
                                key={item.title || index}
                                onPress={() => { handleClose(); item.onPress?.(); }}
                                style={styles.dropdownItem}
                            >
                                {({ hovered }) => <ItemContent icon={item.icon} title={item.title} hovered={hovered} active={false} />}
                            </Pressable>
                        );
                    })}

                    {footer && (
                        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 4 }}>
                            {footer}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}
