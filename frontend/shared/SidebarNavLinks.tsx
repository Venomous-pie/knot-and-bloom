import { navLinks, sidebarLinks } from "@/constants/categories";
import { Link, RelativePathString } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#999',
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
        backgroundColor: '#F9F9F9',
    },
    menuItemHovered: {
        backgroundColor: '#F5F5F5',
    },
    menuItemText: {
        fontSize: 15,
        color: '#444',
        fontWeight: '500',
        fontFamily: 'Quicksand',
    },
    menuItemTextActive: {
        color: '#B36979',
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

            <View style={{ height: 15 }} />

            <View style={styles.menuItems}>
                <Text style={styles.sectionTitle}>Pages</Text>
                {sidebarLinks.slice(0, 3).map((link) => {
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

                <View style={{ height: 10 }} />

                {/* Dashboard Links (For Sellers/Admins) */}
                {(() => {
                    if (!user) return null;
                    const showAdminLink = user.role === 'ADMIN';
                    const showSellerLink = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
                    const showPendingBadge = user.sellerId && user.sellerStatus === 'PENDING';
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
                {sidebarLinks.slice(3).map((link) => {
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

                {/* Only show "Sell on Knot&Bloom" if user is NOT a seller or admin */}
                {!((user?.sellerId && (user.sellerStatus === 'ACTIVE' || user.sellerStatus === 'PENDING')) || user?.role === 'ADMIN') && (
                    <Link href={'/seller/apply' as RelativePathString} asChild>
                        <Pressable onPress={onClose}>
                            {({ hovered }) => (
                                <View style={[
                                    styles.menuItem,
                                    pathname === '/seller/apply' && styles.menuItemActive,
                                    hovered && styles.menuItemHovered
                                ]}>
                                    <Text style={[
                                        styles.menuItemText,
                                        pathname === '/seller/apply' && styles.menuItemTextActive,
                                        { color: '#B36979', fontWeight: 'bold' }
                                    ]}>Sell on Knot&Bloom</Text>
                                </View>
                            )}
                        </Pressable>
                    </Link>
                )}
            </View>
        </View>
    );
}
