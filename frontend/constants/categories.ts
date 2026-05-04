import { RelativePathString } from "expo-router";

// Categories that can be assigned to products by users
// Note: "Popular Products" and "New Arrivals" are excluded as they are computed by backend logic
export const categoryTitles: Record<string, string> = {
    crochet: "Crochet",
    "fuzzy-wire-art": "Fuzzy Wire Art",
    "gift-boxes-sets": "Gift Boxes/Sets",
    "hair-tie": "Hair Ties",
    "fuzzy-wire-bouquet": "Fuzzy Wire Bouquets",
    "crochet-flower-bouquet": "Crochet Flower Bouquets",
    "crochet-key-chains": "Crochet Key Chains",
    "amigurumi-plushies": "Amigurumi Plushies",
    "beaded-jewelry": "Beaded Jewelry",
    "phone-charms": "Phone Charms",
    "scrunchies": "Scrunchies",
    "resin-crafts": "Resin Crafts",
    "bookmarks": "Bookmarks",
    "tote-bags": "Tote Bags",
    "stickers-prints": "Stickers & Prints",
    "clay-accessories": "Clay Accessories",
    "key-chains": "Key Chains",
    "flower-boquets": "Flower Boquets",
};

// Navigation-only categories (includes backend-computed ones)
export const navCategoryTitles: Record<string, string> = {
    popular: "Popular Products",
    "new-arrival": "New Arrivals",
    ...categoryTitles,
};

export const getCategorySlug = (title: string): string => {
    const entry = Object.entries(categoryTitles).find(([key, value]) => value === title);
    return entry ? entry[0] : title.toLowerCase().replace(/\s+/g, '-');
};

export const navLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Home', href: "/" as RelativePathString },
    { title: 'Popular', href: "/products/popular" as RelativePathString },
    { title: 'New Arrivals', href: "/products/new-arrival" as RelativePathString },
    { title: 'Crochet', href: '/products/crochet' as RelativePathString },
    { title: 'Fuzzy Wire Art', href: "/products/fuzzy-wire-art" as RelativePathString },
    { title: 'Gift Boxes/Sets', href: "/products/gift-boxes-sets" as RelativePathString },
];

export const sidebarLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Tops', href: "/products/tops" as RelativePathString },
    { title: 'Hair Tie', href: "/products/hair-tie" as RelativePathString },
    { title: 'Fuzzy Wire Bouquet', href: "/products/fuzzy-wire-bouquet" as RelativePathString },
    { title: 'Crochet Flower Bouquet', href: "/products/crochet-flower-bouquet" as RelativePathString },
    { title: 'Crochet Key Chains', href: "/products/crochet-key-chains" as RelativePathString },
    { title: 'Amigurumi Plushies', href: "/products/amigurumi-plushies" as RelativePathString },
    { title: 'Beaded Jewelry', href: "/products/beaded-jewelry" as RelativePathString },
    { title: 'Phone Charms', href: "/products/phone-charms" as RelativePathString },
    { title: 'Scrunchies', href: "/products/scrunchies" as RelativePathString },
    { title: 'Bookmarks', href: "/products/bookmarks" as RelativePathString },
    { title: 'Tote Bags', href: "/products/tote-bags" as RelativePathString },
    { title: 'Stickers & Prints', href: "/products/stickers-prints" as RelativePathString },
]