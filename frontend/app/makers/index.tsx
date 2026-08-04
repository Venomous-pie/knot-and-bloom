import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    useWindowDimensions, Image, Pressable
} from 'react-native';
import { theme } from '@/constants/theme';
import { sellerAPI } from '@/api/api';
import MakerCard from '@/components/product/MakerCard';
import MakerSpotlightCard from '@/components/product/MakerSpotlightCard';
import {
    Palette, SearchX, Sparkles, User as UserIcon,
    ArrowRight, BadgeCheck, Scissors
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, RelativePathString } from 'expo-router';

const MAIN_STORE_SLUG = 'knot-and-bloom-official';

export default function MakersDirectory() {
    const { width } = useWindowDimensions();
    const router = useRouter();
    const isMobile = width < 768;
    const isDesktop = width >= 1024;

    const [spotlightMakers, setSpotlightMakers] = useState<any[]>([]);
    const [regularMakers, setRegularMakers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMakers = async () => {
            try {
                const response = await sellerAPI.getActiveSellers();
                const data = response.data as any;
                setSpotlightMakers(data?.spotlightMakers ?? []);
                setRegularMakers(data?.regularMakers ?? []);
            } catch (error) {
                console.error('Failed to fetch makers:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMakers();
    }, []);

    // Split out Knot & Bloom from regular grid
    const knotAndBloom = regularMakers.find(m => m.slug === MAIN_STORE_SLUG);
    const otherMakers = regularMakers.filter(m => m.slug !== MAIN_STORE_SLUG);

    // Grid layout for regular makers
    const containerWidth = Math.min(width, 1200);
    const hPad = theme.spacing.lg * 2;
    const availableWidth = containerWidth - hPad;
    let numColumns = 1;
    if (width >= 1024) numColumns = 3;
    else if (width >= 768) numColumns = 2;
    const gap = theme.spacing.md;
    const itemWidth = isMobile
        ? '100%'
        : (availableWidth - gap * (numColumns - 1)) / numColumns;

    const hasSpotlight = spotlightMakers.length === 3;
    const hasAnyMakers = otherMakers.length > 0 || !!knotAndBloom;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >


                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Finding available makers…</Text>
                    </View>
                ) : (
                    <View style={styles.body}>

                        {/* ── HERO ── */}
                        <LinearGradient
                            colors={['#EFD9DE', '#FCFAF9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.hero}
                        >
                            <View style={styles.heroLeft}>
                                <View style={styles.heroBadge}>
                                    <Palette size={14} color={theme.colors.primary} />
                                    <Text style={styles.heroBadgeText}>For Buyers</Text>
                                </View>
                                <Text style={styles.heroTitle}>Commission a Maker</Text>
                                <Text style={styles.heroSubtitle}>
                                    Browse our curated community of Filipino micro-creators.
                                    Find your perfect Maker and request a bespoke piece — made just for you.
                                </Text>
                            </View>
                            {/* Decorative accent */}
                            <View style={styles.heroAccent}>
                                <View style={[styles.heroOrb, { top: -20, right: -20, opacity: 0.25, width: 100, height: 100 }]} />
                                <View style={[styles.heroOrb, { bottom: 10, right: 30, opacity: 0.15, width: 60, height: 60 }]} />
                                <Scissors size={64} color={theme.colors.primary} style={{ opacity: 0.18 } as any} />
                            </View>
                        </LinearGradient>
                        {knotAndBloom && (
                            <Pressable
                                style={({ pressed, hovered }: any) => [
                                    styles.featuredCard,
                                    hovered && styles.featuredCardHovered,
                                    pressed && styles.featuredCardPressed,
                                ]}
                                onPress={() => router.push(`/seller/${knotAndBloom.slug}` as RelativePathString)}
                            >
                                {/* Left: avatar */}
                                <View style={styles.featuredAvatarRing}>
                                    <View style={styles.featuredAvatarContainer}>
                                        {knotAndBloom.logo ? (
                                            <Image source={{ uri: knotAndBloom.logo }} style={styles.featuredAvatar} />
                                        ) : (
                                            <UserIcon size={40} color={theme.colors.textLight} />
                                        )}
                                    </View>
                                </View>

                                {/* Center: info */}
                                <View style={styles.featuredInfo}>
                                    <View style={styles.featuredNameRow}>
                                        <Text style={styles.featuredName} numberOfLines={1}>
                                            {knotAndBloom.name}
                                        </Text>
                                        <View style={styles.officialBadge}>
                                            <BadgeCheck size={12} color={theme.colors.primary} />
                                            <Text style={styles.officialBadgeText}>Official Store</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.featuredDesc} numberOfLines={2}>
                                        {knotAndBloom.description || 'Handcrafted goods made with love — the heart of Knot & Bloom.'}
                                    </Text>
                                    {/* Category chips */}
                                    {knotAndBloom.productCategories?.length > 0 && (
                                        <View style={styles.chipRow}>
                                            {knotAndBloom.productCategories.slice(0, 4).map((cat: string) => (
                                                <View key={cat} style={styles.chip}>
                                                    <Text style={styles.chipText}>{cat}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Right: CTA */}
                                {!isMobile && (
                                    <View style={styles.featuredCTA}>
                                        <View style={styles.ctaButton}>
                                            <Text style={styles.ctaButtonText}>View Store</Text>
                                            <ArrowRight size={15} color="#fff" />
                                        </View>
                                    </View>
                                )}
                            </Pressable>
                        )}

                        {/* ── MAKER SPOTLIGHT ── */}
                        {hasSpotlight && (
                            <View style={styles.spotlightSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.sectionTitleGroup}>
                                        <Sparkles size={16} color={theme.colors.primary} />
                                        <Text style={styles.sectionTitle}>Maker Spotlight</Text>
                                    </View>
                                    <Text style={styles.sectionHint}>Ranked by orders · rating · trust</Text>
                                </View>

                                {/* Desktop: 3-col row. Mobile: horizontal scroll */}
                                {isDesktop ? (
                                    <View style={styles.spotlightGrid}>
                                        {spotlightMakers.map((maker, i) => (
                                            <View key={maker.uid} style={{ flex: 1 }}>
                                                <MakerSpotlightCard maker={maker} rank={i + 1} />
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.spotlightScroll}
                                    >
                                        {spotlightMakers.map((maker, i) => (
                                            <MakerSpotlightCard key={maker.uid} maker={maker} rank={i + 1} />
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        {/* ── DIVIDER ── */}
                        {hasSpotlight && <View style={styles.divider} />}

                        {/* ── ALL MAKERS ── */}
                        <View style={styles.regularSection}>
                            <Text style={styles.sectionLabel}>ALL MAKERS</Text>

                            {hasAnyMakers ? (
                                <View style={styles.grid}>
                                    {otherMakers.map((maker) => (
                                        <View key={maker.uid} style={{ width: itemWidth }}>
                                            <MakerCard maker={maker} />
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <SearchX size={48} color={theme.colors.textLight} />
                                    <Text style={styles.emptyTitle}>No makers available right now.</Text>
                                    <Text style={styles.emptySubtitle}>
                                        Please check back later or contact customer service.
                                    </Text>
                                </View>
                            )}
                        </View>

                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        paddingBottom: theme.spacing['2xl'],
    },

    // ── Hero ──
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
    },
    heroLeft: {
        flex: 1,
        maxWidth: 520,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primaryLight + '60',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    heroBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.primaryDark,
        fontFamily: 'Quicksand',
    },
    heroTitle: {
        fontSize: theme.typography.sizes['3xl'],
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 10,
        fontFamily: 'Quicksand',
        lineHeight: 38,
    },
    heroSubtitle: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        fontFamily: 'Quicksand',
    },
    heroAccent: {
        position: 'relative',
        width: 120,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroOrb: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: theme.colors.primary,
    },

    // ── Body ──
    body: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.xl,
    },

    // ── Loading ──
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        marginTop: theme.spacing.md,
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.base,
        fontFamily: 'Quicksand',
    },

    // ── Featured K&B Card ──
    featuredCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: theme.colors.primaryLight,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.xl,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
    },
    featuredCardHovered: {
        shadowOpacity: 0.18,
        borderColor: theme.colors.primary,
        transform: [{ scale: 1.01 }],
    },
    featuredCardPressed: {
        opacity: 0.92,
        transform: [{ scale: 0.99 }],
    },
    featuredAvatarRing: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderRadius: 48,
        padding: 3,
    },
    featuredAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.backgroundAlt,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    featuredAvatar: {
        width: '100%',
        height: '100%',
    },
    featuredInfo: {
        flex: 1,
        gap: 4,
    },
    featuredNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    featuredName: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    officialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primaryLight + '50',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    officialBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.primaryDark,
        fontFamily: 'Quicksand',
    },
    featuredDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        lineHeight: 18,
        marginTop: 2,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    chip: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
    },
    featuredCTA: {
        paddingLeft: theme.spacing.md,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    ctaButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Quicksand',
    },

    // ── Spotlight ──
    spotlightSection: {
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        flexWrap: 'wrap',
        gap: 4,
    },
    sectionTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    sectionHint: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    // Desktop: full-width 3-col
    spotlightGrid: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
    },
    // Mobile: horizontal scroll
    spotlightScroll: {
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
        flexDirection: 'row',
    },

    // ── Divider ──
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginBottom: theme.spacing.xl,
    },

    // ── Regular Grid ──
    regularSection: {
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textLight,
        letterSpacing: 1.2,
        marginBottom: theme.spacing.md,
        marginLeft: 4,
        fontFamily: 'Quicksand',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        justifyContent: 'flex-start',
    },

    // ── Empty ──
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
    },
    emptyTitle: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xs,
        fontFamily: 'Quicksand',
    },
    emptySubtitle: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        textAlign: 'center',
        fontFamily: 'Quicksand',
    },
});
