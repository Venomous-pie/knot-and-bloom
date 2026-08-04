import prisma from "../utils/prismaUtils.js";
import CategoryCodes from '../constant/categories.js';
import type { GenerateSKUInput, GenerateVariantSKUInput, ProductDescriptionInput } from '../types/productTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// Utility: pick a random item from an array
// ─────────────────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// COPY POOLS — The raw material for unique, catchy descriptions
// ─────────────────────────────────────────────────────────────────────────────

const HOOKS = [
    "Meet your new favorite handmade treasure —",
    "Handcrafted with love and serious attention to detail,",
    "Every piece tells a story —",
    "Made by hand, made with heart:",
    "Looking for something truly one-of-a-kind?",
    "Small batch. Big personality.",
    "Crafted carefully, just for you —",
    "Say hello to your next obsession:",
    "This one was made with extra love —",
    "Handmade doesn't mean ordinary —",
];

const CLOSINGS = [
    "Order yours before it's gone! ✨",
    "Each piece is one of a kind — grab yours today.",
    "Perfect as a gift or a treat for yourself. 🎁",
    "Limited quantities — handmade takes time! 🧵",
    "A little piece of handmade magic, ready for you.",
    "Because the best things are made with care. 💛",
    "Thoughtfully made. Instantly loved.",
    "You won't find this anywhere else. 🌸",
    "Made in small batches so every one feels special.",
    "Don't wait — handmade pieces go fast!",
];

// Category-specific descriptor pools: [quality adjective, craft method, vibe]
const CATEGORY_COPY: Record<string, { adjectives: string[]; craft: string[]; vibe: string[] }> = {
    "crochet": {
        adjectives: ["irresistibly soft", "lovingly stitched", "beautifully crafted", "cozy and charming", "intricately looped"],
        craft: ["crocheted stitch by stitch", "hand-worked with premium yarn", "crafted loop by loop", "made with careful crochet techniques"],
        vibe: ["wraps you in warmth and whimsy", "brings cozy charm to any space", "is equal parts cute and comforting", "has that handmade magic you can feel"],
    },
    "fuzzy-wire-art": {
        adjectives: ["strikingly sculptural", "playfully dimensional", "endlessly charming", "artistically shaped", "wonderfully tactile"],
        craft: ["hand-twisted with fuzzy craft wire", "sculpted wire by wire", "bent and shaped entirely by hand", "crafted with careful wire artistry"],
        vibe: ["stands out as a conversation piece", "adds a fun 3D flair to any collection", "is the kind of piece people stop and stare at", "brings a burst of personality wherever it goes"],
    },
    "accessories": {
        adjectives: ["effortlessly chic", "thoughtfully designed", "uniquely handcrafted", "style-forward and artisan-made", "beautifully finished"],
        craft: ["handmade with precision and care", "crafted by hand from quality materials", "assembled piece by piece with attention to detail", "made with a meticulous handmade process"],
        vibe: ["elevates any outfit instantly", "adds that personal touch no mass-market piece can match", "is the finishing detail your look has been missing", "turns heads without trying too hard"],
    },
    "tops": {
        adjectives: ["comfortably unique", "artisan-made and flattering", "softly handcrafted", "one-of-a-kind wearable art", "effortlessly stylish"],
        craft: ["handcrafted for a fit that feels personal", "made by hand for a truly individual look", "crafted with care from fabric to finish", "hand-worked for quality you can feel"],
        vibe: ["makes getting dressed feel special", "brings artisan flair to your everyday wardrobe", "is the kind of top you'll reach for again and again", "tells the world you have an eye for the unique"],
    },
    "hair-tie": {
        adjectives: ["adorably cute", "gentle on your hair", "handmade and hair-safe", "charmingly crafted", "delightfully unique"],
        craft: ["hand-assembled with care", "crafted for both style and function", "made to be as gentle as it is cute", "handmade to last through every wear"],
        vibe: ["makes your hair day a little more magical", "is the small detail that makes a big difference", "adds a cute finishing touch to any hairstyle", "turns a simple bun into a statement"],
    },
    "mini-stuffed-toy": {
        adjectives: ["squeeze-worthy soft", "huggably adorable", "lovingly hand-stitched", "irresistibly cuddly", "perfectly palm-sized"],
        craft: ["hand-stitched with cozy stuffing", "crafted with soft materials from the inside out", "made stitch by stitch with so much care", "filled and finished entirely by hand"],
        vibe: ["is the kind of gift that gets kept forever", "brings an instant smile to anyone who sees it", "is pure, squeezable joy in your hands", "is too cute to put down once you pick it up"],
    },
    "fuzzy-wire-bouquet": {
        adjectives: ["everlastingly beautiful", "artfully arranged", "strikingly lush", "uniquely handmade", "timelessly charming"],
        craft: ["hand-arranged with fuzzy wire flowers", "crafted bloom by bloom with wire and care", "sculpted into a bouquet that never wilts", "assembled entirely by hand for a forever-fresh look"],
        vibe: ["looks stunning on any shelf or desk", "never wilts, never fades — just stays beautiful", "makes the perfect gift that lasts a lifetime", "brings the beauty of a bouquet without the upkeep"],
    },
    "crochet-flower-bouquet": {
        adjectives: ["eternally blooming", "delicately crocheted", "charmingly handcrafted", "soft and strikingly beautiful", "lovingly looped into life"],
        craft: ["crocheted petal by petal with premium yarn", "hand-worked into blooms that last forever", "crafted loop by loop into a bouquet that never wilts", "made with careful crochet work from stem to petal"],
        vibe: ["stays in bloom long after real flowers fade", "is the bouquet you give someone you want to remember forever", "makes a stunning display on any surface", "brings a warm, handmade touch to any room"],
    },
    "crochet-key-chains": {
        adjectives: ["pocket-sized and adorable", "charmingly crocheted", "durably handmade", "tiny but full of personality", "lovingly crafted down to the last stitch"],
        craft: ["crocheted by hand with durable yarn", "hand-worked into the tiniest, cutest form", "made stitch by stitch to hang with you everywhere", "crafted with care for something you'll carry every day"],
        vibe: ["makes every key moment a cute one", "brings a smile every time you reach for your keys", "is the kind of small thing that means a lot", "adds personality to the most everyday accessory"],
    },
};

const CATEGORY_LABELS: Record<string, string> = {
    "crochet": "crochet",
    "fuzzy-wire-art": "fuzzy wire art",
    "accessories": "handmade accessory",
    "tops": "handmade top",
    "hair-tie": "handmade hair tie",
    "mini-stuffed-toy": "mini stuffed toy",
    "fuzzy-wire-bouquet": "fuzzy wire bouquet",
    "crochet-flower-bouquet": "crochet flower bouquet",
    "crochet-key-chains": "crochet keychain",
};

const DEFAULT_COPY = {
    adjectives: ["beautifully handcrafted", "thoughtfully made", "artisan-quality", "carefully crafted", "uniquely handmade"],
    craft: ["made entirely by hand", "crafted with care and skill", "hand-finished with precision", "made with genuine artisan craftsmanship"],
    vibe: ["is the kind of piece you won't find mass-produced", "carries that unmistakable handmade charm", "was made with real care — and you can feel it", "stands apart from anything factory-made"],
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function generateProductDescription(product: ProductDescriptionInput): Promise<string | null> {
    const copy = CATEGORY_COPY[product.category] ?? DEFAULT_COPY;
    const categoryLabel = CATEGORY_LABELS[product.category] ?? product.category;

    const hook = pick(HOOKS);
    const adjective = pick(copy.adjectives);
    const craft = pick(copy.craft);
    const vibe = pick(copy.vibe);
    const closing = pick(CLOSINGS);

    // Core sentence: hook + adjective product name
    const intro = `${hook} the ${adjective} **${product.name}**.`;

    // Craft sentence: what it is and how it was made
    const craftSentence = `This ${categoryLabel} is ${craft}, so every single one is unique.`;

    // Vibe sentence
    const vibeSentence = `It ${vibe}.`;

    // Variant sentence (only if variants exist and aren't just "Default")
    const realVariants = (product.variants ?? [])
        .map(v => v.name)
        .filter(v => v.toLowerCase() !== 'default');

    const variantSentence = realVariants.length > 0
        ? `Available in ${realVariants.join(', ')} — choose your favorite!`
        : '';

    // Price sentence
    const priceSentence = (() => {
        if (product.discountedPrice && product.basePrice) {
            return `Now available at ₱${product.discountedPrice} (down from ₱${product.basePrice}).`;
        }
        if (product.basePrice) {
            return `Yours for ₱${product.basePrice}.`;
        }
        return '';
    })();

    const parts = [intro, craftSentence, vibeSentence, variantSentence, priceSentence, closing]
        .filter(Boolean)
        .join(' ');

    return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION VALUES GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

const OPTION_VALUE_POOLS: Record<string, string[]> = {
    // Colors
    "color": ["Blush Pink", "Sage Green", "Sky Blue", "Lavender", "Cream White", "Terracotta", "Dusty Rose", "Mint", "Charcoal", "Peach"],
    "colour": ["Blush Pink", "Sage Green", "Sky Blue", "Lavender", "Cream White", "Terracotta", "Dusty Rose", "Mint", "Charcoal", "Peach"],
    // Sizes
    "size": ["Small", "Medium", "Large", "Extra Small", "Extra Large", "One Size"],
    // Scents
    "scent": ["Vanilla Bean", "Lavender Calm", "Fresh Citrus", "Rose Garden", "Sandalwood", "Coconut Breeze", "Green Tea", "Sweet Honey"],
    "fragrance": ["Vanilla Bean", "Lavender Calm", "Fresh Citrus", "Rose Garden", "Sandalwood", "Coconut Breeze", "Green Tea", "Sweet Honey"],
    // Materials
    "material": ["Cotton Yarn", "Acrylic Yarn", "Wool Blend", "Velvet Yarn", "Bamboo Fiber", "Chunky Knit"],
    // Bundle / quantity
    "bundle": ["Single Piece", "Set of 2", "Set of 3", "Gift Set (5 pcs)", "Bulk Pack (10 pcs)", "Collector's Bundle"],
    "bundle size": ["Single Piece", "Set of 2", "Set of 3", "Gift Set (5 pcs)", "Bulk Pack (10 pcs)", "Collector's Bundle"],
    "quantity": ["1 piece", "2 pieces", "3 pieces", "5 pieces", "10 pieces", "Custom quantity"],
    // Design / style
    "design": ["Classic", "Floral", "Minimalist", "Boho", "Kawaii", "Pastel Dream"],
    "style": ["Classic", "Floral", "Minimalist", "Boho", "Kawaii", "Pastel Dream"],
    "pattern": ["Solid Color", "Striped", "Floral", "Polka Dot", "Geometric", "Abstract"],
    // Occasion
    "occasion": ["Everyday Use", "Gift / Special Occasion", "Wedding", "Birthday", "Anniversary", "Valentine's Day"],
};

export async function generateOptionValues(optionName: string): Promise<string[]> {
    const key = optionName.toLowerCase().trim();

    // Direct match first
    if (OPTION_VALUE_POOLS[key]) {
        const pool = OPTION_VALUE_POOLS[key];
        // Shuffle and return 6
        return [...pool].sort(() => Math.random() - 0.5).slice(0, 6);
    }

    // Partial match — find the first pool whose key is contained in the option name
    const partialKey = Object.keys(OPTION_VALUE_POOLS).find(k => key.includes(k) || k.includes(key));
    if (partialKey) {
        return [...OPTION_VALUE_POOLS[partialKey]!].sort(() => Math.random() - 0.5).slice(0, 6);
    }

    // Generic fallback: generate reasonable-sounding option values
    const fallback = ["Option A", "Option B", "Option C", "Option D", "Option E", "Option F"];
    return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKU GENERATORS (unchanged — pure logic, no ML needed)
// ─────────────────────────────────────────────────────────────────────────────

function buildSKU(category: string, variants?: Array<{ name: string }>, name?: string): string {
    const normalizedCategory = category.toLowerCase().replace(/[^a-z]/g, '');
    let categoryCode = 'GEN';
    
    if (normalizedCategory.includes('crochet')) categoryCode = 'CROC';
    else if (normalizedCategory.includes('wire')) categoryCode = 'WIRE';
    else if (normalizedCategory.includes('bead')) categoryCode = 'BEAD';
    else if (normalizedCategory.includes('bag')) categoryCode = 'BAG';
    else if (normalizedCategory.includes('plush')) categoryCode = 'PLSH';
    else if (normalizedCategory.includes('resin')) categoryCode = 'RSIN';
    else if (normalizedCategory.includes('clay')) categoryCode = 'CLAY';
    else if (normalizedCategory.includes('art')) categoryCode = 'ART';
    else if (normalizedCategory.includes('accessories')) categoryCode = 'ACC';
    else categoryCode = category.replace(/[^A-Za-z]/g, '').substring(0, 4).toUpperCase();

    if (!categoryCode) categoryCode = 'GEN';

    const parts = [categoryCode];

    if (name) {
        const words = name.trim().split(/\s+/).filter(w => w.length > 0);
        let nameAcronym = '';
        if (words.length > 1) {
            nameAcronym = words.map(w => w[0]?.toUpperCase()).join('').replace(/[^A-Z0-9]/g, '').substring(0, 4);
        } else if (words.length === 1) {
            nameAcronym = words[0]!.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
        }
        
        if (nameAcronym) {
            parts.push(nameAcronym);
        }
    }

    return parts.join('-');
}

export async function generateProductSKU(input: GenerateSKUInput): Promise<string> {
    const baseSku = buildSKU(input.category, input.variants, input.name);
    
    let sku = baseSku;
    let sequence = 1;

    while (true) {
        const exists = await prisma.product.findUnique({
            where: { sku },
            select: { uid: true }
        });

        if (!exists) {
            return sku;
        }

        sequence++;
        sku = `${baseSku}-${sequence}`;
    }
}

export async function generateVariantSKU(input: GenerateVariantSKUInput): Promise<string> {
    if (!input.baseSKU || !input.variantName) {
        return input.baseSKU;
    }

    const words = input.variantName.trim().split(/\s+/).filter(w => w.length > 0);
    let cleanVariant = '';
    if (words.length > 1) {
        cleanVariant = words.map(w => w[0]?.toUpperCase()).join('').replace(/[^A-Z0-9]/g, '').substring(0, 4);
    } else if (words.length === 1) {
        cleanVariant = words[0]!.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
    }
    
    if (!cleanVariant) cleanVariant = 'VAR';

    const baseVariantSKU = `${input.baseSKU}-${cleanVariant}`;
    let variantSKU = baseVariantSKU;
    let sequence = 1;

    while (true) {
        const exists = await prisma.productVariant.findFirst({
            where: { sku: variantSKU },
            select: { uid: true }
        });

        if (!exists) {
            return variantSKU;
        }

        sequence++;
        variantSKU = `${baseVariantSKU}-${sequence}`;
    }
}
