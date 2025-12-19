import { RelativePathString } from "expo-router";

export const categoryTitles: Record<string, string> = {
    popular: "Popular Products",
    "new-arrival": "New Arrivals",
    crochet: "Crochet",
    "fuzzy-wire-art": "Fuzzy Wire Art",
    accessories: "Accessories",
    tops: "Tops",
    "hair-tie": "Hair Ties",
    "mini-stuffed-toy": "Mini Stuffed Toys",
    "fuzzy-wire-bouquet": "Fuzzy Wire Bouquets",
    "crochet-flower-bouquet": "Crochet Flower Bouquets",
    "crochet-key-chains": "Crochet Key Chains",
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
    { title: 'Accessories', href: "/products/accessories" as RelativePathString },
];

export const sidebarLinks: { title: string, href: RelativePathString }[] = [
    { title: 'Custom Order~', href: "/custom-order" as RelativePathString },
    { title: 'Contact Us', href: "/contact-us" as RelativePathString },
    { title: 'About Shop', href: "/about-shop" as RelativePathString },

    { title: 'Tops', href: "/products/tops" as RelativePathString },
    { title: 'Hair Tie', href: "/products/hair-tie" as RelativePathString },
    { title: 'Mini Stuffed Toy', href: "/products/mini-stuffed-toy" as RelativePathString },
    { title: 'Fuzzy Wire Bouquet', href: "/products/fuzzy-wire-bouquet" as RelativePathString },
    { title: 'Crochet Flower Bouquet', href: "/products/crochet-flower-bouquet" as RelativePathString },
    { title: 'Crochet Key Chains', href: "/products/crochet-key-chains" as RelativePathString },
]