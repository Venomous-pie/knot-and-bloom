import express from 'express';
import CartController from '../controllers/CartController.js';

const router = express.Router();

router.post('/add', CartController.addToCart);
router.get('/:customerId', CartController.getCart);
router.patch('/item/:itemId', CartController.updateCartItem);
router.delete('/item/:itemId', CartController.removeFromCart);
router.post('/checkout', CartController.checkout);

export default router;
