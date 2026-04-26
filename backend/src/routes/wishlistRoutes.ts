import express from 'express';
import { WishlistController } from '../controllers/WishlistController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require authentication for all wishlist routes
router.use(authenticate);

// Get wishlist for a customer
router.get('/:customerId', WishlistController.getWishlist);

// Toggle a product in the wishlist (add/remove)
router.post('/:customerId/toggle', WishlistController.toggleWishlistItem);

export default router;
