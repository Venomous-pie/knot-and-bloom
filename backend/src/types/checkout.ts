interface CartItemWithDetails {
    uid: number;
    quantity: number;
    productId: number;
    productVariantId: number | null;
    product: {
        uid: number;
        name: string;
        image: string | null;
        basePrice: any;
        discountPercentage: number | null;
        discountedPrice: any;
    };
    productVariant: {
        uid: number;
        name: string;
        price: any;
        discountPercentage: number | null;
        discountedPrice: any;
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

export type { CartItemWithDetails, LockedPriceItem };