import { Product, ProductVariant } from "@/types/products";

export interface PriceInfo {
    effectivePrice: number;
    discountPercentage: number;
    finalPrice: number;
    hasDiscount: boolean;
    lineTotal: number;
}

export interface CartItem {
    uid: number;
    cartId: number;
    productId: number;
    productVariantId?: number | null;
    quantity: number;
    product: Product;
    productVariant?: ProductVariant | null;
    variant?: string; // Legacy compatibility
    priceInfo?: PriceInfo; // Pre-calculated from backend
}

export interface Cart {
    uid: number;
    customerId: number;
    items: CartItem[];
    updated: string;
    // Pre-calculated totals from backend
    subtotal?: number;
    totalSavings?: number;
    itemCount?: number;
}
