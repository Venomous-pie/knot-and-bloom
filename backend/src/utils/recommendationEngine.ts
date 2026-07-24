import { z } from 'zod';

export const STOP_WORDS = new Set([
    'and', 'the', 'for', 'with', 'in', 'of', 'on', 'at', 'by', 'to', 'a', 'an', 'is', 'are'
]);

// Normalizes a string for keyword matching
// Note: Trailing 's' stripping is a known-lossy heuristic (e.g. 'glass' -> 'glas').
// It's a blunt instrument fine for a v1 keyword-overlap signal, but may have edge cases.
export function normalizeKeyword(word: string): string {
    let lower = word.toLowerCase().trim();
    if (lower.length > 3 && lower.endsWith('s')) {
        lower = lower.slice(0, -1);
    }
    return lower;
}

export function extractKeywords(text: string): string[] {
    if (!text) return [];
    // Split by non-alphanumeric, filter out stop words and short words
    const words = text.split(/[^a-zA-Z0-9]+/);
    return words
        .map(normalizeKeyword)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

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

/**
 * Calculates a similarity score between a target product and a candidate product.
 * Used for item-to-item recommendations on the PDP.
 */
export function calculateSimilarityScore(
    targetProduct: ProductRelevanceInput,
    candidateProduct: ProductRelevanceInput
): number {
    let score = 0;

    const targetCategories = (targetProduct.categories || []).map(c => c.toLowerCase());
    const candidateCategories = (candidateProduct.categories || []).map(c => c.toLowerCase());
    const targetTags = (targetProduct.tags || []).map(t => t.toLowerCase());
    const candidateTags = (candidateProduct.tags || []).map(t => t.toLowerCase());

    // 1. Shared Categories (+10 pts each)
    const sharedCategories = targetCategories.filter(c => candidateCategories.includes(c));
    score += sharedCategories.length * 10;

    // 2. Shared Tags (+5 pts each)
    const sharedTags = targetTags.filter(t => candidateTags.includes(t));
    score += sharedTags.length * 5;

    // 3. Shared Title Keywords (+2 pts each)
    const targetKeywords = extractKeywords(targetProduct.name);
    const candidateKeywords = extractKeywords(candidateProduct.name);
    
    // Only count unique shared keywords to prevent duplicate weighting if a word appears twice
    const uniqueTargetKeywords = new Set(targetKeywords);
    const sharedKeywords = Array.from(uniqueTargetKeywords).filter(k => candidateKeywords.includes(k));
    score += sharedKeywords.length * 2;

    return score;
}
