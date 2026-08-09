export const createPaymentMethod = async (
    type: 'gcash' | 'paymaya' | 'qrph', 
    billing?: { name: string; email: string; phone: string; address: any }
) => {
    const publicKey = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY;
    if (!publicKey) throw new Error("PayMongo public key is missing");

    const encodedKey = btoa(`${publicKey}:`);

    const payload: any = {
        data: {
            attributes: {
                type,
            }
        }
    };

    if (billing) {
        payload.data.attributes.billing = billing;
    }

    const response = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${encodedKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.detail || 'Failed to create payment method');
    }

    const data = await response.json();
    return data.data.id;
};

export const attachPaymentIntent = async (paymentIntentId: string, paymentMethodId: string, clientKey: string, returnUrl: string) => {
    const publicKey = process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY;
    if (!publicKey) throw new Error("PayMongo public key is missing");

    const encodedKey = btoa(`${publicKey}:`);

    const payload = {
        data: {
            attributes: {
                payment_method: paymentMethodId,
                client_key: clientKey,
                return_url: returnUrl
            }
        }
    };

    const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${encodedKey}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.errors?.[0]?.detail || 'Failed to attach payment method');
    }

    const data = await response.json();
    return data.data.attributes.next_action;
};
