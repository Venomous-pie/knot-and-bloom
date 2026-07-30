import express from 'express';
import CartController from '../controllers/CartController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All cart operations require authentication
router.use(authenticate);

router.post('/add', CartController.addToCart);
router.get('/:userId', CartController.getCart);
router.patch('/item/:itemId', CartController.updateCartItem);
router.delete('/item/:itemId', CartController.removeFromCart);
router.post('/checkout', CartController.checkout);

export default router;
