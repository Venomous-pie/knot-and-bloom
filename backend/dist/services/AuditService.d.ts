import type { AuditLogEntry } from "../types/checkoutTypes.js";
/**
 * Structured audit logging service for security-sensitive operations.
 * Logs to console for now - can be extended to database or external service (e.g., Datadog, CloudWatch).
 */
export declare const AuditService: {
    log: (entry: AuditLogEntry) => void;
    /**
     * Log checkout session events
     */
    logCheckout: (action: string, sessionId: number, customerId: number, data?: Record<string, any>, error?: string) => void;
    /**
     * Log payment events
     */
    logPayment: (action: string, paymentId: number, customerId: number, data?: Record<string, any>, error?: string) => void;
    /**
     * Log order events
     */
    logOrder: (action: string, orderId: number, customerId: number, data?: Record<string, any>, error?: string) => void;
    /**
     * Log authentication events (login, registration, logout, token refresh)
     */
    logAuth: (action: string, customerId: number, data?: Record<string, any>, error?: string) => void;
    /**
     * Log admin actions (approving sellers, changing product status, etc.)
     */
    logAdmin: (action: string, adminId: number, targetId: number, data?: Record<string, any>) => void;
    /**
     * Log account lifecycle events (deletion requests, cancellations, profile changes)
     */
    logAccount: (action: string, customerId: number, data?: Record<string, any>) => void;
    /**
     * Log seller events (onboarding, application, status changes)
     */
    logSeller: (action: string, sellerId: number, customerId: number, data?: Record<string, any>) => void;
    /**
     * Log security events (rate limit hits, IDOR attempts, suspicious activity)
     */
    logSecurity: (action: string, ip: string, data?: Record<string, any>) => void;
};
export default AuditService;
//# sourceMappingURL=AuditService.d.ts.map