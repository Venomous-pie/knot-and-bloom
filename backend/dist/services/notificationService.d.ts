interface Notification {
    type: 'email' | 'sms' | 'push';
    to: string;
    subject?: string;
    body?: string;
    html?: string;
    data?: any;
}
declare class NotificationService {
    send(notification: Notification): Promise<boolean>;
    private sendEmail;
    private sendSMS;
}
export declare const notifications: NotificationService;
export {};
//# sourceMappingURL=notificationService.d.ts.map