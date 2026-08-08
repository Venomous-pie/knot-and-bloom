import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import { Redis } from '@upstash/redis';

/**
 * A custom Rate Limit Store for Express that uses Upstash Serverless Redis.
 * This completely removes rate limiting load from the PostgreSQL database,
 * making rate limiting operations lightning fast and highly scalable.
 */
export class UpstashRateLimitStore implements Store {
    private windowMs!: number;
    private redis: Redis;
    public prefix: string;

    constructor(prefix: string = 'rl:') {
        // Automatically picks up UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
        this.redis = Redis.fromEnv();
        this.prefix = prefix;
    }

    public init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    public async increment(key: string): Promise<ClientRateLimitInfo> {
        const redisKey = `${this.prefix}${key}`;
        
        // Execute INCR. If the key doesn't exist, it is created and set to 1.
        const totalHits = await this.redis.incr(redisKey);
        
        let resetTimeMs = this.windowMs;
        
        // If this is the first hit (key was just created), set the TTL
        if (totalHits === 1) {
             await this.redis.pexpire(redisKey, this.windowMs);
        } else {
             // Fetch remaining time to calculate resetTime
             const pttl = await this.redis.pttl(redisKey);
             if (pttl > 0) {
                 resetTimeMs = pttl;
             } else if (pttl === -1) {
                 // Fallback if TTL was somehow lost
                 await this.redis.pexpire(redisKey, this.windowMs);
             }
        }

        return {
            totalHits,
            resetTime: new Date(Date.now() + resetTimeMs)
        };
    }

    public async decrement(key: string): Promise<void> {
        const redisKey = `${this.prefix}${key}`;
        await this.redis.decr(redisKey);
    }

    public async resetKey(key: string): Promise<void> {
        const redisKey = `${this.prefix}${key}`;
        await this.redis.del(redisKey);
    }
}
