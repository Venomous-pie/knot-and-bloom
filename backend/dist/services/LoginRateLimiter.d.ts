import type { Request, Response, NextFunction } from 'express';
declare class LoginRateLimiterService {
    private storage;
    private readonly MAX_ATTEMPTS;
    private readonly INITIAL_BLOCK_DURATION;
    private readonly MULTIPLIER;
    /**
     * Middleware to check if the IP is currently blocked.
     */
    middleware: (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Call this on a failed login attempt.
     */
    increment(ip: string): void;
    /**
     * Call this on a successful login.
     */
    reset(ip: string): void;
}
export declare const loginRateLimiter: LoginRateLimiterService;
export {};
//# sourceMappingURL=LoginRateLimiter.d.ts.map