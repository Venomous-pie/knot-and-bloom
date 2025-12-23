import type { Request, Response } from 'express';
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import AddressController from '../controllers/AddressController.js';

const router = Router();

// ============================================
// Address CRUD Endpoints (all require auth)
// Uses /api/addresses/me/* pattern for security
// ============================================

/**
 * GET /api/addresses/me
 * List all addresses for authenticated user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await AddressController.getAddresses(userId);
        res.json(result);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: "Failed to fetch addresses" });
    }
});

/**
 * POST /api/addresses/me
 * Create a new address
 */
router.post('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await AddressController.createAddress(userId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error creating address:', error);
        res.status(500).json({ error: "Failed to create address" });
    }
});

/**
 * PUT /api/addresses/me/:id
 * Update an address
 */
router.put('/me/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const addressId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        const result = await AddressController.updateAddress(userId, addressId, req.body);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error updating address:', error);
        res.status(500).json({ error: "Failed to update address" });
    }
});

/**
 * DELETE /api/addresses/me/:id
 * Delete an address
 */
router.delete('/me/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const addressId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        const result = await AddressController.deleteAddress(userId, addressId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error deleting address:', error);
        res.status(500).json({ error: "Failed to delete address" });
    }
});

/**
 * PATCH /api/addresses/me/:id/default
 * Set an address as default
 */
router.patch('/me/:id/default', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const addressId = parseInt(req.params.id || '', 10);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        const result = await AddressController.setDefaultAddress(userId, addressId);
        res.json(result);
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message, details: error.details });
        }
        console.error('Error setting default address:', error);
        res.status(500).json({ error: "Failed to set default address" });
    }
});

export default router;
