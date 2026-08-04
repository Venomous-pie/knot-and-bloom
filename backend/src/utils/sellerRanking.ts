export function calculateSpotlightAndRegularMakers(allSellers: any[], mainStoreSlug: string = 'knot-and-bloom-official') {
    const knotAndBloomStore = allSellers.find((s: any) => s.slug === mainStoreSlug);
    const otherSellers = allSellers.filter((s: any) => s.slug !== mainStoreSlug);

    // All sellers (including the main store) compete fairly for spotlight
    let spotlightMakers = allSellers.filter((s: any) => {
        const totalOrders = s.totalOrders || 0;
        const rating = s.rating ? Number(s.rating) : 0;
        const trustScore = s.user?.trustScore ?? 0;
        return totalOrders >= 10 && rating >= 4.8 && trustScore >= 95;
    });

    spotlightMakers.sort((a: any, b: any) => {
        const totalOrdersA = a.totalOrders || 0;
        const totalOrdersB = b.totalOrders || 0;
        if (totalOrdersA !== totalOrdersB) return totalOrdersB - totalOrdersA;

        const ratingA = a.rating ? Number(a.rating) : 0;
        const ratingB = b.rating ? Number(b.rating) : 0;
        if (ratingA !== ratingB) return ratingB - ratingA;

        const trustScoreA = a.user?.trustScore ?? 0;
        const trustScoreB = b.user?.trustScore ?? 0;
        return trustScoreB - trustScoreA;
    });

    spotlightMakers = spotlightMakers.slice(0, 3);
    if (spotlightMakers.length < 3) {
        spotlightMakers = [];
    }

    // ALL MAKERS grid: main store is always pinned first, others follow in order
    let regularMakers = [...otherSellers];
    if (knotAndBloomStore) {
        regularMakers.unshift(knotAndBloomStore);
    }

    return {
        spotlightMakers,
        regularMakers
    };
}
