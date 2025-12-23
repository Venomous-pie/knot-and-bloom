
interface Notification {
    type: 'email' | 'sms' | 'push';
    to: string;
    subject?: string;
    body?: string;
    html?: string;
    data?: any;
}

class NotificationService {
    async send(notification: Notification): Promise<boolean> {
        switch (notification.type) {
            case 'email':
                return this.sendEmail(notification);
            case 'sms':
                return this.sendSMS(notification);
            default:
                console.warn(`Unsupported notification type: ${notification.type}`);
                return false;
        }
    }

    private async sendEmail(notif: Notification): Promise<boolean> {
        // TODO: Integrate with SendGrid/Resend
        // For now, log to console for dev/verify
        console.log(`
      📧 [MOCK EMAIL SENT]
      To: ${notif.to}
      Subject: ${notif.subject}
      Body: ${notif.html || notif.body}
    `);

        // Simulate successful delivery
        return true;
    }

    private async sendSMS(notif: Notification): Promise<boolean> {
        console.log(`📱 [MOCK SMS] To: ${notif.to}: ${notif.body}`);
        return true;
    }
}

export const notifications = new NotificationService();
