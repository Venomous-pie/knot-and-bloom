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
