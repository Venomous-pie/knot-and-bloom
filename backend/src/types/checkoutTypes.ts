import type { Prisma } from "../../generated/prisma/client.js";

interface CartItemWithDetails {
    uid: number;
    quantity: number;
    productId: number;
    productVariantId: number | null;
    product: {
        uid: number;
        name: string;
        image: string | null;
        basePrice: Prisma.Decimal;
        discountPercentage: number | null;
        discountedPrice: Prisma.Decimal | null;
    };
    productVariant: {
        uid: number;
        name: string;
        price: Prisma.Decimal | null;
        discountPercentage: number | null;
        discountedPrice: Prisma.Decimal | null;
        stock: number;
        image: string | null;
    } | null;
}

interface LockedPriceItem {
    itemUid: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    finalPrice: number;
    productName: string;
    variantName: string | null;
    image: string | null;
    sellerId: number | null;
    sellerName: string | null;
}

interface SessionCartItem {
    uid: number;
    quantity: number;
    productId: number;
    productVariantId: number | null;
    product: {
        uid: number;
        name: string;
        image: string | null;
        basePrice: Prisma.Decimal;
        discountPercentage: number | null;
        discountedPrice: Prisma.Decimal | null;
    };
    productVariant: {
        uid: number;
        name: string;
        price: Prisma.Decimal | null;
        discountPercentage: number | null;
        discountedPrice: Prisma.Decimal | null;
        stock: number;
        image: string | null;
    } | null;
}

interface SessionOrderGroup {
    uid: number;
    seller: {
        uid: number;
        user: {
            uid: number;
            firstName: string;
            lastName: string;
        }
    };
    items: SessionCartItem[];
    subtotal: number;
    shippingFee: number;
    fulfillmentType?: string;
}

interface CheckoutSessionResponse {
    subtotal: number;
    shippingFee: number;
    totalAmount: number;
    shippingAddressSnapshot?: string | null;
    billingAddressSnapshot?: string | null;
    shippingMethod?: string | null;
    paymentMethod?: string | null;
    orderGroups: SessionOrderGroup[];
}

interface AuditLogEntry {
    action: string;
    entityType: 'checkout' | 'payment' | 'order' | 'auth' | 'admin' | 'account' | 'seller';
    entityId: number;
    userId: number;
    data?: Record<string, any> | undefined;
    errorMessage?: string | undefined;
}

export type { CartItemWithDetails, LockedPriceItem, AuditLogEntry, SessionCartItem, SessionOrderGroup, CheckoutSessionResponse };