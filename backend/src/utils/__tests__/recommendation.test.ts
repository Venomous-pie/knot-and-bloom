import { describe, expect, it } from '@jest/globals';
import { calculateRelevanceScore, calculateSimilarityScore } from '../recommendationEngine.js';
import type { ProductRelevanceInput, ValidatedSearchData } from '../recommendationEngine.js';

describe('Recommendation Engine Scoring', () => {
    const baseProduct: ProductRelevanceInput = {
        uid: 1,
        categories: [],
        tags: [],
        name: 'Basic Item',
        description: 'Just a normal item.'
    };

    it('scores 0 when no match exists', () => {
        const score = calculateRelevanceScore(
            baseProduct,
            ['Shoes'],
            [{ term: 'necklace', count: 1 }]
        );
        expect(score).toBe(0);
    });

    it('adds 10 points per matched category from purchases', () => {
        const product = { ...baseProduct, categories: ['Shirts', 'Pants'] };
        const score = calculateRelevanceScore(product, ['shirts', 'accessories'], []);
        expect(score).toBe(10);
    });

    it('adds points for search term matches (category=5, tag=4, name=3, desc=1)', () => {
        const product = { ...baseProduct, categories: ['jewelry'], tags: ['gold'], name: 'Gold Ring', description: 'beautiful ring' };
        
        // category match = 5
        expect(calculateRelevanceScore(product, [], [{ term: 'jewelry', count: 1 }])).toBe(5);
        // tag match (4) + name match (3 for Gold Ring) = 7
        expect(calculateRelevanceScore(product, [], [{ term: 'gold', count: 1 }])).toBe(7 * (Math.log10(1) + 1));
        // name (3) + desc (1) match = 4
        expect(calculateRelevanceScore(product, [], [{ term: 'ring', count: 1 }])).toBe(4);
        // description match = 1
        expect(calculateRelevanceScore(product, [], [{ term: 'beautiful', count: 1 }])).toBe(1);
    });

    it('multiplies search term score by frequency and recency', () => {
        const product = { ...baseProduct, name: 'Silver Ring' };
        
        const singleSearch = calculateRelevanceScore(product, [], [{ term: 'ring', count: 1 }]);
        const frequentSearch = calculateRelevanceScore(product, [], [{ term: 'ring', count: 10 }]);
        const recentSearch = calculateRelevanceScore(product, [], [{ term: 'ring', count: 1, lastSearched: Date.now() }]);

        // Math.log10(10) + 1 = 2
        expect(frequentSearch).toBe(singleSearch * 2);
        
        // ageDays < 1 -> 1.5 multiplier
        expect(recentSearch).toBe(singleSearch * 1.5);
    });
});

describe('Recommendation Engine - Item Similarity Scoring', () => {
    const targetProduct: ProductRelevanceInput = {
        uid: 1,
        categories: ['Jewelry', 'Accessories'],
        tags: ['gold', 'handmade', 'vintage'],
        name: 'Vintage Gold Necklace',
        description: ''
    };

    it('scores 10 pts for each shared category', () => {
        const candidate = {
            uid: 2,
            categories: ['Jewelry'],
            tags: [],
            name: 'Generic Item',
            description: ''
        };
        // shared: 'Jewelry' (1) -> 10 pts
        // words: no match
        expect(calculateSimilarityScore(targetProduct, candidate)).toBe(10);
    });

    it('scores 5 pts for each shared tag', () => {
        const candidate = {
            uid: 2,
            categories: ['Other'],
            tags: ['handmade', 'vintage'],
            name: 'Generic Item',
            description: ''
        };
        // shared tags: 'handmade', 'vintage' (2) -> 10 pts
        expect(calculateSimilarityScore(targetProduct, candidate)).toBe(10);
    });

    it('scores 2 pts for each shared title keyword (normalized and stop words ignored)', () => {
        const candidate = {
            uid: 2,
            categories: [],
            tags: [],
            name: 'The Gold Necklaces', // Tests stop words ('the') and plural ('necklaces')
            description: ''
        };
        // 'The' is stop word. 'Gold' matches 'gold'. 'Necklaces' -> 'necklace' matches 'necklace'.
        // 2 shared keywords -> 4 pts.
        expect(calculateSimilarityScore(targetProduct, candidate)).toBe(4);
    });

    it('combines scores correctly', () => {
        const candidate = {
            uid: 2,
            categories: ['Jewelry'], // 10
            tags: ['gold'], // 5
            name: 'Gold Ring', // 2 ('gold')
            description: ''
        };
        expect(calculateSimilarityScore(targetProduct, candidate)).toBe(17);
    });

    it('handles products with no categories or tags safely without crashing', () => {
        const candidate = {
            uid: 2,
            categories: [] as any,
            tags: undefined as any,
            name: 'Mystery Item',
            description: ''
        };
        // Should not crash, and score should be 0
        expect(calculateSimilarityScore(targetProduct, candidate)).toBe(0);
    });
});
