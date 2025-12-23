import type { Request, Response, NextFunction } from 'express';

interface RateLimitData {
    attempts: number;
    blockExpiresAt: number | null;
    currentBlockDuration: number;
}

class LoginRateLimiterService {
    private storage: Map<string, RateLimitData> = new Map();
    private readonly MAX_ATTEMPTS = 5;
    private readonly INITIAL_BLOCK_DURATION = 5000; // 5 seconds
    private readonly MULTIPLIER = 1.5;

    /**
     * Middleware to check if the IP is currently blocked.
     */
    public middleware = (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const data = this.storage.get(ip);

        // If blocked
        if (data && data.blockExpiresAt) {
            const now = Date.now();
            if (now < data.blockExpiresAt) {
                const remainingSeconds = Math.ceil((data.blockExpiresAt - now) / 1000);
                res.status(429).json({
                    error: `Too many login attempts. Please try again in ${remainingSeconds} seconds.`,
                    retryAfter: remainingSeconds
                });
                return;
            } else {
                // Block expired, clear the timestamp so they can try again.
                // We do NOT reset attempts here; subsequent failure will trigger the next level of backoff.
                data.blockExpiresAt = null;
            }
        }
        next();
    };

    /**
     * Call this on a failed login attempt.
     */
    public increment(ip: string) {
        let data = this.storage.get(ip);
        if (!data) {
            data = {
                attempts: 0,
                blockExpiresAt: null,
                currentBlockDuration: this.INITIAL_BLOCK_DURATION
            };
            this.storage.set(ip, data);
        }

        data.attempts++;

        if (data.attempts >= this.MAX_ATTEMPTS) {
            data.blockExpiresAt = Date.now() + data.currentBlockDuration;
            // Increase the duration for the NEXT time they get blocked
            data.currentBlockDuration = Math.ceil(data.currentBlockDuration * this.MULTIPLIER);
        }
    }

    /**
     * Call this on a successful login.
     */
    public reset(ip: string) {
        this.storage.delete(ip);
    }
}

export const loginRateLimiter = new LoginRateLimiterService();
