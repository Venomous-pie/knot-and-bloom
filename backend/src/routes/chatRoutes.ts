import Router from 'express';
import ChatController from '../controllers/ChatController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.post('/send', ChatController.sendMessage);

export default router;
