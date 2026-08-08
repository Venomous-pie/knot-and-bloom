import type { AuditLogEntry } from "../types/checkoutTypes.js";

/**
 * Structured audit logging service for security-sensitive operations.
 * Logs to console for now - can be extended to database or external service (e.g., Datadog, CloudWatch).
 */
export const AuditService = {
    log: (entry: AuditLogEntry): void => {
        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            ...entry,
        };

        const isDev = process.env.NODE_ENV !== 'production';

        if (isDev) {
            // Pretty colored log for development
            console.log(`\x1b[36m[AUDIT]\x1b[0m \x1b[90m${timestamp}\x1b[0m | \x1b[32m${entry.action}\x1b[0m | \x1b[35m${entry.entityType}:${entry.entityId}\x1b[0m | \x1b[34muser:${entry.userId}\x1b[0m`);
            if (entry.data) {
                console.log(`  \x1b[90m└─ DATA:\x1b[0m`, entry.data);
            }
            if (entry.errorMessage) {
                console.error(`  \x1b[31m└─ ERROR:\x1b[0m`, entry.errorMessage);
            }
        } else {
            // Structured JSON for production
            console.log(JSON.stringify(logData));
        }
    },

    /**
     * Log checkout session events
     */
    logCheckout: (action: string, sessionId: number, userId: number, data?: Record<string, any>, error?: string) => {
        AuditService.log({
            action,
            entityType: 'checkout',
            entityId: sessionId,
            userId,
            data,
            errorMessage: error,
        });
    },

    /**
     * Log payment events
     */
    logPayment: (action: string, paymentId: number, userId: number, data?: Record<string, any>, error?: string) => {
        AuditService.log({
            action,
            entityType: 'payment',
            entityId: paymentId,
            userId,
            data,
            errorMessage: error,
        });
    },

    /**
     * Log order events
     */
    logOrder: (action: string, orderId: number, userId: number, data?: Record<string, any>, error?: string) => {
        AuditService.log({
            action,
            entityType: 'order',
            entityId: orderId,
            userId,
            data,
            errorMessage: error,
        });
    },

    /**
     * Log authentication events (login, registration, logout, token refresh)
     */
    logAuth: (action: string, userId: number, data?: Record<string, any>, error?: string) => {
        AuditService.log({
            action,
            entityType: 'auth',
            entityId: userId,
            userId,
            data,
            errorMessage: error,
        });
    },

    /**
     * Log admin actions (approving sellers, changing product status, etc.)
     */
    logAdmin: (action: string, adminId: number, targetId: number, data?: Record<string, any>) => {
        AuditService.log({
            action,
            entityType: 'admin',
            entityId: targetId,
            userId: adminId,
            data,
        });
    },

    /**
     * Log account lifecycle events (deletion requests, cancellations, profile changes)
     */
    logAccount: (action: string, userId: number, data?: Record<string, any>) => {
        AuditService.log({
            action,
            entityType: 'account',
            entityId: userId,
            userId,
            data,
        });
    },

    /**
     * Log seller events (onboarding, application, status changes)
     */
    logSeller: (action: string, sellerId: number, userId: number, data?: Record<string, any>) => {
        AuditService.log({
            action,
            entityType: 'seller',
            entityId: sellerId,
            userId,
            data,
        });
    },

    /**
     * Log security events (rate limit hits, IDOR attempts, suspicious activity)
     */
    logSecurity: (action: string, ip: string, data?: Record<string, any>) => {
        const timestamp = new Date().toISOString();
        console.warn(`[SECURITY] ${timestamp} | ${action} | ip:${ip}`);
        if (data) {
            console.warn(`[SECURITY DATA]`, JSON.stringify(data, null, 2));
        }
    },
};

export default AuditService;
