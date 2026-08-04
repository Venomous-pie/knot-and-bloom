// Fuzzy search normalization: exact match -> phrase n-gram match -> edit-distance
// fallback -> phonetic fallback. suggestCorrection() is a separate, lower-confidence
// "did you mean" path for when nothing above resolves.

export const CANONICAL_CATEGORIES: string[] = [
    "crochet",
    "keychain",
    "wire art",
    "stuffed toys",
    "fuzzy wire art",
    "bento cake",
    "bracelets",
    "polymer clay",
    "earrings",
    "tops",
    "gift boxes",
];

const SYNONYM_ENTRIES: [string, string][] = [
    ["croshet", "crochet"],
    ["crochat", "crochet"],
    ["crochit", "crochet"],

    ["key chain", "keychain"],
    ["key chains", "keychain"],
    ["keychains", "keychain"],

    ["witre art", "wire art"],
    ["wire flowers", "wire art"],

    ["stuff animal", "stuffed toys"],
    ["stuffed animal", "stuffed toys"],
    ["stuffed animals", "stuffed toys"],
    ["plushie", "stuffed toys"],
    ["plushies", "stuffed toys"],
    ["soft toy", "stuffed toys"],

    ["fluffy wire", "fuzzy wire art"],
    ["fuzze wire", "fuzzy wire art"],
    ["fuzzy wire", "fuzzy wire art"],

    ["bento", "bento cake"],
    ["bento box", "bento cake"],
    ["bento cakes", "bento cake"],

    ["bracelet", "bracelets"],
    ["beaded bracelet", "bracelets"],

    ["clay", "polymer clay"],

    ["earings", "earrings"],
    ["ear rings", "earrings"],

    ["clothes", "tops"],
    ["shirt", "tops"],
    ["tshirt", "tops"],
    ["t shirt", "tops"], // hyphens normalized to spaces before lookup

    ["giftbox", "gift boxes"],
    ["gift box", "gift boxes"],
    ["gift sets", "gift boxes"],
    ["gift set", "gift boxes"],
];

const SYNONYM_MAP = new Map<string, string>(SYNONYM_ENTRIES);

const MAX_SYNONYM_PHRASE_WORDS = Math.max(
    ...SYNONYM_ENTRIES.map(([phrase]) => phrase.split(" ").length)
);

// Fuzzy match candidates: canonical category words + recognized synonym words
// (e.g. "shirt", "clay"), so a typo of a synonym also resolves.
const VOCAB_TOKENS: string[] = Array.from(
    new Set([
        ...CANONICAL_CATEGORIES.flatMap((c) => c.split(" ")),
        ...SYNONYM_ENTRIES.flatMap(([key]) => key.split(" ")),
    ])
);

function levenshtein(a: string, b: string, maxDistance: number): number {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        let rowMin = curr[0];
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            rowMin = Math.min(rowMin, curr[j]);
        }
        if (rowMin > maxDistance) return maxDistance + 1;
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }

    return prev[b.length];
}

function thresholdFor(word: string): number {
    if (word.length <= 4) return 1;
    if (word.length <= 7) return 2;
    return 3;
}

const SOUNDEX_CODES: Record<string, string> = {
    b: "1", f: "1", p: "1", v: "1",
    c: "2", g: "2", j: "2", k: "2", q: "2", s: "2", x: "2", z: "2",
    d: "3", t: "3",
    l: "4",
    m: "5", n: "5",
    r: "6",
};

function soundex(word: string): string {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return "";

    let code = w[0].toUpperCase();
    let lastDigit = SOUNDEX_CODES[w[0]] ?? "";

    for (let i = 1; i < w.length && code.length < 4; i++) {
        const digit = SOUNDEX_CODES[w[i]];
        if (digit) {
            if (digit !== lastDigit) code += digit;
            lastDigit = digit;
        } else if (w[i] !== "h" && w[i] !== "w") {
            lastDigit = ""; // vowel breaks adjacency
        }
    }

    return (code + "000").slice(0, 4);
}

const VOCAB_SOUNDEX: Map<string, string[]> = (() => {
    const map = new Map<string, string[]>();
    for (const token of VOCAB_TOKENS) {
        const code = soundex(token);
        const existing = map.get(code);
        if (existing) existing.push(token);
        else map.set(code, [token]);
    }
    return map;
})();

function resolveToken(token: string): string {
    return SYNONYM_MAP.get(token) ?? token;
}

/**
 * Nearest match for `word` against known vocabulary: edit-distance first,
 * then phonetic (soundex) if edit-distance found nothing and the phonetic
 * bucket has exactly one candidate (ambiguous buckets are skipped rather
 * than guessed).
 */
function closestCanonicalToken(word: string): string | null {
    if (word.length < 3) return null;

    const maxDistance = thresholdFor(word);
    let best: { token: string; distance: number } | null = null;

    for (const token of VOCAB_TOKENS) {
        const distance = levenshtein(word, token, maxDistance);
        if (distance <= maxDistance && (!best || distance < best.distance)) {
            best = { token, distance };
            if (distance === 0) break;
        }
    }

    if (best) return resolveToken(best.token);

    const phoneticMatches = VOCAB_SOUNDEX.get(soundex(word));
    if (phoneticMatches && phoneticMatches.length === 1) {
        return resolveToken(phoneticMatches[0]);
    }

    return null;
}

function cleanQuery(query: string): string {
    return query
        .toLowerCase()
        .trim()
        .replace(/-/g, " ")
        .replace(/\s+/g, " ");
}

function dedupeAdjacentWords(text: string): string {
    const words = text.split(" ");
    const result: string[] = [];
    for (const word of words) {
        if (result[result.length - 1] !== word) result.push(word);
    }
    return result.join(" ");
}

function resolveWords(words: string[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < words.length) {
        let matchedLen = 0;

        for (let len = Math.min(MAX_SYNONYM_PHRASE_WORDS, words.length - i); len >= 1; len--) {
            const phrase = words.slice(i, i + len).join(" ");
            const mapped = SYNONYM_MAP.get(phrase);
            if (mapped) {
                result.push(mapped);
                matchedLen = len;
                break;
            }
        }

        if (matchedLen > 0) {
            i += matchedLen;
            continue;
        }

        const word = words[i];
        result.push(closestCanonicalToken(word) ?? word);
        i += 1;
    }

    return result;
}

export function normalizeSearchQuery(query: string): string {
    if (!query) return "";

    const cleaned = cleanQuery(query);

    const exact = SYNONYM_MAP.get(cleaned);
    if (exact) return exact;

    const words = cleaned.split(" ").filter(Boolean);
    if (words.length === 0) return "";

    const joined = dedupeAdjacentWords(resolveWords(words).join(" "));
    return SYNONYM_MAP.get(joined) ?? joined;
}

/**
 * Lower-confidence "did you mean" suggestion for single-word queries that
 * normalizeSearchQuery couldn't resolve. Uses a relaxed distance cap instead
 * of thresholdFor's stricter one - intended for a UI prompt the user
 * confirms, not for silent auto-correction.
 */
export function suggestCorrection(query: string): string | null {
    const cleaned = cleanQuery(query);
    if (!cleaned || normalizeSearchQuery(query) !== cleaned) return null;

    const words = cleaned.split(" ").filter(Boolean);
    if (words.length !== 1) return null;

    const word = words[0];
    if (word.length < 3) return null;

    const relaxedMax = thresholdFor(word) + 1;
    let best: { token: string; distance: number } | null = null;

    for (const token of VOCAB_TOKENS) {
        const distance = levenshtein(word, token, relaxedMax);
        if (distance <= relaxedMax && (!best || distance < best.distance)) {
            best = { token, distance };
        }
    }

    return best ? resolveToken(best.token) : null;
}