import express from 'express';
import { getReviewsBySeller, getReviewsByProduct, createReview } from '../controllers/ReviewController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for fetching reviews
router.get('/seller/:slug', getReviewsBySeller);
router.get('/product/:id', getReviewsByProduct);

// Protected routes
router.post('/', authenticate, createReview);

export default router;
