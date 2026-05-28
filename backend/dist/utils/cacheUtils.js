class CacheUtils {
    cache = new Map();
    /**
     * Get a value from the cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    /**
     * Set a value in the cache with a TTL (in seconds)
     */
    set(key, value, ttlSeconds = 60) {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    /**
     * Delete a specific key
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Delete all keys starting with a specific prefix
     */
    deletePattern(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Clear the entire cache
     */
    clear() {
        this.cache.clear();
    }
}
export const cache = new CacheUtils();
//# sourceMappingURL=cacheUtils.js.map