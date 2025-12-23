interface PriceInput {
    basePrice: number;
    discountedPercentage?: number | null | undefined;
}

interface ProductLike {
    basePrice: number | string;
    discountPercentage?: number | null;
}

interface VariantLike {
    price?: number | string | null;
    discountPercentage?: number | null;
}

interface PriceCalculation {
    effectivePrice: number;
    discountPercentage: number;
    discountedPrice: number | null;
    finalPrice: number;
    hasDiscount: boolean;
}

export type { PriceInput, ProductLike, VariantLike, PriceCalculation };