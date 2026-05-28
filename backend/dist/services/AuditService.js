/**
 * Structured audit logging service for security-sensitive operations.
 * Logs to console for now - can be extended to database or external service (e.g., Datadog, CloudWatch).
 */
export const AuditService = {
    log: (entry) => {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            ...entry,
        };
        // Log to console with structured format
        console.log(`[AUDIT] ${timestamp} | ${entry.action} | ${entry.entityType}:${entry.entityId} | customer:${entry.customerId}`);
        if (entry.data) {
            console.log(`[AUDIT DATA]`, JSON.stringify(entry.data, null, 2));
        }
        if (entry.errorMessage) {
            console.error(`[AUDIT ERROR]`, entry.errorMessage);
        }
    },
    /**
     * Log checkout session events
     */
    logCheckout: (action, sessionId, customerId, data, error) => {
        AuditService.log({
            action,
            entityType: 'checkout',
            entityId: sessionId,
            customerId,
            data,
            errorMessage: error,
        });
    },
    /**
     * Log payment events
     */
    logPayment: (action, paymentId, customerId, data, error) => {
        AuditService.log({
            action,
            entityType: 'payment',
            entityId: paymentId,
            customerId,
            data,
            errorMessage: error,
        });
    },
    /**
     * Log order events
     */
    logOrder: (action, orderId, customerId, data, error) => {
        AuditService.log({
            action,
            entityType: 'order',
            entityId: orderId,
            customerId,
            data,
            errorMessage: error,
        });
    },
    /**
     * Log authentication events (login, registration, logout, token refresh)
     */
    logAuth: (action, customerId, data, error) => {
        AuditService.log({
            action,
            entityType: 'auth',
            entityId: customerId,
            customerId,
            data,
            errorMessage: error,
        });
    },
    /**
     * Log admin actions (approving sellers, changing product status, etc.)
     */
    logAdmin: (action, adminId, targetId, data) => {
        AuditService.log({
            action,
            entityType: 'admin',
            entityId: targetId,
            customerId: adminId,
            data,
        });
    },
    /**
     * Log account lifecycle events (deletion requests, cancellations, profile changes)
     */
    logAccount: (action, customerId, data) => {
        AuditService.log({
            action,
            entityType: 'account',
            entityId: customerId,
            customerId,
            data,
        });
    },
    /**
     * Log seller events (onboarding, application, status changes)
     */
    logSeller: (action, sellerId, customerId, data) => {
        AuditService.log({
            action,
            entityType: 'seller',
            entityId: sellerId,
            customerId,
            data,
        });
    },
    /**
     * Log security events (rate limit hits, IDOR attempts, suspicious activity)
     */
    logSecurity: (action, ip, data) => {
        const timestamp = new Date().toISOString();
        console.warn(`[SECURITY] ${timestamp} | ${action} | ip:${ip}`);
        if (data) {
            console.warn(`[SECURITY DATA]`, JSON.stringify(data, null, 2));
        }
    },
};
export default AuditService;
//# sourceMappingURL=AuditService.js.map