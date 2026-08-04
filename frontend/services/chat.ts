import { apiClient } from './client';

export const chatAPI = {
    sendAiMessage: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
        apiClient.post<{ success: boolean; reply: string }>('/chat/ai', { messages }),
};
