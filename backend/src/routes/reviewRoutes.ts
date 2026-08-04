import express from 'express';
import { getReviewsBySeller, getReviewsByProduct } from '../controllers/ReviewController.js';

const router = express.Router();

// Public routes for fetching reviews
router.get('/seller/:slug', getReviewsBySeller);
router.get('/product/:id', getReviewsByProduct);

export default router;
