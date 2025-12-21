import express from 'express';
import { sellerController } from '../controllers/sellerController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { Role } from '../types/auth.js';

const router = express.Router();

// Public / Seller
router.post('/', sellerController.registerSeller); // Direct Register
router.post('/onboard', authenticate, sellerController.onboardSeller); // Upgrade User
router.get('/:slug', sellerController.getSellerBySlug); // Public Profile

// Protected Routes
router.get('/', authenticate, authorize([Role.ADMIN]), sellerController.listSellers);
router.put('/:id', authenticate, authorize([Role.ADMIN]), sellerController.updateSeller);

// Seller Dashboard (Shared with Admin)
router.get('/:id/orders', authenticate, authorize([Role.SELLER, Role.ADMIN]), sellerController.getSellerOrders);

export default router;
