import { RelativePathString } from "expo-router";

export interface CategoryDefinition {
    slug: string;
    title: string;
    subtitle: string;
    emoji: string;
    bgColor: string;
    badgeBg: string;
    color: string;
    isNavlink?: boolean;
    isSidebarLink?: boolean;
    tags: string[];
}

// The four palettes every category was hand-copying (bgColor/badgeBg/color)
// before. Change a look here once instead of in N places.
type ThemeName = 'pink' | 'green' | 'purple' | 'yellow' | 'blue' | 'terracotta';

const CATEGORY_THEMES: Record<ThemeName, Pick<CategoryDefinition, 'bgColor' | 'badgeBg' | 'color'>> = {
    pink: { bgColor: '#FCE7EB', badgeBg: '#F1B8C8', color: '#88314E' },
    green: { bgColor: '#E2EFE1', badgeBg: '#A6C9AD', color: '#2B5738' },
    purple: { bgColor: '#EBE5F7', badgeBg: '#CBBDEB', color: '#4A3482' },
    yellow: { bgColor: '#FDF1DA', badgeBg: '#EACC9F', color: '#7A5A29' },
    blue: { bgColor: '#E3EFF7', badgeBg: '#A8CBE0', color: '#2C5478' },
    terracotta: { bgColor: '#FBE8E0', badgeBg: '#EFB9A0', color: '#8A4020' },
};

type CategorySeed = Omit<CategoryDefinition, 'bgColor' | 'badgeBg' | 'color'> & { theme: ThemeName };

const CATEGORY_SEEDS = [
    {
        slug: 'crochet',
        title: 'Crochet',
        subtitle: 'Handmade with love',
        emoji: '🧶',
        theme: 'pink',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['handmade', 'crochet', 'yarn', 'cotton', 'handcrafted', 'cozy', 'knitted', 'fiber art', 'artisan', 'soft']
    },
    {
        slug: 'fuzzy-wire-art',
        title: 'Fuzzy Wire Art',
        subtitle: 'Bendable creations',
        emoji: '➰',
        theme: 'green',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['fuzzy wire', 'wire art', 'handmade', 'desk decor', 'miniature', 'cute', 'figurine', 'kawaii', 'collectible']
    },
    {
        slug: 'gift-boxes-sets',
        title: 'Gift Boxes/Sets',
        subtitle: 'Perfect for gifting',
        emoji: '🎁',
        theme: 'purple',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['gift set', 'gift box', 'birthday', 'anniversary', 'valentines', 'christmas', 'for her', 'for him', 'surprise', 'premium']
    },
    {
        slug: 'tops',
        title: 'Tops',
        subtitle: 'Wearable art',
        emoji: '👚',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['tops', 'apparel', 'wearable', 'handmade', 'crochet top', 'clothing', 'fashion', 'boho', 'chic']
    },
    {
        slug: 'hair-tie',
        title: 'Hair Ties',
        subtitle: 'Cute accessories',
        emoji: '🎀',
        theme: 'purple',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['hair tie', 'hair accessory', 'scrunchie', 'ponytail', 'elastic', 'handmade', 'cute', 'everyday', 'pastel']
    },
    {
        slug: 'fuzzy-wire-bouquet',
        title: 'Fuzzy Wire Bouquets',
        subtitle: 'Everlasting blooms',
        emoji: '💐',
        theme: 'green',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['bouquet', 'fuzzy wire', 'flowers', 'forever flowers', 'artificial', 'gift', 'romantic', 'decor', 'colorful']
    },
    {
        slug: 'crochet-flower-bouquet',
        title: 'Crochet Flower Bouquets',
        subtitle: 'Never wilting',
        emoji: '🌷',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['crochet flowers', 'bouquet', 'forever flowers', 'handmade', 'yarn flowers', 'gift', 'romantic', 'wedding', 'decor']
    },
    {
        slug: 'crochet-key-chains',
        title: 'Crochet Key Chains',
        subtitle: 'Carry a little charm',
        emoji: '🔑',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['keychain', 'crochet', 'mini', 'cute', 'accessory', 'bag charm', 'handmade', 'amigurumi', 'kawaii']
    },
    {
        slug: 'amigurumi-plushies',
        title: 'Amigurumi Plushies',
        subtitle: 'Cute & collectible',
        emoji: '🧸',
        theme: 'green',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['amigurumi', 'plushie', 'stuffed toy', 'crochet', 'cute', 'kawaii', 'handmade', 'soft toy', 'nursery', 'kids']
    },
    {
        slug: 'beaded-jewelry',
        title: 'Beaded Jewelry',
        subtitle: 'Handmade with love',
        emoji: '📿',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['beaded', 'jewelry', 'bracelet', 'necklace', 'handmade', 'accessory', 'elegant', 'boho', 'minimalist', 'dainty']
    },
    {
        slug: 'phone-charms',
        title: 'Phone Charms',
        subtitle: 'Cute & collectible',
        emoji: '📱',
        theme: 'purple',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['phone charm', 'phone strap', 'accessory', 'cute', 'beaded', 'handmade', 'kawaii', 'aesthetic', 'trendy']
    },
    {
        slug: 'scrunchies',
        title: 'Scrunchies',
        subtitle: 'Cute accessories',
        emoji: '🎀',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['scrunchie', 'hair accessory', 'handmade', 'silk', 'satin', 'cute', 'everyday', 'pastel', 'elastic']
    },
    {
        slug: 'resin-crafts',
        title: 'Resin Crafts',
        subtitle: 'Handmade with love',
        emoji: '✨',
        theme: 'green',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['resin', 'resin art', 'handmade', 'epoxy', 'clear', 'glitter', 'dried flowers', 'jewelry', 'coaster', 'trinket']
    },
    {
        slug: 'bookmarks',
        title: 'Bookmarks',
        subtitle: 'Carry a little charm',
        emoji: '🔖',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['bookmark', 'reading', 'book lover', 'handmade', 'crochet', 'beaded', 'gift', 'aesthetic', 'literary']
    },
    {
        slug: 'tote-bags',
        title: 'Tote Bags',
        subtitle: 'Wearable art',
        emoji: '👜',
        theme: 'purple',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['tote bag', 'bag', 'handmade', 'canvas', 'eco-friendly', 'reusable', 'crochet', 'market bag', 'everyday', 'boho']
    },
    {
        slug: 'stickers-prints',
        title: 'Stickers & Prints',
        subtitle: 'Cute & collectible',
        emoji: '🖼️',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['sticker', 'print', 'art print', 'illustration', 'cute', 'aesthetic', 'journal', 'planner', 'kawaii', 'waterproof']
    },
    {
        slug: 'clay-accessories',
        title: 'Clay Accessories',
        subtitle: 'Handmade with love',
        emoji: '🏺',
        theme: 'green',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['clay', 'polymer clay', 'earrings', 'handmade', 'accessory', 'lightweight', 'boho', 'minimalist', 'colorful', 'dainty']
    },
    {
        slug: 'key-chains',
        title: 'Key Chains',
        subtitle: 'Carry a little charm',
        emoji: '🔑',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['keychain', 'key ring', 'accessory', 'handmade', 'cute', 'bag charm', 'gift', 'personalized', 'mini', 'trendy']
    },
    {
        slug: 'flower-bouquets',
        title: 'Flower Boquets',
        subtitle: 'Perfect for gifting',
        emoji: '💐',
        theme: 'purple',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['bouquet', 'flowers', 'gift', 'romantic', 'anniversary', 'birthday', 'forever flowers', 'dried flowers', 'decor', 'elegant']
    },
    {
        slug: 'wire-flowers',
        title: 'Wire Flowers',
        subtitle: 'Everlasting blooms',
        emoji: '🌷',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['wire flowers', 'wire art', 'handmade', 'floral', 'decor', 'gift', 'everlasting', 'aesthetic']
    },
    {
        slug: 'paintings-wall-art',
        title: 'Paintings & Wall Art',
        subtitle: 'Original works, framed',
        emoji: '🎨',
        theme: 'blue',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['painting', 'wall art', 'canvas', 'acrylic', 'original art', 'fine art', 'framed', 'wall decor', 'artwork', 'handpainted']
    },
    {
        slug: 'custom-portraits',
        title: 'Custom Portrait Paintings',
        subtitle: 'Painted just for you',
        emoji: '🖌️',
        theme: 'blue',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['portrait', 'custom painting', 'commission', 'painted from photo', 'personalized art', 'pet portrait', 'family portrait', 'handpainted', 'made to order', 'gift']
    },
    {
        slug: 'candles-bath-body',
        title: 'Candles & Bath-Body',
        subtitle: 'Handmade with love',
        emoji: '🕯️',
        theme: 'terracotta',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['candle', 'soap', 'bath', 'body', 'self-care', 'handmade', 'scented', 'natural', 'gift', 'relaxing']
    },
    {
        slug: 'embroidery',
        title: 'Embroidery & Cross-Stitch',
        subtitle: 'Stitched by hand',
        emoji: '🧵',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['embroidery', 'cross-stitch', 'hoop art', 'needlework', 'handmade', 'patch', 'stitched', 'fiber art', 'wall decor']
    },
    {
        slug: 'macrame',
        title: 'Macrame & Wall Hangings',
        subtitle: 'Knotted textures',
        emoji: '🪢',
        theme: 'yellow',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['macrame', 'wall hanging', 'boho', 'knotted', 'handmade', 'home decor', 'plant hanger', 'cotton cord', 'rustic']
    },
    {
        slug: 'earrings',
        title: 'Earrings',
        subtitle: 'Small statements',
        emoji: '💎',
        theme: 'purple',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['earrings', 'jewelry', 'accessory', 'handmade', 'dangle', 'stud', 'lightweight', 'boho', 'minimalist', 'gift']
    },
    {
        slug: 'crochet-bags',
        title: 'Crochet Bags & Pouches',
        subtitle: 'Handmade with love',
        emoji: '👛',
        theme: 'pink',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['crochet bag', 'pouch', 'handmade', 'yarn', 'purse', 'tote', 'market bag', 'boho', 'everyday', 'cotton']
    },
    {
        slug: 'baby-kids',
        title: 'Baby & Kids',
        subtitle: 'Soft & sweet',
        emoji: '🍼',
        theme: 'green',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['baby', 'kids', 'blanket', 'booties', 'bib', 'crochet', 'nursery', 'gift', 'handmade', 'newborn']
    },
    {
        slug: 'pet-accessories',
        title: 'Pet Accessories',
        subtitle: 'For your furry friend',
        emoji: '🐾',
        theme: 'terracotta',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['pet', 'dog', 'cat', 'bandana', 'collar', 'pet toy', 'handmade', 'accessory', 'cute']
    },
    {
        slug: 'custom-orders',
        title: 'Personalized & Custom Orders',
        subtitle: 'Made just for you',
        emoji: '✍️',
        theme: 'blue',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['custom', 'personalized', 'made to order', 'bespoke', 'commission', 'name', 'monogram', 'gift', 'unique']
    },
] satisfies CategorySeed[];

export const CATEGORY_REGISTRY: CategoryDefinition[] = CATEGORY_SEEDS.map(({ theme, ...seed }) => ({
    ...seed,
    ...CATEGORY_THEMES[theme],
}));

export const FALLBACK_CATEGORY_CONFIG = {
    subtitle: 'Handmade with love',
    emoji: '🧶',
    bgColor: '#FCE7EB',
    badgeBg: '#F1B8C8',
    color: '#88314E'
};

// O(1) lookups instead of re-scanning the array on every call. Built once at module load.
const CATEGORY_BY_SLUG = new Map(CATEGORY_REGISTRY.map(c => [c.slug, c]));
const CATEGORY_BY_TITLE = new Map(CATEGORY_REGISTRY.map(c => [c.title, c]));

export const getCategoryBySlug = (slug: string): CategoryDefinition | undefined => {
    return CATEGORY_BY_SLUG.get(slug);
};

export const getCategoryByTitle = (title: string): CategoryDefinition | undefined => {
    return CATEGORY_BY_TITLE.get(title);
};

export type CategorySlug = (typeof CATEGORY_SEEDS)[number]['slug'];

// Recreate categoryTitles for backwards compatibility
export const categoryTitles: Record<string, string> = Object.fromEntries(
    CATEGORY_REGISTRY.map(c => [c.slug, c.title])
);

export const navCategoryTitles: Record<string, string> = {
    popular: "Popular Products",
    "new-arrival": "New Arrivals",
    ...categoryTitles,
};

export const getCategorySlug = (title: string): string => {
    const entry = getCategoryByTitle(title);
    return entry ? entry.slug : title.toLowerCase().replace(/[\s\/]+/g, '-');
};

export const navLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Home', href: "/" as RelativePathString },
    { title: 'Popular', href: "/products/popular" as RelativePathString },
    { title: 'New Arrivals', href: "/products/new-arrival" as RelativePathString },
    ...CATEGORY_REGISTRY.filter(c => c.isNavlink).map(c => ({
        title: c.title,
        href: `/products/${c.slug}` as RelativePathString
    }))
];

export const sidebarLinks: { title: string, href: RelativePathString }[] = CATEGORY_REGISTRY
    .filter(c => c.isSidebarLink)
    .map(c => ({
        title: c.title,
        href: `/products/${c.slug}` as RelativePathString
    }));