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
}
