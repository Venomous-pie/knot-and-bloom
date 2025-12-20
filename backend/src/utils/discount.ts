/**
 * Pricing utility functions for the backend.
 * This is the single source of truth for all price calculations.
 */

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

export interface PriceCalculation {
    effectivePrice: number;
    discountPercentage: number;
    discountedPrice: number | null;
    finalPrice: number;
    hasDiscount: boolean;
}

/**
 * Simple discount calculation (legacy, for backwards compatibility)
 */
export const CalculateDiscount = (priceInput: PriceInput) => {
    const basePrice = priceInput.basePrice;

    if (!isFinite(basePrice) || basePrice <= 0) {
        return {
            basePrice: 0,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    if (
        priceInput.discountedPercentage === null ||
        priceInput.discountedPercentage === undefined ||
        priceInput.discountedPercentage === 0
    ) {
        return {
            basePrice,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    const discountPercentage = priceInput.discountedPercentage;

    if (
        !isFinite(discountPercentage) ||
        discountPercentage <= 0 ||
        discountPercentage >= 100
    ) {
        return {
            basePrice,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    const discountedPrice = basePrice * (1 - discountPercentage / 100);

    return {
        basePrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimals
        discountPercentage,
    };
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
export function calculateFinalPrice(
    product: ProductLike,
    variant?: VariantLike | null
): PriceCalculation {
    // Normalize basePrice to number
    const productBasePrice = typeof product.basePrice === 'string'
        ? parseFloat(product.basePrice)
        : product.basePrice;

    // Effective price: variant price OR basePrice (fallback)
    let effectivePrice = productBasePrice;
    if (variant?.price !== null && variant?.price !== undefined) {
        effectivePrice = typeof variant.price === 'string'
            ? parseFloat(variant.price)
            : variant.price;
    }

    // Handle invalid effective price
    if (!isFinite(effectivePrice) || effectivePrice <= 0) {
        return {
            effectivePrice: 0,
            discountPercentage: 0,
            discountedPrice: null,
            finalPrice: 0,
            hasDiscount: false,
        };
    }

    // Discount hierarchy: variant discount > product discount
    let discountPercentage = 0;
    if (variant?.discountPercentage !== null && variant?.discountPercentage !== undefined) {
        discountPercentage = variant.discountPercentage;
    } else if (product.discountPercentage !== null && product.discountPercentage !== undefined) {
        discountPercentage = product.discountPercentage;
    }

    // Validate discount percentage
    if (!isFinite(discountPercentage) || discountPercentage <= 0 || discountPercentage >= 100) {
        discountPercentage = 0;
    }

    // Calculate discounted price if discount exists
    const hasDiscount = discountPercentage > 0;
    const discountedPrice = hasDiscount
        ? Math.round(effectivePrice * (1 - discountPercentage / 100) * 100) / 100
        : null;

    // Final price is either discounted or effective price
    const finalPrice = discountedPrice ?? effectivePrice;

    return {
        effectivePrice: Math.round(effectivePrice * 100) / 100,
        discountPercentage,
        discountedPrice,
        finalPrice: Math.round(finalPrice * 100) / 100,
        hasDiscount,
    };
}

/**
 * Find the lowest price among all variants of a product
 */
export function findLowestPrice(
    product: ProductLike,
    variants?: VariantLike[] | null
): {
    lowestPrice: number;
    lowestVariantIndex: number | null;
} {
    if (!variants || variants.length === 0) {
        const calc = calculateFinalPrice(product);
        return {
            lowestPrice: calc.finalPrice,
            lowestVariantIndex: null,
        };
    }

    let lowestPrice = Infinity;
    let lowestVariantIndex: number | null = null;

    variants.forEach((variant, index) => {
        const calc = calculateFinalPrice(product, variant);
        if (calc.finalPrice < lowestPrice) {
            lowestPrice = calc.finalPrice;
            lowestVariantIndex = index;
        }
    });

    return { lowestPrice, lowestVariantIndex };
}