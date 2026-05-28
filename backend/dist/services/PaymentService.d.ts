export interface PaymentRequest {
    amount: number;
    method: string;
    idempotencyKey: string;
    customerId: number;
    metadata?: Record<string, any>;
}
export interface PaymentResult {
    success: boolean;
    gatewayRef?: string;
    errorMessage?: string;
    errorCode?: string;
}
/**
 * Mock Payment Gateway Service
 * Simulates payment processing with configurable delays and failure rates.
 * Replace with real payment gateway (Stripe, PayPal, etc.) for production.
 */
export declare const PaymentService: {
    /**
     * Process a payment through the mock gateway
     * @param request Payment request details
     * @param timeoutMs Maximum time to wait for response (default 30 seconds)
     */
    processPayment: (request: PaymentRequest, timeoutMs?: number) => Promise<PaymentResult>;
    /**
     * Poll payment status (for async payment flows)
     * In a real implementation, this would query the payment gateway
     */
    getPaymentStatus: (gatewayRef: string) => Promise<"pending" | "succeeded" | "failed">;
    /**
     * Refund a payment
     */
    refundPayment: (gatewayRef: string, amount: number) => Promise<PaymentResult>;
    /**
     * Validate payment method (basic validation)
     */
    validatePaymentMethod: (method: string) => boolean;
    /**
     * Get available payment methods
     */
    getAvailableMethods: () => string[];
};
export default PaymentService;
//# sourceMappingURL=PaymentService.d.ts.map