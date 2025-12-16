import {PriceInput}

export const calculateDiscount = (basePriceInput: PriceInput, discountedPriceInput?: PriceInput): DiscountResult => {
    const basePrice = Number(basePriceInput);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return {
            basePrice: 0,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    if (
        discountedPriceInput === null ||
        discountedPriceInput === undefined ||
        discountedPriceInput === ""
    ) {
        return {
            basePrice,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    const discountedPrice = Number(discountedPriceInput);

    if (
        !Number.isFinite(discountedPrice) ||
        discountedPrice >= basePrice
    ) {
        return {
            basePrice,
            discountedPrice: null,
            discountPercentage: 0,
        };
    }

    const discountPercentage = Math.round(
        ((basePrice - discountedPrice) / basePrice) * 100
    );

    return {
        basePrice,
        discountedPrice,
        discountPercentage,
    };
};