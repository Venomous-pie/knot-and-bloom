import React, { useEffect } from "react";
import ProductPage from "@/components/ProductPage";
import { router, useLocalSearchParams } from "expo-router";

const categoryTitles: Record<string, string> = {
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
}

export default function CategoryPage() {
    const { category } = useLocalSearchParams<{ category: string }>();

    useEffect(() => {
        if (category && !categoryTitles[category]) {
            router.replace('/');
        }
    }, [category]);

    if (!category || !categoryTitles[category]) {
        return null;
    }

    return (
        <ProductPage category={category} title={categoryTitles[category]} />
    );
}