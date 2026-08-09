import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export interface PaymentRequest {
    amount: number;
    method: string;
    idempotencyKey: string;
    userId: number;
    metadata?: Record<string, any>;
    lineItems?: { name: string; amount: number; quantity: number }[];
}

export interface PaymentResult {
    success: boolean;
    gatewayRef?: string;
    checkoutUrl?: string; // New field for PayMongo Checkout URL
    errorMessage?: string;
    errorCode?: string;
}

export const PaymentService = {
    processPayment: async (request: PaymentRequest, timeoutMs: number = 30000): Promise<PaymentResult> => {
        try {
            // COD always succeeds immediately locally (payment collected on delivery)
            if (request.method.toUpperCase() === 'COD') {
                return {
                    success: true,
                    gatewayRef: `COD_${uuidv4().substring(0, 8).toUpperCase()}`,
                };
            }

            // PAYMONGO INTEGRATION
            const secretKey = process.env.PAYMONGO_SECRET_KEY;
            if (!secretKey) {
                console.error('[PaymentService] PAYMONGO_SECRET_KEY is missing in .env');
                return {
                    success: false,
                    errorMessage: 'Payment gateway configuration error',
                    errorCode: 'CONFIG_ERROR',
                };
            }

            // Map internal method to PayMongo payment_method_types
            const methodMap: Record<string, string[]> = {
                'GCASH': ['gcash'],
                'PAYMAYA': ['paymaya'],
                'MARIBANK': ['qrph'],
                'CARD': ['card']
            };
            
            const paymentMethodTypes = methodMap[request.method.toUpperCase()] || ['gcash', 'paymaya', 'card', 'qrph'];

            const amountInCentavos = Math.round(request.amount * 100);

            // Map line items to PayMongo format, converting amounts to centavos
            const paymongoLineItems = request.lineItems && request.lineItems.length > 0 
                ? request.lineItems.map(item => ({
                    currency: 'PHP',
                    amount: Math.round(item.amount * 100),
                    name: item.name,
                    quantity: item.quantity
                }))
                : [
                    {
                        currency: 'PHP',
                        amount: amountInCentavos,
                        name: 'Knot & Bloom Order',
                        quantity: 1
                    }
                ];

            // Determine redirect URLs
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
            const sessionId = request.metadata?.sessionId;
            const successUrl = `${frontendUrl}/checkout/pending?session_id=${sessionId}`;
            const cancelUrl = `${frontendUrl}/checkout`;

            const paymongoPayload = {
                data: {
                    attributes: {
                        line_items: paymongoLineItems,
                        payment_method_types: paymentMethodTypes,
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        reference_number: request.idempotencyKey,
                        metadata: {
                            userId: request.userId.toString(),
                            ...request.metadata
                        }
                    }
                }
            };

            const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');

            // Use AbortController for timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => {
                controller.abort();
            }, timeoutMs);

            const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${encodedKey}`
                },
                body: JSON.stringify(paymongoPayload),
                signal: controller.signal as any
            });

            clearTimeout(timeout);

            const responseData: any = await response.json();

            if (!response.ok) {
                console.error('[PaymentService] PayMongo Error:', responseData);
                const firstError = responseData.errors?.[0];
                return {
                    success: false,
                    errorMessage: firstError?.detail || 'Payment gateway error',
                    errorCode: firstError?.code || 'GATEWAY_ERROR'
                };
            }

            const checkoutUrl = responseData.data.attributes.checkout_url;
            const gatewayRef = responseData.data.id; // The checkout session ID

            return {
                success: true,
                gatewayRef,
                checkoutUrl
            };

        } catch (error: any) {
            console.error('[PaymentService] Payment failed:', error);
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    errorMessage: 'Payment gateway timeout',
                    errorCode: 'TIMEOUT',
                };
            }
            return {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown payment error',
                errorCode: 'GATEWAY_ERROR',
            };
        }
    },

    getPaymentStatus: async (gatewayRef: string): Promise<'pending' | 'succeeded' | 'failed'> => {
        // We will implement this if needed, or rely on webhooks
        return 'pending'; 
    },

    refundPayment: async (gatewayRef: string, amount: number): Promise<PaymentResult> => {
        return {
            success: false,
            errorMessage: 'Refunds not automatically implemented yet',
            errorCode: 'NOT_IMPLEMENTED',
        };
    },

    validatePaymentMethod: (method: string): boolean => {
        const validMethods = ['CARD', 'GCASH', 'PAYMAYA', 'MARIBANK', 'COD'];
        return validMethods.includes(method.toUpperCase());
    },

    getAvailableMethods: (): string[] => {
        return ['CARD', 'GCASH', 'PAYMAYA', 'MARIBANK', 'COD'];
    },
};

export default PaymentService;
