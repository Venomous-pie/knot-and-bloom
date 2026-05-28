declare class CronService {
    start(): void;
    private processOrderAutoComplete;
    private processOrderReminders;
    private processExpiredCheckoutSessions;
    private cleanupExpiredRateLimits;
    private cleanupExpiredRefreshTokens;
}
export declare const cronService: CronService;
export {};
//# sourceMappingURL=cronService.d.ts.map