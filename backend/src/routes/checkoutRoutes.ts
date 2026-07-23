import { Router } from 'express';
import CheckoutController from '../controllers/CheckoutController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All checkout operations require authentication
router.use(authenticate);

// Initiate a new checkout session
router.post('/initiate', CheckoutController.initiateCheckout);

// Get checkout session details
router.get('/:sessionId', CheckoutController.getCheckoutSession);

// Validate checkout before payment
router.post('/:sessionId/validate', CheckoutController.validateCheckout);

// Estimate shipping fee
router.post('/:sessionId/estimate-shipping', CheckoutController.estimateShipping);

// Process payment
router.post('/:sessionId/pay', CheckoutController.processPayment);

// Complete checkout (finalize order)
router.post('/:sessionId/complete', CheckoutController.completeCheckout);

// Cancel checkout
router.delete('/:sessionId', CheckoutController.cancelCheckout);

// Get available payment methods
router.get('/methods/available', CheckoutController.getPaymentMethods);

export default router;
