import express from 'express';
import rateLimit from 'express-rate-limit';
import { sellerController } from '../controllers/SellerController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { Role } from '../types/authTypes.js';
const router = express.Router();
// Rate limiter for seller application endpoints
const sellerOnboardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: 'Too many application attempts. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Public / Seller
router.post('/', authenticate, sellerOnboardLimiter, sellerController.registerSeller); // Direct Register (requires auth)
router.post('/onboard', authenticate, sellerOnboardLimiter, sellerController.onboardSeller); // Upgrade User
router.delete('/me/application', authenticate, sellerController.cancelApplication); // Cancel Pending Application
router.get('/active', sellerController.listActiveSellers); // Public active sellers list
router.get('/:slug', sellerController.getSellerBySlug); // Public Profile
// Protected Routes
router.get('/', authenticate, authorize([Role.ADMIN]), sellerController.listSellers);
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.SELLER]), sellerController.updateSeller);
router.get('/me/dashboard-stats', authenticate, authorize([Role.SELLER, Role.ADMIN]), sellerController.getDashboardStats);
router.get('/me/sidebar-stats', authenticate, authorize([Role.SELLER, Role.ADMIN]), sellerController.getSidebarStats);
router.get('/me/products', authenticate, sellerController.getOwnProducts);
router.patch('/me/welcome-seen', authenticate, sellerController.markWelcomeSeen);
// Seller Dashboard (Shared with Admin)
router.get('/:id/orders', authenticate, authorize([Role.SELLER, Role.ADMIN]), sellerController.getSellerOrders);
export default router;
//# sourceMappingURL=sellerRoutes.js.map