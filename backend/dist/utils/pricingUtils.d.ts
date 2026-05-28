import type { PriceInput, ProductLike, VariantLike, PriceCalculation } from '../types/pricingTypes.js';
export declare const CalculateDiscount: (priceInput: PriceInput) => {
    basePrice: number;
    discountedPrice: null;
    discountPercentage: number;
} | {
    basePrice: number;
    discountedPrice: number;
    discountPercentage: number;
};
/**
 * Calculate the final price for a product or specific variant.
 *
 * Pricing Rules:
 * 1. basePrice = Default price that all variants inherit
 * 2. variant.price (if set) = Override that replaces basePrice for that variant
 * 3. Discount hierarchy: variant discount > product discount
 *
 * @param product The product object with basePrice and optional discountPercentage
 * @param variant Optional variant with optional price and discountPercentage overrides
 * @returns Price calculation details
 */
export declare function calculateFinalPrice(product: ProductLike, variant?: VariantLike | null): PriceCalculation;
/**
 * Find the lowest price among all variants of a product
 */
export declare function findLowestPrice(product: ProductLike, variants?: VariantLike[] | null): {
    lowestPrice: number;
    lowestVariantIndex: number | null;
};
/**
 * Calculate the discounted price to be stored in the database for a variant.
 * Returns null if the variant has no price or no applicable discount.
 */
export declare function calculateVariantStoredDiscountedPrice(variantPrice: number | null | undefined, variantDiscount: number | null | undefined, productDiscount: number | null | undefined): number | null;
declare const _default: {
    calculateFinalPrice: typeof calculateFinalPrice;
    findLowestPrice: typeof findLowestPrice;
    calculateVariantStoredDiscountedPrice: typeof calculateVariantStoredDiscountedPrice;
    CalculateDiscount: (priceInput: PriceInput) => {
        basePrice: number;
        discountedPrice: null;
        discountPercentage: number;
    } | {
        basePrice: number;
        discountedPrice: number;
        discountPercentage: number;
    };
};
export default _default;
//# sourceMappingURL=pricingUtils.d.ts.map