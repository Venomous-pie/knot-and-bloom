
export interface AuditLogEntry {
    action: string;
    entityType: 'checkout' | 'payment' | 'order';
    entityId: number;
    customerId: number;
    data?: Record<string, any> | undefined;
    errorMessage?: string | undefined;
}

/**
 * Simple audit logging service for order/payment events.
 * Logs to console for now - can be extended to database or external service.
 */
export const AuditService = {
    log: (entry: AuditLogEntry): void => {
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
    logCheckout: (action: string, sessionId: number, customerId: number, data?: Record<string, any>, error?: string) => {
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
    logPayment: (action: string, paymentId: number, customerId: number, data?: Record<string, any>, error?: string) => {
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
    logOrder: (action: string, orderId: number, customerId: number, data?: Record<string, any>, error?: string) => {
        AuditService.log({
            action,
            entityType: 'order',
            entityId: orderId,
            customerId,
            data,
            errorMessage: error,
        });
    },
};

export default AuditService;
