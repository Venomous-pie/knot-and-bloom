import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export interface PaymentRequest {
    amount: number;
    method: string;
    idempotencyKey: string;
    userId: number;
    metadata?: Record<string, any>;
}

export interface PaymentResult {
    success: boolean;
    gatewayRef?: string;
    paymentIntentId?: string;
    clientKey?: string;
    errorMessage?: string;
    errorCode?: string;
}

export const PaymentService = {
    createPaymentIntent: async (request: PaymentRequest, timeoutMs: number = 30000): Promise<PaymentResult> => {
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

            // Only e-wallets supported via custom checkout for now
            const methodMap: Record<string, string[]> = {
                'GCASH': ['gcash'],
                'PAYMAYA': ['paymaya'],
                'MARIBANK': ['qrph'], // Maribank will map to QRPh for now
                'QRPH': ['qrph']
            };
            
            const paymentMethodAllowed = methodMap[request.method.toUpperCase()] || ['gcash', 'paymaya', 'qrph'];

            const amountInCentavos = Math.round(request.amount * 100);

            const paymongoPayload = {
                data: {
                    attributes: {
                        amount: amountInCentavos,
                        payment_method_allowed: paymentMethodAllowed,
                        payment_method_options: {
                            card: { request_three_d_secure: 'any' }
                        },
                        currency: 'PHP',
                        statement_descriptor: 'Knot & Bloom',
                        description: `Order for User ${request.userId}`,
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

            const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
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

            const paymentIntentId = responseData.data.id;
            const clientKey = responseData.data.attributes.client_key;

            return {
                success: true,
                gatewayRef: paymentIntentId,
                paymentIntentId,
                clientKey
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
        try {
            const secretKey = process.env.PAYMONGO_SECRET_KEY;
            if (!secretKey) return 'pending';
            
            const encodedKey = Buffer.from(`${secretKey}:`).toString('base64');
            const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${gatewayRef}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${encodedKey}`
                }
            });
            if (!response.ok) return 'pending';
            
            const data: any = await response.json();
            const status = data.data?.attributes?.status;
            
            if (status === 'succeeded') return 'succeeded';
            if (status === 'failed' || status === 'cancelled') return 'failed';
            return 'pending';
        } catch (error) {
            console.error('[PaymentService] Error checking payment status:', error);
            return 'pending';
        }
    },

    refundPayment: async (gatewayRef: string, amount: number): Promise<PaymentResult> => {
        return {
            success: false,
            errorMessage: 'Refunds not automatically implemented yet',
            errorCode: 'NOT_IMPLEMENTED',
        };
    },

    validatePaymentMethod: (method: string): boolean => {
        const validMethods = ['GCASH', 'PAYMAYA', 'MARIBANK', 'QRPH', 'COD'];
        return validMethods.includes(method.toUpperCase());
    },

    getAvailableMethods: (): string[] => {
        return ['GCASH', 'PAYMAYA', 'MARIBANK', 'QRPH', 'COD'];
    },
};

export default PaymentService;
