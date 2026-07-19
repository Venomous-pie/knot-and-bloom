import { productAPI } from "@/api/api";
import { GetProductsParams, Product } from "@/types/products";
import { useCallback, useEffect, useState } from "react";
import { cacheProducts } from "@/utils/productCache";

interface UseProductsOptions extends GetProductsParams {
    initialFetch?: boolean;
}

interface UseProductsResult {
    products: Product[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    updateParams: (newParams: Partial<GetProductsParams>) => void;
}

// Global cache for product queries to eliminate loading delays
const queryCache: Record<string, { products: Product[], total: number, hasMore: boolean }> = {};

export const useProducts = (options: UseProductsOptions = {}): UseProductsResult => {
    // Generate initial cache key
    const initialParams = { limit: 20, offset: 0, ...options };
    const initialCacheKey = JSON.stringify(initialParams);
    const cachedData = queryCache[initialCacheKey];

    const [products, setProducts] = useState<Product[]>(cachedData?.products || []);
    // If we have cached data, we don't need to show the initial loading state
    const [loading, setLoading] = useState(cachedData ? false : true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(cachedData?.total || 0);
    const [hasMore, setHasMore] = useState(cachedData?.hasMore || false);

    const [params, setParams] = useState<GetProductsParams>(initialParams);

    const fetchProducts = useCallback(async (currentParams: GetProductsParams, isLoadMore = false) => {
        try {
            const cacheKey = JSON.stringify(currentParams);
            const hasCache = !!queryCache[cacheKey];
            
            // Only show loading if we are NOT loading more AND we don't have cached data for this query
            if (!isLoadMore && !hasCache) {
                setLoading(true);
                setProducts([]);
            }
            
            setError(null);

            const response = await productAPI.getProducts(currentParams);

            if (isLoadMore) {
                setProducts(prev => {
                    const newProducts = [...prev, ...response.data.products];
                    // Update cache for load more? It's tricky with offset, usually we just cache page 0.
                    return newProducts;
                });
            } else {
                setProducts(response.data.products);
                cacheProducts(response.data.products);
                // Save to cache for instant subsequent loads
                queryCache[cacheKey] = {
                    products: response.data.products,
                    total: response.data.total,
                    hasMore: response.data.pagination.hasMore
                };
            }

            setTotal(response.data.total);
            setHasMore(response.data.pagination.hasMore);
        } catch (err: any) {
            console.error("Failed to fetch products:", err);
            setError(err.message || "Failed to load products");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const newParams = { limit: 20, offset: 0, ...options };
        const cacheKey = JSON.stringify(newParams);

        if (cacheKey !== JSON.stringify(params)) {
            setParams(newParams);
            
            if (queryCache[cacheKey]) {
                // Instantly load from cache to prevent skeleton flash
                setProducts(queryCache[cacheKey].products);
                setTotal(queryCache[cacheKey].total);
                setHasMore(queryCache[cacheKey].hasMore);
                setLoading(false);
            }
            
            if (options.initialFetch !== false) {
                fetchProducts(newParams, false);
            }
        } else {
            // Initial mount where params match the default state
            if (options.initialFetch !== false) {
                fetchProducts(newParams, false);
            }
        }
    }, [JSON.stringify(options)]); 

    const refresh = async () => {
        const newParams = { ...params, offset: 0 };
        setParams(newParams);
        await fetchProducts(newParams, false);
    };

    const loadMore = async () => {
        if (!hasMore || loading) return;
        const newOffset = (params.offset || 0) + (params.limit || 20);
        const newParams = { ...params, offset: newOffset };
        setParams(newParams);
        await fetchProducts(newParams, true);
    };

    const updateParams = (newParams: Partial<GetProductsParams>) => {
        const updated = { ...params, ...newParams, offset: 0 };
        setParams(updated);
        fetchProducts(updated, false);
    };

    return {
        products,
        loading,
        error,
        total,
        hasMore,
        refresh,
        loadMore,
        updateParams
    };
};
