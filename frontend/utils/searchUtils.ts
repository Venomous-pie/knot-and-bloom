export const fuzzySearchMap: Record<string, string> = {
    // Typos and variants mapped to standard category / keyword
    "croshet": "crochet",
    "crochat": "crochet",
    "crochit": "crochet",
    "key chain": "keychain",
    "key chains": "keychain",
    "keychains": "keychain",
    "witre art": "wire art",
    "wire flowers": "wire art",
    "stuff animal": "stuffed toys",
    "stuffed animal": "stuffed toys",
    "stuffed animals": "stuffed toys",
    "plushie": "stuffed toys",
    "plushies": "stuffed toys",
    "soft toy": "stuffed toys",
    "fluffy wire": "fuzzy wire art",
    "fuzze wire": "fuzzy wire art",
    "fuzzy wire": "fuzzy wire art",
    "bento": "bento cake",
    "bento box": "bento cake",
    "bento cakes": "bento cake",
    "bracelet": "bracelets",
    "beaded bracelet": "bracelets",
    "clay": "polymer clay",
    "earings": "earrings",
    "ear rings": "earrings",
    "clothes": "tops",
    "shirt": "tops",
    "tshirt": "tops",
    "t-shirt": "tops",
    "giftbox": "gift boxes",
    "gift box": "gift boxes",
    "gift sets": "gift boxes",
    "gift set": "gift boxes",
};

export function normalizeSearchQuery(query: string): string {
    if (!query) return "";
    
    // Convert to lowercase and trim
    let normalized = query.toLowerCase().trim();
    
    // Remove multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');

    // Check against fuzzy map
    if (fuzzySearchMap[normalized]) {
        return fuzzySearchMap[normalized];
    }
    
    // Check if any word in the query is in the map
    const words = normalized.split(' ');
    const mappedWords = words.map(word => fuzzySearchMap[word] || word);
    
    // Check if the joined mapped words match a category better
    const joinedMapped = mappedWords.join(' ');
    if (fuzzySearchMap[joinedMapped]) {
        return fuzzySearchMap[joinedMapped];
    }

    return joinedMapped;
}
