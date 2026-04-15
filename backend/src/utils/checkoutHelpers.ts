import type { LockedPriceItem } from '../types/checkoutTypes.js';

// Shipping fee constants (mirrors CheckoutController.ts)
const FREE_SHIPPING_THRESHOLD = 500;
const STANDARD_SHIPPING_FEE = 60;

/** Group locked-price items by their sellerId. */
export function groupItemsBySeller(items: LockedPriceItem[]): Map<number | null, LockedPriceItem[]> {
    const map = new Map<number | null, LockedPriceItem[]>();
    for (const item of items) {
        const key = item.sellerId;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
    }
    return map;
}

/** Calculate shipping fee based on the total checkout amount. */
export function calculateShippingFee(checkoutTotal: number): number {
    return checkoutTotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}

/** Build the ordered-products snapshot array for order storage. */
export function buildOrderedProducts(items: LockedPriceItem[]) {
    return items.map(item => ({
        product: {
            uid: item.productId,
            name: item.productName,
            image: item.image,
            seller: item.sellerName ? { name: item.sellerName } : null,
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        finalPrice: item.finalPrice,
        discountPercentage: item.discountPercentage,
        variant: item.variantName
            ? { uid: item.variantId, name: item.variantName }
            : null,
    }));
}
