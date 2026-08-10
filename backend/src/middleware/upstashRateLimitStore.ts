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
        
        const p = this.redis.pipeline();
        p.incr(redisKey);
        p.pttl(redisKey);
        
        const results = await p.exec();
        const totalHits = results[0] as number;
        const pttl = results[1] as number;
        
        let resetTimeMs = this.windowMs;
        
        // If this is the first hit (key was just created) or TTL was lost, set the TTL
        if (totalHits === 1 || pttl === -1) {
             await this.redis.pexpire(redisKey, this.windowMs);
        } else if (pttl > 0) {
             resetTimeMs = pttl;
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
