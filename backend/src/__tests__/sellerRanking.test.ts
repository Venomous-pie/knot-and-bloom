import { calculateSpotlightAndRegularMakers } from '../utils/sellerRanking.js';

describe('sellerRanking', () => {
    const mainStore = {
        slug: 'knot-and-bloom',
        name: 'Knot & Bloom'
    };

    const goodSeller1 = {
        slug: 'good-seller-1',
        totalOrders: 20,
        rating: 5.0,
        user: { trustScore: 100 }
    };

    const goodSeller2 = {
        slug: 'good-seller-2',
        totalOrders: 15,
        rating: 4.9,
        user: { trustScore: 98 }
    };

    const goodSeller3 = {
        slug: 'good-seller-3',
        totalOrders: 15,
        rating: 4.8,
        user: { trustScore: 99 } // Ties with goodSeller2 on orders, but lower rating, higher trustScore. However, rating is primary tiebreaker.
    };

    const badSeller = {
        slug: 'bad-seller',
        totalOrders: 2,
        rating: 3.5,
        user: { trustScore: 80 }
    };

    it('should separate spotlight and regular makers correctly and pin main store to the top', () => {
        const allSellers = [badSeller, goodSeller2, mainStore, goodSeller1, goodSeller3];
        const { spotlightMakers, regularMakers } = calculateSpotlightAndRegularMakers(allSellers);

        expect(spotlightMakers.length).toBe(3);
        // Spotlight ranking: totalOrders DESC, rating DESC, trustScore DESC
        // 1: goodSeller1 (orders 20)
        // 2: goodSeller2 (orders 15, rating 4.9)
        // 3: goodSeller3 (orders 15, rating 4.8)
        expect(spotlightMakers[0].slug).toBe('good-seller-1');
        expect(spotlightMakers[1].slug).toBe('good-seller-2');
        expect(spotlightMakers[2].slug).toBe('good-seller-3');

        // Regular makers should have main store at the front
        expect(regularMakers[0].slug).toBe('knot-and-bloom');
        // The rest are the other sellers in their original relative order
        expect(regularMakers).toContainEqual(badSeller);
        expect(regularMakers).toContainEqual(goodSeller1);
    });

    it('should return empty spotlight array if less than 3 makers meet criteria', () => {
        const allSellers = [mainStore, goodSeller1, goodSeller2]; // Only 2 good sellers
        const { spotlightMakers, regularMakers } = calculateSpotlightAndRegularMakers(allSellers);

        expect(spotlightMakers.length).toBe(0);
        expect(regularMakers[0].slug).toBe('knot-and-bloom');
    });

    it('should handle trustScore tiebreaker', () => {
        const tied1 = { slug: 't1', totalOrders: 15, rating: 4.9, user: { trustScore: 96 } };
        const tied2 = { slug: 't2', totalOrders: 15, rating: 4.9, user: { trustScore: 99 } };
        const tied3 = { slug: 't3', totalOrders: 15, rating: 4.9, user: { trustScore: 95 } };

        const allSellers = [tied1, tied2, tied3];
        const { spotlightMakers } = calculateSpotlightAndRegularMakers(allSellers);

        expect(spotlightMakers.length).toBe(3);
        expect(spotlightMakers[0].slug).toBe('t2'); // highest trust
        expect(spotlightMakers[1].slug).toBe('t1');
        expect(spotlightMakers[2].slug).toBe('t3');
    });

    it('should filter out Knot & Bloom from spotlight even if it meets criteria', () => {
        const superKnotAndBloom = {
            slug: 'knot-and-bloom',
            totalOrders: 1000,
            rating: 5.0,
            user: { trustScore: 100 }
        };
        const allSellers = [superKnotAndBloom, goodSeller1, goodSeller2, goodSeller3];
        const { spotlightMakers, regularMakers } = calculateSpotlightAndRegularMakers(allSellers);

        // Knot and Bloom should NOT be in spotlight
        expect(spotlightMakers.some(s => s.slug === 'knot-and-bloom')).toBe(false);
        expect(spotlightMakers.length).toBe(3);
        expect(regularMakers[0].slug).toBe('knot-and-bloom');
    });
});
