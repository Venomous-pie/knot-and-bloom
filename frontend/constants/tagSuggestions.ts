/**
 * Curated tag suggestions mapped to product categories.
 * These help sellers pick high-quality, SEO-friendly tags
 * instead of typing freeform text that could be misspelled or irrelevant.
 */

export const TAG_SUGGESTIONS: Record<string, string[]> = {
    'Crochet': [
        'handmade', 'crochet', 'yarn', 'cotton', 'handcrafted',
        'cozy', 'knitted', 'fiber art', 'artisan', 'soft',
    ],
    'Fuzzy Wire Art': [
        'fuzzy wire', 'wire art', 'handmade', 'desk decor',
        'miniature', 'cute', 'figurine', 'kawaii', 'collectible',
    ],
    'Gift Boxes/Sets': [
        'gift set', 'gift box', 'birthday', 'anniversary', 'valentines',
        'christmas', 'for her', 'for him', 'surprise', 'premium',
    ],
    'Hair Ties': [
        'hair tie', 'hair accessory', 'scrunchie', 'ponytail',
        'elastic', 'handmade', 'cute', 'everyday', 'pastel',
    ],
    'Fuzzy Wire Bouquets': [
        'bouquet', 'fuzzy wire', 'flowers', 'forever flowers',
        'artificial', 'gift', 'romantic', 'decor', 'colorful',
    ],
    'Crochet Flower Bouquets': [
        'crochet flowers', 'bouquet', 'forever flowers', 'handmade',
        'yarn flowers', 'gift', 'romantic', 'wedding', 'decor',
    ],
    'Crochet Key Chains': [
        'keychain', 'crochet', 'mini', 'cute', 'accessory',
        'bag charm', 'handmade', 'amigurumi', 'kawaii',
    ],
    'Amigurumi Plushies': [
        'amigurumi', 'plushie', 'stuffed toy', 'crochet', 'cute',
        'kawaii', 'handmade', 'soft toy', 'nursery', 'kids',
    ],
    'Beaded Jewelry': [
        'beaded', 'jewelry', 'bracelet', 'necklace', 'handmade',
        'accessory', 'elegant', 'boho', 'minimalist', 'dainty',
    ],
    'Phone Charms': [
        'phone charm', 'phone strap', 'accessory', 'cute',
        'beaded', 'handmade', 'kawaii', 'aesthetic', 'trendy',
    ],
    'Scrunchies': [
        'scrunchie', 'hair accessory', 'handmade', 'silk',
        'satin', 'cute', 'everyday', 'pastel', 'elastic',
    ],
    'Resin Crafts': [
        'resin', 'resin art', 'handmade', 'epoxy', 'clear',
        'glitter', 'dried flowers', 'jewelry', 'coaster', 'trinket',
    ],
    'Bookmarks': [
        'bookmark', 'reading', 'book lover', 'handmade',
        'crochet', 'beaded', 'gift', 'aesthetic', 'literary',
    ],
    'Tote Bags': [
        'tote bag', 'bag', 'handmade', 'canvas', 'eco-friendly',
        'reusable', 'crochet', 'market bag', 'everyday', 'boho',
    ],
    'Stickers & Prints': [
        'sticker', 'print', 'art print', 'illustration', 'cute',
        'aesthetic', 'journal', 'planner', 'kawaii', 'waterproof',
    ],
    'Clay Accessories': [
        'clay', 'polymer clay', 'earrings', 'handmade', 'accessory',
        'lightweight', 'boho', 'minimalist', 'colorful', 'dainty',
    ],
    'Key Chains': [
        'keychain', 'key ring', 'accessory', 'handmade', 'cute',
        'bag charm', 'gift', 'personalized', 'mini', 'trendy',
    ],
    'Flower Boquets': [
        'bouquet', 'flowers', 'gift', 'romantic', 'anniversary',
        'birthday', 'forever flowers', 'dried flowers', 'decor', 'elegant',
    ],
};

/** Universal tags that apply to any handmade product */
export const UNIVERSAL_TAGS = [
    'handmade', 'artisan', 'gift', 'unique', 'custom',
    'eco-friendly', 'local', 'philippine-made', 'small business',
];

/**
 * Validates a single tag string.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateTag(
    raw: string,
    existingTags: string[],
): { valid: true; cleaned: string } | { valid: false; reason: string } {
    // 1. Basic cleanup: trim, lowercase, collapse whitespace
    let cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ');

    // 2. Strip anything that isn't a letter, number, space, or hyphen
    cleaned = cleaned.replace(/[^a-z0-9\s\-]/g, '');

    // Re-trim after stripping (in case leading/trailing special chars)
    cleaned = cleaned.trim();

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
