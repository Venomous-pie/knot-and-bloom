import Router from 'express';
import customerController from '../controllers/CustomerController.js';
import { DuplicateCustomerError, ValidationError } from '../error/errorHandler.js';

const router = Router();

router.post('/register', async (req, res) => {
    try {
        const customer = await customerController.customerRegisterController(req.body);

        res.status(201).json({
            success: true,
            message: "Customer registered successfully.",
            data: customer
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

router.post('/login', async (req, res) => {
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

        // Handle generic login errors (401 for auth failure)
        if (error instanceof Error && error.message === "Invalid email or password") {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
});

export default router;
