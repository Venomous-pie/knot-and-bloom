/**
 * Frontend Pricing Display Utilities
 * 
 * NOTE: The backend is the source of truth for all pricing calculations.
 * These utilities are provided for display formatting and fallback scenarios.
 * 
 * For actual price calculations, use the backend API responses which include:
 * - priceInfo.finalPrice (for cart items)
 * - product.discountedPrice (for product listings)
 */

import { Product, ProductVariant } from "@/types/products";

export interface PriceCalculation {
    effectivePrice: number;
    discountPercentage: number;
    discountedPrice: number | null;
    finalPrice: number;
    hasDiscount: boolean;
}

/**
 * Calculate the display price for a product or variant.
 * Use this only when backend priceInfo is not available.
 * 
 * @param product The product object
 * @param variant Optional variant to calculate price for
 * @returns Price calculation details
 */
export function calculatePrice(
    product: Product,
    variant?: ProductVariant | null
): PriceCalculation {
    // Effective price: variant price OR basePrice (fallback)
    const effectivePrice = variant?.price
        ? Number(variant.price)
        : Number(product.basePrice);

    // Discount hierarchy: variant discount > product discount
    const discountPercentage = variant?.discountPercentage ?? product.discountPercentage ?? 0;

    // Calculate discounted price if discount exists
    const hasDiscount = discountPercentage > 0;
    const discountedPrice = hasDiscount
        ? effectivePrice * (1 - discountPercentage / 100)
        : null;

    // Final price is either discounted or effective price
    const finalPrice = discountedPrice ?? effectivePrice;

    return {
        effectivePrice: Math.round(effectivePrice * 100) / 100,
        discountPercentage,
        discountedPrice: discountedPrice ? Math.round(discountedPrice * 100) / 100 : null,
        finalPrice: Math.round(finalPrice * 100) / 100,
        hasDiscount,
    };
}

/**
 * Find the lowest price among all variants (for display purposes)
 * @param product The product object
 * @returns The lowest final price and the variant it belongs to
 */
export function findLowestPrice(product: Product): {
    lowestPrice: number;
    lowestPriceVariant: ProductVariant | null;
} {
    if (!product.variants || product.variants.length === 0) {
        const calc = calculatePrice(product);
        return {
            lowestPrice: calc.finalPrice,
            lowestPriceVariant: null,
        };
    }

    let lowestPrice = Infinity;
    let lowestPriceVariant: ProductVariant | null = null;

    product.variants.forEach((variant) => {
        const calc = calculatePrice(product, variant);
        if (calc.finalPrice < lowestPrice) {
            lowestPrice = calc.finalPrice;
            lowestPriceVariant = variant;
        }
    });

    return { lowestPrice, lowestPriceVariant };
}

/**
 * Format a price for display
 */
export function formatPrice(price: number, currency: string = '₱'): string {
    return `${currency}${price.toFixed(2)}`;
}
