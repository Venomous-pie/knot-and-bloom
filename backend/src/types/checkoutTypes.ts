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
}

interface AuditLogEntry {
    action: string;
    entityType: 'checkout' | 'payment' | 'order';
    entityId: number;
    customerId: number;
    data?: Record<string, any> | undefined;
    errorMessage?: string | undefined;
}

export type { CartItemWithDetails, LockedPriceItem, AuditLogEntry };