import { productAPI } from "@/services/api";
import { GetProductsParams, Product } from "@/types/products";
import { useCallback, useEffect, useRef, useState } from "react";
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

interface CacheEntry {
    products: Product[];
    total: number;
    hasMore: boolean;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;
const queryCache = new Map<string, CacheEntry>();

export const clearProductQueryCache = () => {
    queryCache.clear();
};

const stableStringify = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return JSON.stringify(obj);
    const keys = Object.keys(obj).sort();
    const sortedObj: any = {};
    keys.forEach(k => { sortedObj[k] = obj[k]; });
    return JSON.stringify(sortedObj);
};

export const useProducts = (options: UseProductsOptions = {}): UseProductsResult => {
    const { initialFetch = true, ...restOptions } = options;
    const initialParams = { limit: 20, offset: 0, ...restOptions };
    const initialCacheKey = stableStringify(initialParams);

    // Check cache on initialization
    let cachedData = queryCache.get(initialCacheKey);
    if (cachedData && Date.now() - cachedData.timestamp > CACHE_TTL) {
        queryCache.delete(initialCacheKey);
        cachedData = undefined;
    }

    const [products, setProducts] = useState<Product[]>(cachedData?.products || []);
    // Don't show loading on mount if we have valid cache
    const [loading, setLoading] = useState(cachedData ? false : initialFetch);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(cachedData?.total || 0);
    const [hasMore, setHasMore] = useState(cachedData?.hasMore || false);

    const [params, setParams] = useState<GetProductsParams>(initialParams);

    const latestRequestRef = useRef<string | null>(null);
    const hasMounted = useRef(false);

    const fetchProducts = useCallback(async (currentParams: GetProductsParams, isLoadMore = false) => {
        const cacheKey = stableStringify(currentParams);
        latestRequestRef.current = cacheKey;

        let hasValidCache = false;

        if (!isLoadMore) {
            const cached = queryCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
                // Cache hit! Update UI instantly.
                setProducts(cached.products);
                setTotal(cached.total);
                setHasMore(cached.hasMore);
                setError(null);
                setLoading(false);
                hasValidCache = true;
                // Note: We still proceed to fetch in the background for stale-while-revalidate
            }
        }

        if (!isLoadMore && !hasValidCache) {
            setLoading(true);
            setProducts([]);
            setError(null);
        }

        try {
            const response = await productAPI.getProducts(currentParams);

            // Staleness guard: if a newer request was fired while this was in flight, discard this response
            if (latestRequestRef.current !== cacheKey) return;

            if (isLoadMore) {
                setProducts(prev => [...prev, ...response.data.products]);
                // We deliberately don't update queryCache for loadMore (offset > 0) to avoid 
                // caching deep scroll states. Cache only retains page 1.
            } else {
                setProducts(response.data.products);
                cacheProducts(response.data.products); // Update entity cache

                // Update global query cache
                queryCache.set(cacheKey, {
                    products: response.data.products,
                    total: response.data.total,
                    hasMore: response.data.pagination.hasMore,
                    timestamp: Date.now()
                });

                // Enforce max cache size (evict oldest)
                if (queryCache.size > MAX_CACHE_SIZE) {
                    const firstKey = queryCache.keys().next().value;
                    if (firstKey) queryCache.delete(firstKey);
                }
            }

            setTotal(response.data.total);
            setHasMore(response.data.pagination.hasMore);
            setError(null);
        } catch (err: any) {
            if (latestRequestRef.current !== cacheKey) return;

            console.error("Failed to fetch products:", err);
            setError(err.message || "Failed to load products");
        } finally {
            if (latestRequestRef.current === cacheKey) {
                setLoading(false);
            }
        }
    }, []);

    const optionsKey = stableStringify(options);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            if (initialFetch) {
                fetchProducts(params, false);
            }
        } else {
            // Options prop changed, reset to new options
            const { initialFetch: _ignored, ...newRestOptions } = options;
            const newParams = { limit: 20, offset: 0, ...newRestOptions };
            setParams(newParams);
            if (initialFetch) {
                fetchProducts(newParams, false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionsKey]);

    const refresh = async () => {
        const newParams = { ...params, offset: 0 };
        setParams(newParams);
        // Imperative calls fetch regardless of initialFetch prop
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
        // Imperative calls fetch regardless of initialFetch prop
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
