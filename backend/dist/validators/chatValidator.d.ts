import { z } from 'zod';
export declare const sendMessageSchema: z.ZodObject<{
    recipientId: z.ZodNumber;
    message: z.ZodString;
}, z.core.$strip>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
//# sourceMappingURL=chatValidator.d.ts.map