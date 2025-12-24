/**
 * Text capitalization utilities
 * Used for auto-capitalizing product form fields on blur
 */

/**
 * Convert string to Title Case (capitalize first letter of each word)
 * Example: "handmade crochet bear" -> "Handmade Crochet Bear"
 */
export function toTitleCase(str: string): string {
    if (!str) return str;

    // Handle common lowercase words that shouldn't be capitalized (unless first word)
    const smallWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'of', 'in'];

    return str
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (index === 0) {
                // Always capitalize first word
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            if (smallWords.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Convert string to Sentence Case (capitalize first letter after periods)
 * Example: "beautiful handmade item. perfect for gifts." -> "Beautiful handmade item. Perfect for gifts."
 */
export function toSentenceCase(str: string): string {
    if (!str) return str;

    // Split by sentence-ending punctuation
    return str
        .split(/(?<=[.!?])\s+/)
        .map(sentence => {
            if (!sentence) return sentence;
            const trimmed = sentence.trim();
            if (!trimmed) return sentence;
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        })
        .join(' ');
}

/**
 * Capitalize materials string (comma-separated, each item title cased)
 * Example: "cotton, wool, silk" -> "Cotton, Wool, Silk"
 */
export function capitalizeMaterials(str: string): string {
    if (!str) return str;

    return str
        .split(',')
        .map(material => toTitleCase(material.trim()))
        .join(', ');
}
