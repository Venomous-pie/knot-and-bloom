import { productAPI } from "@/api/api";
import { GetProductsParams, Product } from "@/types/products";
import { useCallback, useEffect, useState } from "react";

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

export const useProducts = (options: UseProductsOptions = {}): UseProductsResult => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    // Store current params in state to allow dynamic updates
    const [params, setParams] = useState<GetProductsParams>({
        limit: 20,
        offset: 0,
        ...options
    });

    const fetchProducts = useCallback(async (currentParams: GetProductsParams, isLoadMore = false) => {
        try {
            setLoading(true);
            setError(null);

            const response = await productAPI.getProducts(currentParams);

            if (isLoadMore) {
                setProducts(prev => [...prev, ...response.data.products]);
            } else {
                setProducts(response.data.products);
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

    // Initial fetch
    // React to options changes (e.g. category switch)
    useEffect(() => {
        const newParams = {
            limit: 20,
            offset: 0,
            ...options
        };

        // Only update and fetch if params have actually changed (deep comparison via stringify)
        if (JSON.stringify(newParams) !== JSON.stringify(params)) {
            setParams(newParams);
            if (options.initialFetch !== false) {
                fetchProducts(newParams, false);
            }
        } else if (options.initialFetch !== false && products.length === 0 && !loading && !error) {
            // Initial fetch case if params matched default but no data yet (mount)
            fetchProducts(newParams, false);
        }
    }, [JSON.stringify(options)]); // Deep dependency check 
    // NOTE: If params change via updateParams, we might want to refetch automatically?
    // Let's make updateParams trigger fetch.

    // Effect to refetch when params change (excluding offset for loadMore handling manually)
    // Actually, handling this with useEffect on params object can be tricky if params object identity changes.
    // Let's prefer manual triggering via refresh/updateParams.

    const refresh = async () => {
        // Reset offset to 0
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
        // When updating filters (category/search), usually we want to reset offset to 0
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
