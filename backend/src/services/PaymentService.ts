import { v4 as uuidv4 } from 'uuid';

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

// Simulated payment processing delay range (ms)
const MIN_PROCESSING_TIME = 500;
const MAX_PROCESSING_TIME = 2000;

// Simulated failure rate for testing (0-1)
const SIMULATED_FAILURE_RATE = 0.1;

/**
 * Mock Payment Gateway Service
 * Simulates payment processing with configurable delays and failure rates.
 * Replace with real payment gateway (Stripe, PayPal, etc.) for production.
 */
export const PaymentService = {
    /**
     * Process a payment through the mock gateway
     * @param request Payment request details
     * @param timeoutMs Maximum time to wait for response (default 30 seconds)
     */
    processPayment: async (request: PaymentRequest, timeoutMs: number = 30000): Promise<PaymentResult> => {
        const startTime = Date.now();

        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise<PaymentResult>((_, reject) => {
            setTimeout(() => {
                reject(new Error('Payment gateway timeout'));
            }, timeoutMs);
        });

        // Create the actual payment processing promise
        const paymentPromise = new Promise<PaymentResult>(async (resolve) => {
            // Simulate network delay
            const processingTime = Math.random() * (MAX_PROCESSING_TIME - MIN_PROCESSING_TIME) + MIN_PROCESSING_TIME;
            await new Promise(r => setTimeout(r, processingTime));

            // COD always succeeds (payment collected on delivery)
            if (request.method.toUpperCase() === 'COD') {
                resolve({
                    success: true,
                    gatewayRef: `COD_${uuidv4().substring(0, 8).toUpperCase()}`,
                });
                return;
            }

            // Simulate random failures for card/wallet methods (for testing)
            if (Math.random() < SIMULATED_FAILURE_RATE) {
                const failureTypes = request.method.toUpperCase().includes('WALLET')
                    ? [
                        { errorMessage: 'Wallet balance insufficient', errorCode: 'INSUFFICIENT_BALANCE' },
                        { errorMessage: 'Wallet account locked', errorCode: 'ACCOUNT_LOCKED' },
                    ]
                    : [
                        { errorMessage: 'Card declined', errorCode: 'CARD_DECLINED' },
                        { errorMessage: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' },
                        { errorMessage: 'Card expired', errorCode: 'CARD_EXPIRED' },
                        { errorMessage: 'Invalid card number', errorCode: 'INVALID_CARD' },
                    ];
                const failure = failureTypes[Math.floor(Math.random() * failureTypes.length)];
                resolve({
                    success: false,
                    ...failure,
                });
                return;
            }

            // Success - generate a mock gateway reference
            const gatewayRef = `MOCK_${uuidv4().substring(0, 8).toUpperCase()}`;

            resolve({
                success: true,
                gatewayRef,
            });
        });

        try {
            // Race between payment processing and timeout
            const result = await Promise.race([paymentPromise, timeoutPromise]);

            const elapsed = Date.now() - startTime;
            console.log(`[PaymentService] Payment processed in ${elapsed}ms | Success: ${result.success}`);

            return result;
        } catch (error) {
            console.error('[PaymentService] Payment failed:', error);
            return {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown payment error',
                errorCode: 'GATEWAY_ERROR',
            };
        }
    },

    /**
     * Poll payment status (for async payment flows)
     * In a real implementation, this would query the payment gateway
     */
    getPaymentStatus: async (gatewayRef: string): Promise<'pending' | 'succeeded' | 'failed'> => {
        // Mock implementation - in real scenario, query the gateway
        // For now, assume all completed payments succeeded
        return 'succeeded';
    },

    /**
     * Refund a payment
     */
    refundPayment: async (gatewayRef: string, amount: number): Promise<PaymentResult> => {
        // Simulate refund processing
        await new Promise(r => setTimeout(r, 500));

        return {
            success: true,
            gatewayRef: `REFUND_${gatewayRef}`,
        };
    },

    /**
     * Validate payment method (basic validation)
     */
    validatePaymentMethod: (method: string): boolean => {
        const validMethods = ['MOCK_CARD', 'MOCK_WALLET', 'COD'];
        return validMethods.includes(method.toUpperCase());
    },

    /**
     * Get available payment methods
     */
    getAvailableMethods: (): string[] => {
        return ['MOCK_CARD', 'MOCK_WALLET', 'COD'];
    },
};

export default PaymentService;
