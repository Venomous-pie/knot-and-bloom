import { Redis } from '@upstash/redis';

class CacheUtils {
    private redis: Redis;

    constructor() {
        // Automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
        this.redis = Redis.fromEnv();
    }

    /**
     * Get a value from the cache
     */
    public async get<T>(key: string): Promise<T | null> {
        try {
            const entry = await this.redis.get<T>(key);
            return entry;
        } catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }

    /**
     * Set a value in the cache with a TTL (in seconds)
     */
    public async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
        try {
            await this.redis.set(key, value, { ex: ttlSeconds });
        } catch (error) {
            console.error('Redis SET error:', error);
        }
    }

    /**
     * Delete a specific key
     */
    public async delete(key: string): Promise<void> {
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Redis DEL error:', error);
        }
    }

    /**
     * Delete all keys starting with a specific prefix
     */
    public async deletePattern(prefix: string): Promise<void> {
        try {
            // Redis keys pattern matching
            const keys = await this.redis.keys(`${prefix}*`);
            if (keys.length > 0) {
                // Delete all found keys
                await this.redis.del(...keys);
            }
        } catch (error) {
            console.error('Redis deletePattern error:', error);
        }
    }

    /**
     * Clear the entire cache
     */
    public async clear(): Promise<void> {
        try {
            await this.redis.flushdb();
        } catch (error) {
            console.error('Redis FLUSHDB error:', error);
        }
    }
}

export const cache = new CacheUtils();
