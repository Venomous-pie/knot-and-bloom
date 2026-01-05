import express from 'express';
import { scanWaybill } from '../controllers/ServicesController.js';

const router = express.Router();

router.post('/ocr', scanWaybill);

export default router;
