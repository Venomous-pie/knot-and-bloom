export interface OrderItem {
    uid: number;
    quantity: number;
    price: number;
    product: { name: string; image: string | null };
}

export interface Order {
    uid: number;
    status: string;
    total: number;
    uploaded: string;
    trackingNumber: string | null;
    courierName: string | null;
    customer: { name: string; email: string };
    items: OrderItem[];
    // Financials
    subtotal: number;
    platformFee: number;
    sellerEarnings: number;
    
    // Additional Backend Fields
    referenceNumber?: string | null;
    shippingAddressSnapshot?: string | null;
    shippingMethod?: string | null;
    shippingFee?: number;
    paymentMethod?: string | null;
    paymentStatus?: string;
    cancellationReason?: string | null;
    estimatedDeliveryDate?: string | null;
}
