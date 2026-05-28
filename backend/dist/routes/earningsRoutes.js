import { Router } from 'express';
import SellerEarningsController from '../controllers/SellerEarningsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
const router = Router();
// Seller Routes
router.get('/seller', authenticate, SellerEarningsController.getEarnings);
router.post('/withdraw', authenticate, SellerEarningsController.requestWithdrawal);
// Admin Routes
router.get('/admin/stats', authenticate, SellerEarningsController.getAdminStats);
router.post('/admin/withdraw/:id/process', authenticate, SellerEarningsController.processWithdrawal);
export default router;
//# sourceMappingURL=earningsRoutes.js.map