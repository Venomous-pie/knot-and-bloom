import { CATEGORY_REGISTRY } from './categories';
import { toTitleCase } from '../utils/textUtils';

/**
 * Curated tag suggestions mapped to product categories.
 * These help sellers pick high-quality, SEO-friendly tags
 * instead of typing freeform text that could be misspelled or irrelevant.
 */
export const TAG_SUGGESTIONS: Record<string, string[]> = Object.fromEntries(
    CATEGORY_REGISTRY.map(c => [c.title, c.tags.map(toTitleCase)])
);

/** Universal tags that apply to any handmade product */
export const UNIVERSAL_TAGS = [
    'handmade', 'artisan', 'gift', 'unique', 'custom',
    'eco-friendly', 'local', 'philippine-made', 'small business',
].map(toTitleCase);

/**
 * Validates a single tag string.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateTag(
    raw: string,
    existingTags: string[],
): { valid: true; cleaned: string } | { valid: false; reason: string } {
    // 1. Basic cleanup: trim, collapse whitespace
    let cleaned = raw.trim().replace(/\s+/g, ' ');

    // 2. Strip anything that isn't a letter, number, space, or hyphen
    cleaned = cleaned.replace(/[^a-zA-Z0-9\s\-]/g, '');

    // Re-trim after stripping (in case leading/trailing special chars)
    cleaned = cleaned.trim();
    
    // Apply title case
    cleaned = toTitleCase(cleaned);

    // 3. Empty after cleanup
    if (!cleaned) {
        return { valid: false, reason: 'Tag must contain letters or numbers.' };
    }

    // 4. Length checks
    if (cleaned.length < 2) {
        return { valid: false, reason: 'Tag must be at least 2 characters.' };
    }
    if (cleaned.length > 30) {
        return { valid: false, reason: 'Tag must be 30 characters or fewer.' };
    }

    // 5. No pure numbers (e.g. "12345" is not a useful tag)
    if (/^\d+$/.test(cleaned)) {
        return { valid: false, reason: 'Tag cannot be only numbers.' };
    }

    // 6. No excessive repeating characters (e.g. "aaaaaaa", "abcabcabc")
    if (/(.)\1{4,}/.test(cleaned)) {
        return { valid: false, reason: 'Tag contains too many repeated characters.' };
    }

    // 7. Duplicate check
    if (existingTags.includes(cleaned)) {
        return { valid: false, reason: `"${cleaned}" is already added.` };
    }

    // 8. Max tag count (belt-and-suspenders, UI also checks)
    if (existingTags.length >= 10) {
        return { valid: false, reason: 'Maximum of 10 tags reached.' };
    }

    return { valid: true, cleaned };
}
