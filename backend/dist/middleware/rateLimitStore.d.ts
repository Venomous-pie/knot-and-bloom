import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
export declare class PrismaRateLimitStore implements Store {
    private windowMs;
    init(options: Options): void;
    increment(key: string): Promise<ClientRateLimitInfo>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
    resetAll(): Promise<void>;
    private cleanUp;
}
//# sourceMappingURL=rateLimitStore.d.ts.map