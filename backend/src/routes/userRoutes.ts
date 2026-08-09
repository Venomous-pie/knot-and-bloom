import Router from 'express';
import userController from '../controllers/CustomerController.js';
import { DuplicateUserError, ValidationError, AuthenticationError, NotFoundError } from '../error/errorHandler.js';
import { authenticate } from '../middleware/authMiddleware.js';

import { authRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter.js';
import { loginRateLimiter } from '../services/LoginRateLimiter.js';
import { AuditService } from '../services/AuditService.js';

const router = Router();

router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await userController.getUserProfile(userId);
        res.json({
            success: true,
            data: result.user
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

router.put('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const user = await userController.updateUserProfile(userId, req.body);

        res.json({
            success: true,
            message: "Profile updated successfully.",
            data: user
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

router.post('/register', registrationRateLimiter, async (req, res) => {
    try {
        const result = await userController.userRegisterController(req.body);

        res.status(201).json({
            success: true,
            message: "Customer registered successfully.",
            token: result.token,
            refreshToken: result.refreshToken,
            data: result.user
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

        if (error instanceof DuplicateUserError) {
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

router.post('/login', loginRateLimiter.middleware, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    try {
        const result = await userController.userLoginController(req.body);

        // Reset rate limit on success
        loginRateLimiter.reset(ip);

        AuditService.logAuth('LOGIN_SUCCESS', result.user.uid, { method: 'credentials', ip });

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token: result.token,
            refreshToken: result.refreshToken,
            data: result.user
        });

    } catch (error) {
        console.error("Login error:", error);

        if (error instanceof ValidationError) {
            // Increment rate limit for validation errors to prevent spam
            loginRateLimiter.increment(ip);
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        if (error instanceof AuthenticationError) {
            // Increment rate limit on failed auth
            loginRateLimiter.increment(ip);
            AuditService.logAuth('LOGIN_FAILED', 0, { ip, code: error.code }, error.message);
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                code: error.code
            });
        }

        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
});

router.post('/login/google', loginRateLimiter.middleware, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    try {
        const result = await userController.googleLoginController(req.body);

        // Reset rate limit on success
        loginRateLimiter.reset(ip);

        res.status(200).json({
            success: true,
            message: "Google Login successful.",
            token: result.token,
            data: result.user
        });

    } catch (error) {
        console.error("Google Login error:", error);

        if (error instanceof ValidationError) {
            loginRateLimiter.increment(ip);
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        if (error instanceof AuthenticationError) {
            loginRateLimiter.increment(ip);
            return res.status(401).json({
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
