class NotificationService {
    async send(notification) {
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
    async sendEmail(notif) {
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
    async sendSMS(notif) {
        console.log(`📱 [MOCK SMS] To: ${notif.to}: ${notif.body}`);
        return true;
    }
}
export const notifications = new NotificationService();
//# sourceMappingURL=notificationService.js.map