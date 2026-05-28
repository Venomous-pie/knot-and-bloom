import { socketService } from '../services/SocketService.js';
import ErrorHandler from '../error/errorHandler.js';
import { ZodError } from 'zod';
import { sendMessageSchema } from '../validators/chatValidator.js';
const sendMessage = async (req, res) => {
    try {
        const senderId = req.user?.id;
        if (!senderId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const parsedInput = sendMessageSchema.parse(req.body);
        const { recipientId, message } = parsedInput;
        // Emit to recipient's room
        const messagePayload = {
            from: senderId,
            message,
            timestamp: new Date().toISOString()
        };
        socketService.emitToRoom(`user_${recipientId}`, 'chat:message', messagePayload);
        // Also emit to sender so they see it confirmed/synced on other devices
        const senderPayload = {
            ...messagePayload,
            to: recipientId
        };
        socketService.emitToRoom(`user_${senderId}`, 'chat:message', senderPayload);
        res.status(200).json({ success: true, message: "Message sent" });
    }
    catch (error) {
        console.error("Error sending message:", error);
        if (error instanceof ZodError) {
            // Instead of manually constructing ErrorHandler.ValidationError, use the error directly or convert it
            // Current CustomerController throws ErrorHandler.ValidationError(error.issues)
            // But here we are in the controller, so we can just respond.
            // However, to be consistent with other controllers, we can throw inside try and let valid middleware handle it 
            // OR just respond with the formatted error like I was doing before but using Zod issues.
            res.status(400).json({ message: "Validation failed", issues: error.issues });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};
export default {
    sendMessage
};
//# sourceMappingURL=ChatController.js.map