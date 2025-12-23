export interface SendMessageInput {
    recipientId: number;
    message: string;
}

export interface ChatMessage {
    from: number;
    to?: number;
    message: string;
    timestamp: string;
}
