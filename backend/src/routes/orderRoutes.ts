import Router from 'express';
import orderController from '../controllers/OrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);

export default router;
