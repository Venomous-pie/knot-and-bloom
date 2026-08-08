import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/authMiddleware.js';
import type { AuthPayload } from '../types/authTypes.js';

const router = Router();

/**
 * GET /api/realtime/token
 * Generates a short-lived, Supabase-specific JWT for Realtime subscriptions.
 * Requires standard Express authentication.
 */
router.get('/token', authenticate, (req: Request, res: Response) => {
    try {
        const user = req.user as AuthPayload;
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!supabaseJwtSecret) {
            console.error('Missing SUPABASE_JWT_SECRET environment variable.');
            return res.status(500).json({ error: 'Realtime configuration missing.' });
        }

        // Supabase Realtime custom JWT requirements:
        // 1. role: 'authenticated' (tells PostgREST/Realtime to map to authenticated role)
        // 2. id: <integer> (this matches our custom RLS policy in Supabase)
        const payload = {
            role: 'authenticated',
            id: user.id
        };

        // Generate token valid for 1 hour
        const token = jwt.sign(payload, supabaseJwtSecret, { expiresIn: '1h' });

        return res.json({ token });
    } catch (error) {
        console.error('Error generating realtime token:', error);
        return res.status(500).json({ error: 'Failed to generate token' });
    }
});

export default router;
