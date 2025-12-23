import { z } from 'zod';

export const sendMessageSchema = z.object({
    recipientId: z.number(),
    message: z.string().min(1, "Message cannot be empty")
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
