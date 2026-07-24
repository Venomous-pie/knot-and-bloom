import { describe, expect, it } from '@jest/globals';
import { calculateRelevanceScore, ProductRelevanceInput, ValidatedSearchData } from '../recommendationEngine';

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
