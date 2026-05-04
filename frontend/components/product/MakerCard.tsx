import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter, RelativePathString } from 'expo-router';
import { Star, ArrowRight, User as UserIcon } from 'lucide-react-native';
import { User } from '@/types/user';

interface MakerCardProps {
    maker: Partial<User>;
}

export default function MakerCard({ maker }: MakerCardProps) {
    const router = useRouter();

    // Support both User-joined seller fields and direct Seller model fields
    const sellerObj: any = maker;
    const displayName = sellerObj.name || sellerObj.sellerStoreName || 'Anonymous Maker';
    const slug = sellerObj.slug || sellerObj.sellerSlug || sellerObj.uid?.toString();
    const avatar = sellerObj.logo || sellerObj.avatar;
    const rating = sellerObj.rating || sellerObj.sellerRating ? parseFloat((sellerObj.rating || sellerObj.sellerRating).toString()).toFixed(1) : 'New';
    const totalSales = sellerObj.totalSales || sellerObj.sellerTotalSales || 0;

    const handlePress = () => {
        if (slug) {
            router.push(`/seller/${slug}` as RelativePathString);
        }
    };

    return (
        <Pressable
            style={({ pressed, hovered }: any) => [
                styles.card,
                hovered && styles.cardHovered,
                pressed && styles.cardPressed,
            ]}
            onPress={handlePress}
        >
            {/* Background Decoration */}
            <View style={styles.decorationCircle} />

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <View style={styles.avatarContainer}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatar} />
                        ) : (
                            <UserIcon size={32} color={theme.colors.textLight} />
                        )}
                    </View>
                    <View style={styles.statsContainer}>
                        <View style={styles.statBadge}>
                            <Star size={14} color={theme.colors.starGold} fill={theme.colors.starGold} />
                            <Text style={styles.statText}>{rating}</Text>
                        </View>
                        {totalSales > 0 && (
                            <View style={styles.statBadgeSecondary}>
                                <Text style={styles.statTextSecondary}>{totalSales} sales</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.makerName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={styles.makerCategory} numberOfLines={1}>
                        Custom Commissions Available
                    </Text>
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.actionText}>View Portfolio</Text>
                    <View style={styles.actionIcon}>
                        <ArrowRight size={16} color={theme.colors.primary} />
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        position: 'relative',
        ...theme.shadows.sm,
    },
    cardHovered: {
        borderColor: theme.colors.primaryLight,
        transform: [{ scale: 1.02 }],
        ...theme.shadows.md,
    },
    cardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    decorationCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.primaryLight,
        opacity: 0.2,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.backgroundAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.surface,
        ...theme.shadows.sm,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    statsContainer: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: theme.spacing.xs,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundAlt,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
        gap: 4,
    },
    statText: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    statBadgeSecondary: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    statTextSecondary: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
    },
    infoContainer: {
        marginBottom: theme.spacing.lg,
    },
    makerName: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    makerCategory: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.md,
    },
    actionText: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '600',
        color: theme.colors.primaryDark,
    },
    actionIcon: {
        backgroundColor: theme.colors.primaryLight + '40',
        padding: 6,
        borderRadius: 16,
    },
});
