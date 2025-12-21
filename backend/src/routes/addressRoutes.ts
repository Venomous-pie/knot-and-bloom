import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authMiddleware.js';
import prisma from '../utils/prisma.js';

const router = Router();

// Validation schema
const addressSchema = z.object({
    label: z.string().max(30).optional(),
    fullName: z.string().min(2).max(100),
    phone: z.string().regex(/^(\+63|0)[0-9]{9,10}$/, "Phone must be valid PH format (09XX-XXX-XXXX or +639XX-XXX-XXXX)"),
    streetAddress: z.string().min(5).max(200),
    aptSuite: z.string().max(50).optional(),
    city: z.string().min(2).max(50),
    stateProvince: z.string().max(50).optional(),
    postalCode: z.string().regex(/^\d{3,4}$/, "Postal code must be 3-4 digits"),
    country: z.string().default("Philippines"),
    isDefault: z.boolean().optional(),
});

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

        const addresses = await prisma.address.findMany({
            where: { customerId: userId },
            orderBy: [
                { isDefault: 'desc' },  // Default first
                { updatedAt: 'desc' }   // Then most recent
            ]
        });

        res.json({ addresses });
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

        // Validate input
        const parsed = addressSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors
            });
        }

        const data = parsed.data;

        // If this is the first address or isDefault is true, handle default logic
        const existingAddresses = await prisma.address.count({ where: { customerId: userId } });
        const shouldBeDefault = existingAddresses === 0 || data.isDefault;

        // Use transaction to ensure only one default
        const address = await prisma.$transaction(async (tx) => {
            // If setting as default, unset all others first
            if (shouldBeDefault) {
                await tx.address.updateMany({
                    where: { customerId: userId, isDefault: true },
                    data: { isDefault: false }
                });
            }

            return tx.address.create({
                data: {
                    customerId: userId,
                    label: data.label,
                    fullName: data.fullName,
                    phone: data.phone,
                    streetAddress: data.streetAddress,
                    aptSuite: data.aptSuite,
                    city: data.city,
                    stateProvince: data.stateProvince,
                    postalCode: data.postalCode,
                    country: data.country || "Philippines",
                    isDefault: shouldBeDefault,
                }
            });
        });

        res.status(201).json({ address });
    } catch (error) {
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
        const addressId = parseInt(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        // Verify ownership
        const existing = await prisma.address.findUnique({ where: { uid: addressId } });
        if (!existing || existing.customerId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Validate input
        const parsed = addressSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors
            });
        }

        const data = parsed.data;

        // Handle default address change via transaction
        const address = await prisma.$transaction(async (tx) => {
            // If setting as default, unset all others first
            if (data.isDefault) {
                await tx.address.updateMany({
                    where: { customerId: userId, isDefault: true },
                    data: { isDefault: false }
                });
            }

            return tx.address.update({
                where: { uid: addressId },
                data: {
                    ...(data.label !== undefined && { label: data.label }),
                    ...(data.fullName !== undefined && { fullName: data.fullName }),
                    ...(data.phone !== undefined && { phone: data.phone }),
                    ...(data.streetAddress !== undefined && { streetAddress: data.streetAddress }),
                    ...(data.aptSuite !== undefined && { aptSuite: data.aptSuite }),
                    ...(data.city !== undefined && { city: data.city }),
                    ...(data.stateProvince !== undefined && { stateProvince: data.stateProvince }),
                    ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
                    ...(data.country !== undefined && { country: data.country }),
                    ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
                }
            });
        });

        res.json({ address });
    } catch (error) {
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
        const addressId = parseInt(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        // Verify ownership
        const existing = await prisma.address.findUnique({ where: { uid: addressId } });
        if (!existing || existing.customerId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Check if this is the last address
        const addressCount = await prisma.address.count({ where: { customerId: userId } });
        if (addressCount <= 1) {
            return res.status(400).json({ error: "You must have at least one address" });
        }

        // Delete the address
        await prisma.address.delete({ where: { uid: addressId } });

        // If deleted address was default, set another as default
        if (existing.isDefault) {
            await prisma.address.updateMany({
                where: { customerId: userId },
                data: { isDefault: false }
            });
            // Set most recent as default
            const nextDefault = await prisma.address.findFirst({
                where: { customerId: userId },
                orderBy: { updatedAt: 'desc' }
            });
            if (nextDefault) {
                await prisma.address.update({
                    where: { uid: nextDefault.uid },
                    data: { isDefault: true }
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
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
        const addressId = parseInt(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

        // Verify ownership
        const existing = await prisma.address.findUnique({ where: { uid: addressId } });
        if (!existing || existing.customerId !== userId) {
            return res.status(403).json({ error: "Forbidden" });
        }

        // Use transaction to ensure only one default
        const address = await prisma.$transaction(async (tx) => {
            // Unset all defaults
            await tx.address.updateMany({
                where: { customerId: userId, isDefault: true },
                data: { isDefault: false }
            });
            // Set new default
            return tx.address.update({
                where: { uid: addressId },
                data: { isDefault: true }
            });
        });

        res.json({ address });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ error: "Failed to set default address" });
    }
});

export default router;
