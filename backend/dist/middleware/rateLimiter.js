import rateLimit from 'express-rate-limit';
import { PrismaRateLimitStore } from './rateLimitStore.js';
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500(change to 5 in production) requests per `window` (here, per 15 minutes) - Increased for testing
    message: {
        success: false,
        error: "Too many login/registration attempts, please try again later."
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new PrismaRateLimitStore(),
});
//# sourceMappingURL=rateLimiter.js.map