import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    Animated, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI } from '@/services/api';
import { Star, MessageSquare, TrendingUp, Award } from 'lucide-react-native';
import StatCard from '../../components/ui/StatCard';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';

interface Review {
    id: number;
    customerName: string;
    rating: number;
    comment: string;
    date: string;
}

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
    return (
        <View style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star
                    key={s}
                    size={size}
                    fill={s <= rating ? AMBER : '#E5E7EB'}
                    color={s <= rating ? AMBER : '#E5E7EB'}
                />
            ))}
        </View>
    );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <StarRow rating={rating} size={12} />
            <View style={{ flex: 1, height: 8, backgroundColor: '#F0F0F5', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: AMBER, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 12, color: SUB, fontFamily: 'Quicksand', width: 24, textAlign: 'right' }}>{count}</Text>
        </View>
    );
}

export default function SellerReviewsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (loading) {
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            );
            anim.start();
        } else {
            pulseAnim.setValue(0.4);
        }
        return () => anim?.stop();
    }, [loading]);

    useEffect(() => {
        if (!authLoading) {
            if (!user) { router.replace('/auth/login' as any); return; }
            const ok = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!ok) router.replace('/' as any);
        }
    }, [user, authLoading]);

    const fetchReviews = async () => {
        try {
            const stats = await sellerAPI.getDashboardStats();
            setReviews(stats.recentReviews || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchReviews(); }, []);


    // Compute stats from reviews
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
        : 0;
    const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => r.rating === star).length,
    }));

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Reviews & Ratings</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Monitor and respond to customer feedback and ratings.</Text>
                    </View>
                    <View style={s.chip}>
                        <Text style={s.chipTxt}>Last 30 days</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchReviews(); }}
                            colors={[P]}
                            tintColor={P}
                        />
                    }
                >
                    {/* Summary Row */}
                    <View style={[s.statsRow, isDesktop && { flexDirection: 'row', zIndex: 100, overflow: 'visible' }]}>
                        {/* Average Rating Card */}
                        <StatCard
                            label="Average Rating"
                            value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
                            icon={<Star size={20} fill={AMBER} color={AMBER} />}
                            color={AMBER}
                            tooltip="Average rating based on all reviews."
                            isLoading={loading && reviews.length === 0}
                        />

                        {/* Total Reviews Card */}
                        <StatCard
                            label="Total Reviews"
                            value={String(totalReviews)}
                            icon={<MessageSquare size={20} color={P} />}
                            color={P}
                            tooltip="Total number of reviews received."
                            isLoading={loading && reviews.length === 0}
                        />

                        {/* Top Rating Card */}
                        <StatCard
                            label="4–5 Star Rate"
                            value={totalReviews > 0 ? `${Math.round((ratingCounts.filter(r => r.star >= 4).reduce((s, r) => s + r.count, 0) / totalReviews) * 100)}%` : '—'}
                            icon={<Award size={20} color={GREEN} />}
                            color={GREEN}
                            tooltip="Percentage of reviews that are 4 or 5 stars."
                            isLoading={loading && reviews.length === 0}
                        />
                    </View>

                    {isDesktop ? (
                        <View style={{ flexDirection: 'row', gap: 24 }}>
                            {/* Left: Review List */}
                            <View style={{ flex: 0.65 }}>
                                <View style={s.card}>
                                    <View style={s.cardHead}>
                                        <Text style={s.cardTitle}>All Reviews</Text>
                                        <Text style={s.cardSub}>{totalReviews} total</Text>
                                    </View>
                                    {loading && reviews.length === 0 ? (
                                        <Animated.View style={{ opacity: pulseAnim, marginTop: 16 }}>
                                            {[1, 2, 3].map(i => <View key={i} style={{ height: 100, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 16 }} />)}
                                        </Animated.View>
                                    ) : reviews.length > 0 ? reviews.map((r, i) => (
                                        <ReviewRow key={r.id} review={r} isLast={i === reviews.length - 1} />
                                    )) : <EmptyState />}
                                </View>
                            </View>

                            {/* Right: Rating Breakdown */}
                            <View style={{ flex: 0.35 }}>
                                <BreakdownCard ratingCounts={ratingCounts} total={totalReviews} isLoading={loading && reviews.length === 0} pulseAnim={pulseAnim} />
                            </View>
                        </View>
                    ) : (
                        <>
                            <BreakdownCard ratingCounts={ratingCounts} total={totalReviews} isLoading={loading && reviews.length === 0} pulseAnim={pulseAnim} />
                            <View style={s.card}>
                                <View style={s.cardHead}>
                                    <Text style={s.cardTitle}>All Reviews</Text>
                                    <Text style={s.cardSub}>{totalReviews} total</Text>
                                </View>
                                {loading && reviews.length === 0 ? (
                                    <Animated.View style={{ opacity: pulseAnim, marginTop: 16 }}>
                                        {[1, 2, 3].map(i => <View key={i} style={{ height: 100, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 16 }} />)}
                                    </Animated.View>
                                ) : reviews.length > 0 ? reviews.map((r, i) => (
                                    <ReviewRow key={r.id} review={r} isLast={i === reviews.length - 1} />
                                )) : <EmptyState />}
                            </View>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

function ReviewRow({ review, isLast }: { review: Review; isLast: boolean }) {
    return (
        <View style={[s.reviewRow, isLast && { borderBottomWidth: 0 }]}>
            <View style={s.reviewAvatar}>
                <Text style={s.reviewAvatarTxt}>{review.customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={s.reviewerName}>{review.customerName}</Text>
                    <Text style={s.reviewDate}>
                        {new Date(review.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
                <StarRow rating={review.rating} size={13} />
                {review.comment ? (
                    <Text style={s.reviewComment}>{review.comment}</Text>
                ) : null}
            </View>
        </View>
    );
}

function BreakdownCard({ ratingCounts, total, isLoading, pulseAnim }: { ratingCounts: { star: number; count: number }[]; total: number; isLoading?: boolean; pulseAnim?: Animated.Value }) {
    return (
        <View style={[s.card, { marginBottom: 24 }]}>
            <View style={s.cardHead}>
                <Text style={s.cardTitle}>Rating Breakdown</Text>
                <View style={[s.chip, { backgroundColor: P_LIGHT }]}>
                    <TrendingUp size={11} color={P} />
                    <Text style={[s.chipTxt, { color: P }]}>{total} reviews</Text>
                </View>
            </View>
            <View style={{ marginTop: 16 }}>
                {isLoading && pulseAnim ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                        {[1, 2, 3, 4, 5].map(i => <View key={i} style={{ height: 24, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 8 }} />)}
                    </Animated.View>
                ) : (
                    ratingCounts.map(({ star, count }) => (
                        <RatingBar key={star} rating={star} count={count} total={total} />
                    ))
                )}
            </View>
        </View>
    );
}

function EmptyState() {
    return (
        <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center', paddingVertical: 24 }}>
            No reviews yet. They'll appear here once customers leave feedback.
        </Text>
    );
}

const s = StyleSheet.create({
    root:            { flex: 1, backgroundColor: BG },
    scroll:          { padding: 20, paddingBottom: 52 },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title:           { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    chip:            { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: BG },
    chipTxt:         { fontSize: 11, fontWeight: '700', fontFamily: 'Quicksand', color: SUB },
    statsRow:        { gap: 16, marginBottom: 24, zIndex: 100, overflow: 'visible' },
    card:            { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
    cardHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle:       { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    cardSub:         { fontSize: 13, color: SUB, fontFamily: 'Quicksand' },
    reviewRow:       { flexDirection: 'row', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
    reviewAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center' },
    reviewAvatarTxt: { fontSize: 16, fontWeight: '700', color: P, fontFamily: 'Quicksand' },
    reviewerName:    { fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' },
    reviewDate:      { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    reviewComment:   { fontSize: 13, color: '#4B5563', fontFamily: 'Quicksand', lineHeight: 20, marginTop: 8 },
});
