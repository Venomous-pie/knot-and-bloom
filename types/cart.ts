import { Product, ProductVariant } from "@/types/products";

export interface CartItem {
    uid: number;
    cartId: number;
    productId: number;
    productVariantId?: number | null;
    quantity: number;
    product: Product;
    productVariant?: ProductVariant | null; // Full variant object
    variant?: string; // Keep for backward compatibility if needed, but prefer productVariant.name
}

export interface Cart {
    uid: number;
    customerId: number;
    items: CartItem[];
    updated: string;
}
