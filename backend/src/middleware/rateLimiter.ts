import rateLimit from 'express-rate-limit';
import { UpstashRateLimitStore } from './upstashRateLimitStore.js';

const isProduction = process.env.NODE_ENV === 'production';

// Auth endpoints (login, OAuth): 5 in production, 100 in development
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 5 : 100,
    message: {
        success: false,
        error: "Too many login/registration attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new UpstashRateLimitStore('auth:'),
});

// Registration endpoint: very strict — 10 per 15 minutes per IP in production, 50 in dev
export const registrationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 10 : 50,
    message: {
        success: false,
        error: "Too many registration attempts, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new UpstashRateLimitStore('reg:'),
});
