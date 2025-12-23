import { Router } from 'express';
import CheckoutController from '../controllers/CheckoutController.js';

const router = Router();

// Initiate a new checkout session
router.post('/initiate', CheckoutController.initiateCheckout);

// Get checkout session details
router.get('/:sessionId', CheckoutController.getCheckoutSession);

// Validate checkout before payment
router.post('/:sessionId/validate', CheckoutController.validateCheckout);

// Process payment
router.post('/:sessionId/pay', CheckoutController.processPayment);

// Complete checkout (finalize order)
router.post('/:sessionId/complete', CheckoutController.completeCheckout);

// Cancel checkout
router.delete('/:sessionId', CheckoutController.cancelCheckout);

// Get available payment methods
router.get('/methods/available', CheckoutController.getPaymentMethods);

export default router;
