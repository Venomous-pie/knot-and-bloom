import Router from 'express';
import ChatController from '../controllers/ChatController.js';
import AiChatController from '../controllers/AiChatController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/send', authenticate, ChatController.sendMessage);
router.post('/ai', optionalAuthenticate, AiChatController.sendAiMessage);
export default router;
//# sourceMappingURL=chatRoutes.js.map