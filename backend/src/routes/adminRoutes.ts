import express from 'express';
import type { Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { Role } from '../types/authTypes.js';
import prisma from '../utils/prismaUtils.js';
import { invalidateConfigCache } from '../utils/platformConfigUtils.js';

const router = express.Router();

/**
 * GET /api/admin/platform-config
 * Returns all PlatformConfig key-value pairs as a flat object.
 * Admin-only.
 */
router.get('/platform-config', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response) => {
    try {
        const rows = await prisma.platformConfig.findMany();
        const config: Record<string, string> = {};
        for (const row of rows) {
            config[row.key] = row.value;
        }
        res.json({ config });
    } catch (error) {
        console.error('GET platform-config error:', error);
        res.status(500).json({ error: 'Failed to fetch platform config' });
    }
});

/**
 * PATCH /api/admin/platform-config
 * Accepts a partial object of key-value pairs and upserts each one.
 * Invalidates the in-memory config cache so the next request picks up changes immediately.
 * Admin-only.
 */
router.patch('/platform-config', authenticate, authorize([Role.ADMIN]), async (req: Request, res: Response) => {
    try {
        const updates: Record<string, string | number> = req.body;

        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return res.status(400).json({ error: 'Body must be a key-value object' });
        }

        const allowed = new Set([
            'fuelPricePerLiter',
            'motorcycleFuelEfficiency',
            'tricycleFuelEfficiency',
            'multicabFuelEfficiency',
            'laborAllowance',
            'floorFee',
            'selfDeliveryMaxKm',
        ]);

        const ops = Object.entries(updates)
            .filter(([key]) => allowed.has(key))
            .map(([key, value]) =>
                prisma.platformConfig.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) },
                })
            );

        if (ops.length === 0) {
            return res.status(400).json({ error: 'No valid config keys provided' });
        }

        await Promise.all(ops);
        invalidateConfigCache();

        res.json({ success: true, updated: ops.length });
    } catch (error) {
        console.error('PATCH platform-config error:', error);
        res.status(500).json({ error: 'Failed to update platform config' });
    }
});

export default router;
