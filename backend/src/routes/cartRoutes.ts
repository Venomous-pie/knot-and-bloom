import express from 'express';
import { addToCart, checkout, getCart, removeFromCart, updateCartItem } from '../controllers/CartController.js';

const router = express.Router();

router.post('/add', addToCart);
router.get('/:customerId', getCart);
router.patch('/item/:itemId', updateCartItem);
router.delete('/item/:itemId', removeFromCart);
router.post('/checkout', checkout);

export default router;
