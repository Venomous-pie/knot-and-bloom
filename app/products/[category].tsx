import React, { useEffect } from "react";
import ProductPage from "@/components/ProductPage";
import { router, useLocalSearchParams } from "expo-router";

const categoryTitles: Record<string, string> = {
    popular: "Popular Products",
    "new-arrival": "New Arrivals",
    crochet: "Crochet",
    "fuzzy-wire-art": "Fuzzy Wire Art",
    accessories: "Accessories",
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