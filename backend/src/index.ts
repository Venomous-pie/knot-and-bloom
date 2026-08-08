import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
// Force Node.js to prefer IPv4 for DNS resolution.
// This fixes the silent ETIMEDOUT hanging issue when connecting to Gmail SMTP from cloud platforms like Render.
dns.setDefaultResultOrder('ipv4first');
// ── Security: Fail fast if critical secrets are missing ──
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET is not set or is too short (min 32 chars). Exiting.');
    process.exit(1);
}

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import accountRoutes from './routes/accountRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import checkoutRoutes from './routes/checkoutRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentMethodRoutes from './routes/paymentMethodRoutes.js';
import productRoutes from './routes/productRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import authRoutes from './routes/authRoutes.js';
import imagekitRoutes from './routes/imagekitRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import earningsRoutes from './routes/earningsRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import prisma from './utils/prismaUtils.js';
import passport from './config/passport.js';

import { createServer } from 'http';

import { errorHandlingMiddleware } from './middleware/errorHandlingMiddleware.js';
import { sanitizeInput } from './middleware/sanitize.js';
import { cronService } from './services/cronService.js';
import { UpstashRateLimitStore } from './middleware/upstashRateLimitStore.js';
import { requestLogger } from './middleware/requestLogger.js';

const app = express();
// Check if cronService.start exists before calling (defensive, though file is created)
cronService.start();

// Enable trust proxy to correctly identify client IPs behind a proxy (e.g., Nginx, Heroku, AWS ELB)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3030;

// CORS origins must be defined early for Helmet CSP and CORS middleware
const defaultOrigins = [
    'http://localhost:8081', // Expo Web
    'http://localhost:19000', // Expo
    'http://localhost:19006', // Expo
    'http://localhost:3000', // React default
    'http://localhost:3030', // Self (if needed)
    'https://knot-and-bloom-rouge.vercel.app', //production
];
const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : defaultOrigins;

// ── Security Middlewares ──
app.use(helmet({
    // Content-Security-Policy: restrict sources to same origin + trusted CDNs only.
    // This is a defence-in-depth layer on top of XSS sanitisation.
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https://ik.imagekit.io', 'https://*.supabase.co'],
            connectSrc: ["'self'", ...allowedOrigins],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    // Never send Referer header — prevents backend URL leaking to third-party resources
    referrerPolicy: { policy: 'no-referrer' },
    // HSTS: force HTTPS for 1 year, include subdomains (only active in production over HTTPS)
    hsts: process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
}));
app.use(requestLogger); // Structured JSON request logging for observability

// CORS must be registered BEFORE the rate limiter so that rate-limited (429)
// responses still include Access-Control-Allow-Origin headers. Without this,
// the browser misreports rate-limit errors as CORS errors.

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Global rate limiter: 100 requests per minute per IP
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
    store: new UpstashRateLimitStore('global:'),
});
app.use(globalLimiter);

// ── Webhooks (must be registered before express.json to preserve raw body bytes) ──
app.use('/api/webhooks', webhookRoutes);

// ── Global Body Parsers ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeInput); // Strip HTML/script tags from all user input
app.use(passport.initialize());

// Healthcheck
app.get('/', (req, res) => {
    res.json({
        name: "Knot and Bloom",
        status: "Running",
        timestamp: new Date().toISOString()
    });
});

// Api Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/imagekit', imagekitRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(errorHandlingMiddleware);

// Shutdown service
const shutdown = async () => {
    console.log("Shutting down...")
    await prisma.$disconnect()
    process.exit(0)
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const httpServer = createServer(app);

httpServer.listen(PORT, () => {
    console.log(`Currently running on port ${PORT}.`);
});

export default app