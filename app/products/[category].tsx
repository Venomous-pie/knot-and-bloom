import React, { useEffect, useState } from "react";
import ProductPage from "@/components/ProductPage";
import { router, useLocalSearchParams } from "expo-router";
import { productAPI } from "../api/api";
import { Product } from "../types/products";

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
};

export default function CategoryPage() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (category && !categoryTitles[category]) {
            router.replace('/');
            return;
        }

        const fetchProducts = async () => {
            if (!category) return;

            try {
                setLoading(true);
                setError(null);

                const params: any = {};

                // Handle special categories
                if (category === "new-arrival") {
                    params.newArrival = true; // ✅ Fixed: matches backend
                } else if (category === "popular") {
                    // will come back for this logic
                } else {
                    params.category = categoryTitles[category];
                }

                const response = await productAPI.getProducts(params);
                setProducts(response.data.products || []);
                console.log(response.data.products);
                
            } catch (err: any) {
                console.error("Error fetching products:", err);
                setError(err.response?.data?.error || "Failed to load products");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [category]);

    if (!category || !categoryTitles[category]) {
        return null;
    }

    return (
        <ProductPage
            category={category}
            title={categoryTitles[category]}
            products={products}
            loading={loading}
            error={error}
        />
    );
}