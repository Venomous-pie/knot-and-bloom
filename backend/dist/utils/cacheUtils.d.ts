declare class CacheUtils {
    private cache;
    /**
     * Get a value from the cache
     */
    get<T>(key: string): T | null;
    /**
     * Set a value in the cache with a TTL (in seconds)
     */
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    /**
     * Delete a specific key
     */
    delete(key: string): void;
    /**
     * Delete all keys starting with a specific prefix
     */
    deletePattern(prefix: string): void;
    /**
     * Clear the entire cache
     */
    clear(): void;
}
export declare const cache: CacheUtils;
export {};
//# sourceMappingURL=cacheUtils.d.ts.map