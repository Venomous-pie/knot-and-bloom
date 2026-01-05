import Router from 'express';
import orderController from '../controllers/OrderController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { Role } from '../types/authTypes.js';

const router = Router();

router.use(authenticate);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);

router.put('/items/:itemId/status', authorize([Role.SELLER, Role.ADMIN]), orderController.updateOrderItemStatus);

router.put('/:id/status', authorize([Role.SELLER, Role.ADMIN]), orderController.updateOrderStatus);


export default router;
