import ProductPage from "@/components/ProductPage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { productAPI } from "../../api/api";
import { Product } from "../../types/products";

import { categoryTitles } from "@/constants/categories";

export default function CategoryPage() {
    const { category, highlighted_id } = useLocalSearchParams<{ category: string, highlighted_id: string }>();
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
                    params.newArrival = true;
                } else if (category === "popular") {
                    // will come back for this logic
                } else {
                    params.category = categoryTitles[category];
                }

                const response = await productAPI.getProducts(params);
                let fetchedProducts = response.data.products || [];

                if (highlighted_id) {
                    const highlightedIndex = fetchedProducts.findIndex(p => String(p.uid) === highlighted_id);
                    if (highlightedIndex > -1) {
                        const [highlightedProduct] = fetchedProducts.splice(highlightedIndex, 1);
                        fetchedProducts.unshift(highlightedProduct);
                    }
                }

                setProducts(fetchedProducts);
                console.log(fetchedProducts);

            } catch (err: any) {
                console.error("Error fetching products:", err);
                setError(err.response?.data?.error || "Failed to load products");
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [category, highlighted_id]);

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