import Router from 'express';
import customerController from '../controllers/CustomerController.js';
import { DuplicateCustomerError, ValidationError, AuthenticationError, NotFoundError } from '../error/errorHandler.js';
import { authenticate } from '../middleware/authMiddleware.js';

import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const customer = await customerController.getCustomerProfile(userId);
        res.json(customer);
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

router.put('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const customer = await customerController.updateCustomerProfile(userId, req.body);

        res.json({
            success: true,
            message: "Profile updated successfully.",
            data: customer
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }
        res.status(500).json({ error: "Failed to update profile" });
    }
});

router.post('/register', authRateLimiter, async (req, res) => {
    try {
        const result = await customerController.customerRegisterController(req.body);

        res.status(201).json({
            success: true,
            message: "Customer registered successfully.",
            token: result.token,
            data: result.customer
        });
    } catch (error) {
        console.error("Register error:", error);

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        if (error instanceof DuplicateCustomerError) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
});

router.post('/login', authRateLimiter, async (req, res) => {
    try {
        const result = await customerController.customerLoginController(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token: result.token,
            data: result.customer
        });

    } catch (error) {
        console.error("Login error:", error);

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        if (error instanceof AuthenticationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
});

export default router;
