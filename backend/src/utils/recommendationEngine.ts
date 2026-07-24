import { z } from 'zod';

export const SearchDataSchema = z.array(
    z.object({
        term: z.string().min(1),
        count: z.number().int().nonnegative(),
        lastSearched: z.number().int().optional(),
    })
).max(15);

export type ValidatedSearchData = z.infer<typeof SearchDataSchema>;

export interface ProductRelevanceInput {
    uid: number;
    categories: string[];
    tags: string[];
    name: string;
    description: string | null;
}

/**
 * Calculates a relevance score for a single product based on past purchases and search terms.
 * Pure function isolated for testability.
 */
export function calculateRelevanceScore(
    product: ProductRelevanceInput,
    purchaseCategories: string[],
    searchData: ValidatedSearchData
): number {
    let score = 0;
    const prodCategoriesLower = product.categories.map(c => c.toLowerCase());
    const prodTagsLower = product.tags.map(t => t.toLowerCase());
    const prodNameLower = product.name.toLowerCase();
    const prodDescLower = product.description?.toLowerCase() || '';

    // 1. Category Matching from Past Purchases (High Signal)
    const matchedCategories = purchaseCategories.filter(cat => 
        prodCategoriesLower.includes(cat.toLowerCase())
    );
    score += matchedCategories.length * 10;

    // 2. Search Term Matching (Frequency/Recency Signal)
    for (const search of searchData) {
        const term = search.term.toLowerCase();
        let matchWeight = 0;

        if (prodCategoriesLower.some(c => c.includes(term))) matchWeight += 5;
        if (prodTagsLower.some(t => t.includes(term))) matchWeight += 4;
        if (prodNameLower.includes(term)) matchWeight += 3;
        if (prodDescLower.includes(term)) matchWeight += 1;

        if (matchWeight > 0) {
            // Factor in frequency (log scale to prevent runaway scoring from 100+ searches of same term)
            const frequencyMultiplier = Math.log10(Math.max(search.count, 1)) + 1;
            
            // Recency multiplier: Assume lastSearched is a timestamp in ms. 
            // Give a slight bump to very recent searches.
            let recencyMultiplier = 1;
            if (search.lastSearched) {
                const ageDays = (Date.now() - search.lastSearched) / (1000 * 60 * 60 * 24);
                if (ageDays < 1) recencyMultiplier = 1.5;
                else if (ageDays < 7) recencyMultiplier = 1.2;
            }

            score += matchWeight * frequencyMultiplier * recencyMultiplier;
        }
    }

    return score;
}
