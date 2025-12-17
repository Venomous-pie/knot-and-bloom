import type { PriceInput } from '../types/product.js'

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