import { Product, ProductVariant } from "@/types/products";

/**
 * Pricing Rules:
 * 1. basePrice = Default price that all variants inherit
 * 2. variant.price (if set) = Override that replaces basePrice for that variant
 * 3. Discount hierarchy: variant discount > product discount
 */

export interface PriceCalculation {
    effectivePrice: number;
    discountPercentage: number;
    discountedPrice: number | null;
    finalPrice: number;
    hasDiscount: boolean;
}

/**
 * Calculate the final price for a product or specific variant
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
        effectivePrice,
        discountPercentage,
        discountedPrice,
        finalPrice,
        hasDiscount,
    };
}

/**
 * Find the lowest price among all variants
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
