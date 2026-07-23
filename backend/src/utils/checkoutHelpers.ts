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

import { resolveZoneTier, computeShippingFee, type ShippingConfig, type SellerShippingProfile } from './shippingUtils.js';
import type { ShipmentType } from '../../generated/prisma/client.js';

export interface BuyerAddressProfile {
    citymunCode?: string | null;
    provCode?: string | null;
    regCode?: string | null;
    zoneTierOverride?: number | null;
}

export interface SellerShippingResult {
    zoneTier: number;
    fee: number;
    fuelCost: number;
    resolvedType: ShipmentType;
    meetUpSnapshot: string | null;
    breakdown: string[];
}

/** Resolves the shipping fee and fulfillment type for a single seller. */
export async function resolveSellerShipping(
    sellerProfile: SellerShippingProfile & { sellerCitymunCode?: string | null, sellerProvCode?: string | null, sellerRegCode?: string | null, meetUpPoint?: string | null, freeShippingEnabled?: boolean, freeShippingThreshold?: any },
    buyerAddress: BuyerAddressProfile,
    buyerChoice: 'PICKUP' | 'DELIVERY',
    config: ShippingConfig,
    sellerSubtotal: number
): Promise<SellerShippingResult> {
    if (buyerChoice === 'PICKUP') {
        return {
            zoneTier: 1, // Doesn't matter for pickup
            fee: 0,
            fuelCost: 0,
            resolvedType: 'PICKUP',
            meetUpSnapshot: sellerProfile.meetUpPoint || null,
            breakdown: ['Buyer chose pickup. Shipping fee waived.'],
        };
    }

    // Default to Tier 3 if location data is missing on either side
    let zoneTier = 3;
    if (sellerProfile.sellerCitymunCode && sellerProfile.sellerProvCode && sellerProfile.sellerRegCode &&
        buyerAddress.citymunCode && buyerAddress.provCode && buyerAddress.regCode) {
        zoneTier = resolveZoneTier(
            sellerProfile.sellerCitymunCode, sellerProfile.sellerProvCode, sellerProfile.sellerRegCode,
            buyerAddress.citymunCode, buyerAddress.provCode, buyerAddress.regCode,
            buyerAddress.zoneTierOverride
        );
    } else if (buyerAddress.zoneTierOverride) {
        zoneTier = buyerAddress.zoneTierOverride;
    }

    const result = computeShippingFee(buyerChoice, sellerProfile, zoneTier, null, config);

    // Apply Free Shipping Threshold if enabled and met
    let finalFee = result.fee;
    let finalBreakdown = [...result.breakdown];
    if (sellerProfile.freeShippingEnabled && sellerProfile.freeShippingThreshold != null) {
        if (sellerSubtotal >= Number(sellerProfile.freeShippingThreshold)) {
            finalBreakdown.push(`Subtotal (₱${sellerSubtotal.toFixed(2)}) met Free Shipping threshold (₱${Number(sellerProfile.freeShippingThreshold).toFixed(2)}). Fee waived.`);
            finalFee = 0;
        } else {
            finalBreakdown.push(`Subtotal (₱${sellerSubtotal.toFixed(2)}) did not meet Free Shipping threshold (₱${Number(sellerProfile.freeShippingThreshold).toFixed(2)}).`);
        }
    }

    return {
        zoneTier,
        fee: finalFee,
        fuelCost: result.fuelCost,
        resolvedType: result.resolvedType,
        meetUpSnapshot: null,
        breakdown: finalBreakdown,
    };
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
