interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class CacheUtils {
    private cache = new Map<string, CacheEntry<any>>();

    /**
     * Get a value from the cache
     */
    public get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set a value in the cache with a TTL (in seconds)
     */
    public set<T>(key: string, value: T, ttlSeconds: number = 60): void {
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    /**
     * Delete a specific key
     */
    public delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Delete all keys starting with a specific prefix
     */
    public deletePattern(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear the entire cache
     */
    public clear(): void {
        this.cache.clear();
    }
}

export const cache = new CacheUtils();
