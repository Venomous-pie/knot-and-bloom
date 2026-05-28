import { z } from 'zod';
export const sendMessageSchema = z.object({
    recipientId: z.number(),
    message: z.string().min(1, "Message cannot be empty")
});
//# sourceMappingURL=chatValidator.js.map