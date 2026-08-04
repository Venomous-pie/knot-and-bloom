import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter, RelativePathString } from 'expo-router';
import { Star, Award, ArrowRight, User as UserIcon, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MakerSpotlightCardProps {
    maker: any;
    rank: number; // 1, 2, or 3
}

const RANK_COLORS: Record<number, { gradient: [string, string]; badge: string; label: string; ring: [string, string] }> = {
    1: { gradient: ['#B8860B', '#DAA520'], badge: '#DAA520', label: '🥇 Top Maker', ring: ['#DAA520', '#F5D060'] },
    2: { gradient: ['#708090', '#A9A9A9'], badge: '#A9A9A9', label: '🥈 2nd Place', ring: ['#A9A9A9', '#D0D0D0'] },
    3: { gradient: ['#A0522D', '#CD853F'], badge: '#CD853F', label: '🥉 3rd Place', ring: ['#CD853F', '#E8A96A'] },
};

export default function MakerSpotlightCard({ maker, rank }: MakerSpotlightCardProps) {
    const router = useRouter();

    const sellerObj = maker as any;
    const displayName = sellerObj.name || sellerObj.sellerStoreName || 'Anonymous Maker';
    const slug = sellerObj.slug || sellerObj.sellerSlug || sellerObj.uid?.toString();
    const avatar = sellerObj.logo || sellerObj.avatar;
    const ratingNum = sellerObj.rating ? parseFloat(sellerObj.rating.toString()) : 0;
    const ratingDisplay = ratingNum > 0 ? ratingNum.toFixed(1) : 'New';
    const totalOrders = sellerObj.totalOrders || 0;
    const categories: string[] = sellerObj.productCategories || [];

    const rankConfig = RANK_COLORS[rank] ?? RANK_COLORS[3];

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
            {/* Gold/Silver/Bronze top bar */}
            <LinearGradient
                colors={rankConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topBar}
            />

            <View style={styles.content}>
                {/* Rank badge */}
                <View style={[styles.rankBadge, { borderColor: rankConfig.badge }]}>
                    <Award size={12} color={rankConfig.badge} />
                    <Text style={[styles.rankBadgeText, { color: rankConfig.badge }]}>
                        {rankConfig.label}
                    </Text>
                </View>

                {/* Avatar */}
                <View style={styles.avatarWrapper}>
                    <LinearGradient
                        colors={rankConfig.ring}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatarRing}
                    >
                        <View style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatar} />
                            ) : (
                                <UserIcon size={36} color={theme.colors.textLight} />
                            )}
                        </View>
                    </LinearGradient>
                </View>

                {/* Name */}
                <Text style={styles.makerName} numberOfLines={2}>
                    {displayName}
                </Text>

                {/* Category chips */}
                {categories.length > 0 && (
                    <View style={styles.chipRow}>
                        {categories.slice(0, 2).map((cat) => (
                            <View key={cat} style={styles.chip}>
                                <Text style={styles.chipText}>{cat}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Star size={13} color={theme.colors.starGold} fill={theme.colors.starGold} />
                        <Text style={styles.statValue}>{ratingDisplay}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <ShoppingBag size={13} color={theme.colors.textSecondary} />
                        <Text style={styles.statValue}>{totalOrders} orders</Text>
                    </View>
                </View>

                {/* CTA */}
                <Pressable style={styles.cta} onPress={handlePress}>
                    <Text style={styles.ctaText}>View Store</Text>
                    <ArrowRight size={14} color={theme.colors.primary} />
                </Pressable>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    cardHovered: {
        transform: [{ scale: 1.03 }],
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 8,
    },
    cardPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.98 }],
    },
    topBar: {
        height: 5,
        width: '100%',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    rankBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginBottom: 14,
        backgroundColor: theme.colors.background,
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
    avatarWrapper: {
        marginBottom: 14,
    },
    avatarRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: theme.colors.backgroundAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    makerName: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: theme.colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: theme.colors.border,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primaryLight + '30',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '700',
        color: theme.colors.primary,
        fontFamily: 'Quicksand',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 12,
        justifyContent: 'center',
    },
    chip: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    chipText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
    },
});
