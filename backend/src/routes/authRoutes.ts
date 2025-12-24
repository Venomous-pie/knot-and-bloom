import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import type { AuthPayload, Role } from '../types/authTypes.js';

const router = express.Router();

// @route   GET /auth/google
// @desc    Redirect to Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
}));

// @route   GET /auth/google/callback
// @desc    Google OAuth callback
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
        session: false
    }),
    (req, res) => {
        try {
            if (!req.user) {
                throw new Error('User not found after auth');
            }
            const user = req.user as any;

            const payload: AuthPayload = {
                id: user.uid,
                email: user.email,
                role: user.role as Role,
            };

            // Generate JWT token
            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET || 'secret',
                { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
            );

            // Redirect to frontend with token
            // Ensure FRONTEND_URL is defined, fallback for safety
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
            res.redirect(`${frontendUrl}/auth/success?token=${token}`);
        } catch (error) {
            console.error('Auth callback error:', error);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
            res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
        }
    }
);

export default router;
