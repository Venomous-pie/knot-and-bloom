import express from 'express';
import passport from '../config/passport.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OtpService } from '../services/otpService.js';
import ErrorHandler from '../error/errorHandler.js';
import { AuditService } from '../services/AuditService.js';
import { RefreshTokenService } from '../services/RefreshTokenService.js';
const router = express.Router();
// ── One-time auth code store (in-memory, TTL 60 seconds) ──
// In production, use Redis for multi-instance support.
const authCodeStore = new Map();
// Clean up expired codes every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [code, entry] of authCodeStore) {
        if (entry.expiresAt < now)
            authCodeStore.delete(code);
    }
}, 5 * 60 * 1000);
// @route   GET /auth/google
// @desc    Redirect to Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));
// @route   GET /auth/google/callback
// @desc    Google OAuth callback — generates a one-time code instead of passing JWT in URL
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false
}), (req, res) => {
    try {
        if (!req.user) {
            throw new Error('User not found after auth');
        }
        const user = req.user;
        const payload = {
            id: user.uid,
            email: user.email,
            role: user.role,
        };
        // Generate JWT token
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
        // Security: Generate a one-time auth code instead of passing JWT in URL
        // The frontend exchanges this code for the JWT via POST /auth/exchange-code
        const authCode = crypto.randomBytes(32).toString('hex');
        authCodeStore.set(authCode, {
            token,
            expiresAt: Date.now() + 60_000, // 60 second TTL
        });
        AuditService.logAuth('OAUTH_LOGIN_SUCCESS', user.uid, { provider: 'google' });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        res.redirect(`${frontendUrl}/auth/success?code=${authCode}`);
    }
    catch (error) {
        console.error('Auth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
    }
});
// @route   POST /auth/exchange-code
// @desc    Exchange a one-time auth code for a JWT token (used after OAuth redirect)
router.post('/exchange-code', (req, res) => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ success: false, error: 'Auth code is required.' });
        }
        const entry = authCodeStore.get(code);
        if (!entry) {
            return res.status(401).json({ success: false, error: 'Invalid or expired auth code.' });
        }
        // One-time use: delete immediately after retrieval
        authCodeStore.delete(code);
        // Check TTL
        if (entry.expiresAt < Date.now()) {
            return res.status(401).json({ success: false, error: 'Auth code has expired.' });
        }
        res.status(200).json({
            success: true,
            token: entry.token,
        });
    }
    catch (error) {
        console.error('Exchange code error:', error);
        res.status(500).json({ success: false, error: 'Failed to exchange auth code.' });
    }
});
// @route   POST /auth/send-otp
// @desc    Send OTP for registration
router.post('/send-otp', async (req, res, next) => {
    try {
        const { target } = req.body;
        if (!target) {
            throw new ErrorHandler.ValidationError([{ message: "Email or Phone number is required", path: ["target"] }]);
        }
        await OtpService.generateAndSendOTP(target, 'REGISTRATION');
        res.status(200).json({ message: "OTP sent successfully" });
    }
    catch (error) {
        next(error);
    }
});
// @route   POST /auth/refresh
// @desc    Exchange a refresh token for a new access token + rotated refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken || typeof refreshToken !== 'string') {
            return res.status(400).json({ success: false, error: 'Refresh token is required.' });
        }
        // Validate and consume the old refresh token (rotation)
        const payload = await RefreshTokenService.validate(refreshToken);
        if (!payload) {
            return res.status(401).json({ success: false, error: 'Invalid or expired refresh token.' });
        }
        // Issue a new short-lived access token
        const accessPayload = {
            id: payload.userId,
            ...(payload.email && { email: payload.email }),
            role: payload.role,
            ...(payload.sellerId && { sellerId: payload.sellerId }),
            ...(payload.sellerStatus && { sellerStatus: payload.sellerStatus }),
        };
        const newAccessToken = jwt.sign(accessPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
        // Issue a new rotated refresh token
        const newRefreshToken = await RefreshTokenService.generate({
            userId: payload.userId,
            ...(payload.email && { email: payload.email }),
            role: payload.role,
            ...(payload.sellerId && { sellerId: payload.sellerId }),
            ...(payload.sellerStatus && { sellerStatus: payload.sellerStatus }),
        });
        AuditService.logAuth('TOKEN_REFRESHED', payload.userId);
        res.status(200).json({
            success: true,
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ success: false, error: 'Failed to refresh token.' });
    }
});
// @route   POST /auth/logout
// @desc    Revoke a refresh token (logout)
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken && typeof refreshToken === 'string') {
            await RefreshTokenService.revoke(refreshToken);
        }
        res.status(200).json({ success: true, message: 'Logged out successfully.' });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Failed to logout.' });
    }
});
export default router;
//# sourceMappingURL=authRoutes.js.map