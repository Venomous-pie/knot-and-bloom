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

export const CATEGORY_REGISTRY: CategoryDefinition[] = [
    {
        slug: 'crochet',
        title: 'Crochet',
        subtitle: 'Handmade with love',
        emoji: '🧶',
        bgColor: '#FCE7EB',
        badgeBg: '#F1B8C8',
        color: '#88314E',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['handmade', 'crochet', 'yarn', 'cotton', 'handcrafted', 'cozy', 'knitted', 'fiber art', 'artisan', 'soft']
    },
    {
        slug: 'fuzzy-wire-art',
        title: 'Fuzzy Wire Art',
        subtitle: 'Bendable creations',
        emoji: '🧶',
        bgColor: '#E2EFE1',
        badgeBg: '#A6C9AD',
        color: '#2B5738',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['fuzzy wire', 'wire art', 'handmade', 'desk decor', 'miniature', 'cute', 'figurine', 'kawaii', 'collectible']
    },
    {
        slug: 'gift-boxes-sets',
        title: 'Gift Boxes/Sets',
        subtitle: 'Perfect for gifting',
        emoji: '🎁',
        bgColor: '#EBE5F7',
        badgeBg: '#CBBDEB',
        color: '#4A3482',
        isNavlink: true,
        isSidebarLink: false,
        tags: ['gift set', 'gift box', 'birthday', 'anniversary', 'valentines', 'christmas', 'for her', 'for him', 'surprise', 'premium']
    },
    {
        slug: 'tops',
        title: 'Tops',
        subtitle: 'Wearable art',
        emoji: '👚',
        bgColor: '#FDF1DA',
        badgeBg: '#EACC9F',
        color: '#7A5A29',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['tops', 'apparel', 'wearable', 'handmade', 'crochet top', 'clothing', 'fashion', 'boho', 'chic']
    },
    {
        slug: 'hair-tie',
        title: 'Hair Ties',
        subtitle: 'Cute accessories',
        emoji: '🎀',
        bgColor: '#EBE5F7',
        badgeBg: '#CBBDEB',
        color: '#4A3482',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['hair tie', 'hair accessory', 'scrunchie', 'ponytail', 'elastic', 'handmade', 'cute', 'everyday', 'pastel']
    },
    {
        slug: 'fuzzy-wire-bouquet',
        title: 'Fuzzy Wire Bouquets',
        subtitle: 'Everlasting blooms',
        emoji: '💐',
        bgColor: '#E2EFE1',
        badgeBg: '#A6C9AD',
        color: '#2B5738',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['bouquet', 'fuzzy wire', 'flowers', 'forever flowers', 'artificial', 'gift', 'romantic', 'decor', 'colorful']
    },
    {
        slug: 'crochet-flower-bouquet',
        title: 'Crochet Flower Bouquets',
        subtitle: 'Never wilting',
        emoji: '🌷',
        bgColor: '#FCE7EB',
        badgeBg: '#F1B8C8',
        color: '#88314E',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['crochet flowers', 'bouquet', 'forever flowers', 'handmade', 'yarn flowers', 'gift', 'romantic', 'wedding', 'decor']
    },
    {
        slug: 'crochet-key-chains',
        title: 'Crochet Key Chains',
        subtitle: 'Carry a little charm',
        emoji: '🔑',
        bgColor: '#FDF1DA',
        badgeBg: '#EACC9F',
        color: '#7A5A29',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['keychain', 'crochet', 'mini', 'cute', 'accessory', 'bag charm', 'handmade', 'amigurumi', 'kawaii']
    },
    {
        slug: 'amigurumi-plushies',
        title: 'Amigurumi Plushies',
        subtitle: 'Cute & collectible',
        emoji: '🧸',
        bgColor: '#E2EFE1',
        badgeBg: '#A6C9AD',
        color: '#2B5738',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['amigurumi', 'plushie', 'stuffed toy', 'crochet', 'cute', 'kawaii', 'handmade', 'soft toy', 'nursery', 'kids']
    },
    {
        slug: 'beaded-jewelry',
        title: 'Beaded Jewelry',
        subtitle: 'Handmade with love',
        emoji: '📿',
        bgColor: '#FCE7EB',
        badgeBg: '#F1B8C8',
        color: '#88314E',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['beaded', 'jewelry', 'bracelet', 'necklace', 'handmade', 'accessory', 'elegant', 'boho', 'minimalist', 'dainty']
    },
    {
        slug: 'phone-charms',
        title: 'Phone Charms',
        subtitle: 'Cute & collectible',
        emoji: '📱',
        bgColor: '#EBE5F7',
        badgeBg: '#CBBDEB',
        color: '#4A3482',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['phone charm', 'phone strap', 'accessory', 'cute', 'beaded', 'handmade', 'kawaii', 'aesthetic', 'trendy']
    },
    {
        slug: 'scrunchies',
        title: 'Scrunchies',
        subtitle: 'Cute accessories',
        emoji: '🎀',
        bgColor: '#FDF1DA',
        badgeBg: '#EACC9F',
        color: '#7A5A29',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['scrunchie', 'hair accessory', 'handmade', 'silk', 'satin', 'cute', 'everyday', 'pastel', 'elastic']
    },
    {
        slug: 'resin-crafts',
        title: 'Resin Crafts',
        subtitle: 'Handmade with love',
        emoji: '✨',
        bgColor: '#E2EFE1',
        badgeBg: '#A6C9AD',
        color: '#2B5738',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['resin', 'resin art', 'handmade', 'epoxy', 'clear', 'glitter', 'dried flowers', 'jewelry', 'coaster', 'trinket']
    },
    {
        slug: 'bookmarks',
        title: 'Bookmarks',
        subtitle: 'Carry a little charm',
        emoji: '🔖',
        bgColor: '#FCE7EB',
        badgeBg: '#F1B8C8',
        color: '#88314E',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['bookmark', 'reading', 'book lover', 'handmade', 'crochet', 'beaded', 'gift', 'aesthetic', 'literary']
    },
    {
        slug: 'tote-bags',
        title: 'Tote Bags',
        subtitle: 'Wearable art',
        emoji: '👜',
        bgColor: '#EBE5F7',
        badgeBg: '#CBBDEB',
        color: '#4A3482',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['tote bag', 'bag', 'handmade', 'canvas', 'eco-friendly', 'reusable', 'crochet', 'market bag', 'everyday', 'boho']
    },
    {
        slug: 'stickers-prints',
        title: 'Stickers & Prints',
        subtitle: 'Cute & collectible',
        emoji: '🖼️',
        bgColor: '#FDF1DA',
        badgeBg: '#EACC9F',
        color: '#7A5A29',
        isNavlink: false,
        isSidebarLink: true,
        tags: ['sticker', 'print', 'art print', 'illustration', 'cute', 'aesthetic', 'journal', 'planner', 'kawaii', 'waterproof']
    },
    {
        slug: 'clay-accessories',
        title: 'Clay Accessories',
        subtitle: 'Handmade with love',
        emoji: '🏺',
        bgColor: '#E2EFE1',
        badgeBg: '#A6C9AD',
        color: '#2B5738',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['clay', 'polymer clay', 'earrings', 'handmade', 'accessory', 'lightweight', 'boho', 'minimalist', 'colorful', 'dainty']
    },
    {
        slug: 'key-chains',
        title: 'Key Chains',
        subtitle: 'Carry a little charm',
        emoji: '🔑',
        bgColor: '#FCE7EB',
        badgeBg: '#F1B8C8',
        color: '#88314E',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['keychain', 'key ring', 'accessory', 'handmade', 'cute', 'bag charm', 'gift', 'personalized', 'mini', 'trendy']
    },
    {
        slug: 'flower-boquets',
        title: 'Flower Boquets',
        subtitle: 'Perfect for gifting',
        emoji: '💐',
        bgColor: '#EBE5F7',
        badgeBg: '#CBBDEB',
        color: '#4A3482',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['bouquet', 'flowers', 'gift', 'romantic', 'anniversary', 'birthday', 'forever flowers', 'dried flowers', 'decor', 'elegant']
    },
    {
        slug: 'wire-flowers',
        title: 'Wire Flowers',
        subtitle: 'Everlasting blooms',
        emoji: '🌷',
        bgColor: '#FDF1DA',
        badgeBg: '#EACC9F',
        color: '#7A5A29',
        isNavlink: false,
        isSidebarLink: false,
        tags: ['wire flowers', 'wire art', 'handmade', 'floral', 'decor', 'gift', 'everlasting', 'aesthetic']
    }
];

export const FALLBACK_CATEGORY_CONFIG = {
    subtitle: 'Handmade with love',
    emoji: '🧶',
    bgColor: '#FCE7EB',
    badgeBg: '#F1B8C8',
    color: '#88314E'
};

export const getCategoryBySlug = (slug: string): CategoryDefinition | undefined => {
    return CATEGORY_REGISTRY.find(c => c.slug === slug);
};

export const getCategoryByTitle = (title: string): CategoryDefinition | undefined => {
    return CATEGORY_REGISTRY.find(c => c.title === title);
};

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