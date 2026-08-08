import { theme } from '@/constants/theme';
import { Link, RelativePathString, usePathname } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Platform,
    Pressable,
    PressableProps,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DropdownItem {
    title?: string;
    href?: RelativePathString;
    onPress?: () => void;
    type?: 'link' | 'separator';
    icon?: React.ReactNode;
    destructive?: boolean;
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
    /** Accessible label for the trigger when it has no visible text (e.g. icon-only) */
    accessibilityLabel?: string;
}

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
        ...(Platform.OS === 'web' ? ({ transition: 'width 0.2s ease' } as any) : null),
    },
    underlineHovered: {
        width: '100%',
    },
    dropdownContainer: {
        position: 'relative',
    },
    dropdownAnchor: {
        position: 'absolute',
        left: 0,
        right: 0,
        // top/bottom set per-placement at render time
    },
    dropdown: {
        position: 'absolute',
        backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.75)' : 'white',
        ...(Platform.OS === 'web'
            ? ({ backdropFilter: 'blur(24px) saturate(150%)', WebkitBackdropFilter: 'blur(24px) saturate(150%)' } as any)
            : null),
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
        minWidth: 180,
        padding: 8,
        ...(Platform.OS === 'web' ? ({ width: 'max-content' } as any) : null),
        zIndex: 1000,
    },
    dropdownItem: {
        justifyContent: 'center',
        width: '100%',
        marginVertical: 1,
    },
    dropdownItemHovered: {
        // Handled in ItemContent
    },
    dropdownItemIcon: {
        width: 16,
        alignItems: 'center',
    },
    dropdownText: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '500',
        fontFamily: 'Quicksand',
        ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : null),
    },
    dropdownTextHovered: {
        color: theme.colors.primary,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.06)',
        marginVertical: 4,
        marginHorizontal: 10,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 4,
    },
    footerWrap: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: 4,
    },
    triggerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    // Native-only backdrop. Web uses a plain <div onClick> to avoid the RN responder chain.
    nativeBackdrop: {
        position: 'absolute',
        top: -10000,
        left: -10000,
        right: -10000,
        bottom: -10000,
        zIndex: 999,
    },
});

// ─── Shared item content (icon + label row) ──────────────────────────────────

function ItemContent({
    icon,
    title,
    hovered,
    active,
    destructive,
}: {
    icon?: React.ReactNode;
    title?: string;
    hovered: boolean;
    active: boolean;
    destructive?: boolean;
}) {
    return (
        <View style={[
            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
            (hovered || active) && { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
        ]}>
            {icon && <View style={styles.dropdownItemIcon}>{icon}</View>}
            <Text style={[
                styles.dropdownText, 
                (hovered || active) && styles.dropdownTextHovered,
                destructive && { color: theme.colors.error || '#ef4444' }
            ]}>
                {title}
            </Text>
        </View>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DropdownMenu({
    items,
    children,
    style,
    isOpen: controlledIsOpen,
    onOpenChange,
    footer,
    body,
    placement = 'bottom',
    align = 'center',
    alignOffset = 0,
    accessibilityLabel,
}: DropdownMenuProps) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false); // panel stays mounted through the close animation
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const panelAnim = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open
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

    const isAnyLinkActive = items.some((item) => item.href && pathname === item.href);

    // Chevron rotation
    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: isOpen ? 1 : 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [isOpen]);

    // Panel mount/fade/scale — keep it mounted while the close animation plays
    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            Animated.timing(panelAnim, {
                toValue: 1,
                duration: 160,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (mounted) {
            Animated.timing(panelAnim, {
                toValue: 0,
                duration: 120,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [isOpen]);

    // Escape closes the menu on web
    useEffect(() => {
        if (Platform.OS !== 'web' || !isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen]);

    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    const originY = placement === 'top' ? 1 : 0; // scale from the edge nearest the trigger
    const translateY = panelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [placement === 'top' ? 6 : -6, 0],
    });

    const placementStyle: any =
        placement === 'top' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 };

    let alignStyle: any = {};
    if (align === 'start') {
        alignStyle = { left: alignOffset };
    } else if (align === 'end') {
        alignStyle = { right: alignOffset };
    } else {
        alignStyle = { left: '50%' };
    }
    const centerTransform = align === 'center' ? [{ translateX: '-50%' as any }] : [];

    return (
        <View style={styles.dropdownContainer}>
            {isOpen &&
                (Platform.OS === 'web' ? (
                    <div onClick={handleClose} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                ) : (
                    <Pressable style={styles.nativeBackdrop} onPress={handleClose} />
                ))}

            <Pressable
                onPress={handleToggle}
                style={style || styles.navlinkContainer}
                accessibilityRole={Platform.OS === 'web' ? ('button' as any) : undefined}
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ expanded: isOpen }}
                hitSlop={8}
            >
                {({ hovered }) =>
                    children ? (
                        typeof children === 'function' ? (
                            children({ hovered })
                        ) : (
                            children
                        )
                    ) : (
                        <>
                            <View style={styles.triggerRow}>
                                <Text>More</Text>
                                <Animated.View style={{ transform: [{ rotate }] }}>
                                    <ChevronDown size={16} color={theme.colors.text} />
                                </Animated.View>
                            </View>
                            <View style={[styles.underline, (hovered || isAnyLinkActive) && styles.underlineHovered]} />
                        </>
                    )
                }
            </Pressable>

            {mounted && (
                <Animated.View
                    style={[
                        styles.dropdown,
                        placementStyle,
                        alignStyle,
                        {
                            opacity: panelAnim,
                            transform: [
                                ...centerTransform,
                                { translateY },
                                {
                                    scale: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
                                },
                            ],
                        },
                    ]}
                    // @ts-ignore — RN doesn't type transformOrigin, but RNW/CSS honors it
                    transformOrigin={`center ${originY === 1 ? 'bottom' : 'top'}`}
                    accessibilityRole={Platform.OS === 'web' ? ('menu' as any) : undefined}
                >
                    {body && <View>{body}</View>}
                    {body && items.length > 0 && <View style={styles.divider} />}

                    {items.map((item, index) => {
                        if (item.type === 'separator') {
                            return <View key={index} style={styles.separator} />;
                        }

                        const isActive = item.href ? pathname === item.href : false;
                        const role = Platform.OS === 'web' ? ('menuitem' as any) : undefined;

                        if (item.href) {
                            return (
                                <Link key={item.title || index} href={item.href} asChild>
                                    <Pressable
                                        onPress={() => {
                                            handleClose();
                                            item.onPress?.();
                                        }}
                                        style={({ hovered }) => [
                                            styles.dropdownItem,
                                            (hovered || isActive) && styles.dropdownItemHovered,
                                        ]}
                                        accessibilityRole={role}
                                    >
                                        {({ hovered }) => (
                                            <ItemContent icon={item.icon} title={item.title} hovered={hovered} active={isActive} destructive={item.destructive} />
                                        )}
                                    </Pressable>
                                </Link>
                            );
                        }

                        return (
                            <Pressable
                                key={item.title || index}
                                onPress={() => {
                                    handleClose();
                                    item.onPress?.();
                                }}
                                style={({ hovered }) => [styles.dropdownItem, hovered && styles.dropdownItemHovered]}
                                accessibilityRole={role}
                            >
                                {({ hovered }) => (
                                    <ItemContent icon={item.icon} title={item.title} hovered={hovered} active={false} destructive={item.destructive} />
                                )}
                            </Pressable>
                        );
                    })}

                    {footer && <View style={styles.footerWrap}>{footer}</View>}
                </Animated.View>
            )}
        </View>
    );
}