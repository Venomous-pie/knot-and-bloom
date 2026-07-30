import { navLinks, sidebarLinks } from "@/constants/categories";
import { theme } from "@/constants/theme";
import { Link, RelativePathString } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 16,
        marginLeft: 12,
        fontFamily: 'Quicksand',
        letterSpacing: 0.5,
    },
    menuItems: {
        gap: 4,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 2,
    },
    menuItemActive: {
        backgroundColor: theme.colors.background,
    },
    menuItemHovered: {
        backgroundColor: theme.colors.backgroundAlt,
    },
    menuItemText: {
        fontSize: 15,
        color: theme.colors.text,
        fontWeight: '500',
        fontFamily: 'Quicksand',
    },
    menuItemTextActive: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    pendingBadge: {
        backgroundColor: '#FFF9E6',
        borderWidth: 1,
        borderColor: '#FFE599',
    },
    pendingBadgeText: {
        color: '#B8860B',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
});

interface SidebarNavLinksProps {
    onClose: () => void;
    user: any | null;
    pathname: string;
}

export function SidebarNavLinks({ onClose, user, pathname }: SidebarNavLinksProps) {
    return (
        <View style={styles.menuItems}>
            <Text style={styles.sectionTitle}>Navigation</Text>
            {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                    <Link key={link.title} href={link.href} asChild>
                        <Pressable onPress={onClose}>
                            {({ hovered }) => (
                                <View style={[
                                    styles.menuItem,
                                    isActive && styles.menuItemActive,
                                    (hovered && !isActive) && styles.menuItemHovered
                                ]}>
                                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                        {link.title}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Link>
                );
            })}

            <View style={styles.menuItems}>

                {/* Dashboard Links (For Sellers/Admins) */}
                {(() => {
                    if (!user) return null;
                    const showAdminLink = user.role === 'ADMIN';
                    const showSellerLink = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
                    const showPendingBadge = user.sellerProfile?.uid && user.sellerProfile?.status === 'PENDING';
                    const shouldShowDashboard = showAdminLink || showSellerLink || showPendingBadge;

                    if (!shouldShowDashboard) return null;

                    return (
                        <>
                            <Text style={styles.sectionTitle}>Dashboard</Text>

                            {showAdminLink && (
                                <Link href={'/admin' as RelativePathString} asChild>
                                    <Pressable onPress={onClose}>
                                        {({ hovered }) => (
                                            <View style={[
                                                styles.menuItem,
                                                pathname === '/admin' && styles.menuItemActive,
                                                hovered && styles.menuItemHovered
                                            ]}>
                                                <Text style={[styles.menuItemText, pathname === '/admin' && styles.menuItemTextActive]}>
                                                    Admin Dashboard
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Link>
                            )}

                            {showSellerLink && (
                                <Link href={'/seller-dashboard/orders' as RelativePathString} asChild>
                                    <Pressable onPress={onClose}>
                                        {({ hovered }) => (
                                            <View style={[
                                                styles.menuItem,
                                                pathname === '/seller-dashboard/orders' && styles.menuItemActive,
                                                hovered && styles.menuItemHovered
                                            ]}>
                                                <Text style={[styles.menuItemText, pathname === '/seller-dashboard/orders' && styles.menuItemTextActive]}>
                                                    Seller Dashboard
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </Link>
                            )}

                            {showPendingBadge && (
                                <View style={[styles.menuItem, styles.pendingBadge]}>
                                    <Text style={styles.pendingBadgeText}>⏳ Application Pending</Text>
                                </View>
                            )}
                            <View style={{ height: 10 }} />
                        </>
                    );
                })()}

                <Text style={styles.sectionTitle}>Categories</Text>
                {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link key={link.title} href={link.href} asChild>
                            <Pressable onPress={onClose}>
                                {({ hovered }) => (
                                    <View style={[
                                        styles.menuItem,
                                        isActive && styles.menuItemActive,
                                        (hovered && !isActive) && styles.menuItemHovered
                                    ]}>
                                        <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                                            {link.title}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        </Link>
                    );
                })}

                <View style={{ height: 15 }} />
            </View>
        </View>
    );
}
