import type { LockedPriceItem } from '../types/checkoutTypes.js';
/** Group locked-price items by their sellerId. */
export declare function groupItemsBySeller(items: LockedPriceItem[]): Map<number | null, LockedPriceItem[]>;
/** Calculate shipping fee based on the total checkout amount. */
export declare function calculateShippingFee(checkoutTotal: number): number;
/** Build the ordered-products snapshot array for order storage. */
export declare function buildOrderedProducts(items: LockedPriceItem[]): {
    product: {
        uid: number;
        name: string;
        image: string | null;
        seller: {
            name: string;
        } | null;
    };
    quantity: number;
    unitPrice: number;
    finalPrice: number;
    discountPercentage: number;
    variant: {
        uid: number | null;
        name: string;
    } | null;
}[];
//# sourceMappingURL=checkoutHelpers.d.ts.map