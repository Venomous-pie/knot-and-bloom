import { isAdjacentMunicipality } from '../constant/municipalAdjacency.js';
import { isSameIslandGroup } from '../constant/islandGroups.js';
import { THIRD_PARTY_FLAT_RATES } from '../constant/shippingConfig.js';
import { VehicleType, ShipmentType } from '../../generated/prisma/client.js';

export interface ShippingConfig {
    fuelPricePerLiter: number;
    motorcycleFuelEfficiency: number;
    tricycleFuelEfficiency: number;
    multicabFuelEfficiency: number;
    laborAllowance: number;
    floorFee: number;
    selfDeliveryMaxKm: number;
}

export interface SellerShippingProfile {
    selfDeliveryEnabled: boolean;
    vehicleType: VehicleType | null;
}

/**
 * Rounds a number to the nearest 5.
 */
export function roundToNearest5(n: number): number {
    return Math.round(n / 5) * 5;
}

/**
 * Resolves the shipping zone tier between 1 and 6.
 */
export function resolveZoneTier(
    sellerCitymunCode: string, sellerProvCode: string, sellerRegCode: string,
    buyerCitymunCode: string, buyerProvCode: string, buyerRegCode: string,
    overrideTier?: number | null
): number {
    if (overrideTier != null) return overrideTier;

    if (sellerCitymunCode === buyerCitymunCode) return 1;

    if (sellerProvCode === buyerProvCode) {
        if (isAdjacentMunicipality(sellerCitymunCode, buyerCitymunCode)) return 2;
        return 3;
    }

    if (sellerRegCode === buyerRegCode) return 4;

    if (isSameIslandGroup(sellerRegCode, buyerRegCode)) return 4;

    return 5;
}

/**
 * Computes self-delivery fuel cost and checks if it exceeds max radius.
 * Distance is proxied by Tier: Tier 1 -> 5km, Tier 2 -> 20km.
 */
export function computeSelfDeliveryFee(
    distanceKm: number,
    vehicleType: VehicleType,
    config: ShippingConfig
): { fee: number; fuelCost: number; exceedsRadius: boolean; breakdown: string[] } {
    if (distanceKm > config.selfDeliveryMaxKm) {
        return { fee: 0, fuelCost: 0, exceedsRadius: true, breakdown: [`Distance (${distanceKm}km) exceeds maximum radius (${config.selfDeliveryMaxKm}km).`] };
    }

    let efficiency = config.motorcycleFuelEfficiency;
    if (vehicleType === 'TRICYCLE') efficiency = config.tricycleFuelEfficiency;
    if (vehicleType === 'MULTICAB') efficiency = config.multicabFuelEfficiency;

    const roundTripKm = distanceKm * 2;
    const fuelCost = (roundTripKm / efficiency) * config.fuelPricePerLiter;
    
    let fee = fuelCost + config.laborAllowance;
    let breakdown = [
        `Distance proxy: ${distanceKm}km (Roundtrip: ${roundTripKm}km)`,
        `Vehicle: ${vehicleType} (Efficiency: ${efficiency} km/L)`,
        `Fuel cost estimate: ₱${fuelCost.toFixed(2)} (@ ₱${config.fuelPricePerLiter}/L)`,
        `Labor allowance: ₱${config.laborAllowance.toFixed(2)}`
    ];

    if (fee < config.floorFee) {
        breakdown.push(`Total fee (₱${fee.toFixed(2)}) was below floor fee. Adjusted to floor fee: ₱${config.floorFee.toFixed(2)}`);
        fee = config.floorFee;
    } else {
        breakdown.push(`Calculated fee: ₱${fee.toFixed(2)}`);
    }

    const roundedFee = roundToNearest5(fee);
    if (roundedFee !== fee) {
        breakdown.push(`Rounded to nearest ₱5: ₱${roundedFee.toFixed(2)}`);
    }

    return { fee: roundedFee, fuelCost: Number(fuelCost.toFixed(2)), exceedsRadius: false, breakdown };
}

/**
 * Main entry point for computing the final fee and resolved fulfillment type.
 */
export function computeShippingFee(
    buyerChoice: 'PICKUP' | 'DELIVERY',
    sellerProfile: SellerShippingProfile,
    zoneTier: number,
    distanceKm: number | null,
    config: ShippingConfig
): { fee: number; fuelCost: number; resolvedType: ShipmentType; breakdown: string[] } {
    if (buyerChoice === 'PICKUP') {
        return { fee: 0, fuelCost: 0, resolvedType: 'PICKUP', breakdown: ['Buyer chose pickup. Shipping fee waived.'] };
    }

    // Buyer chose DELIVERY
    // Can we self-deliver?
    if (sellerProfile.selfDeliveryEnabled && sellerProfile.vehicleType && sellerProfile.vehicleType !== 'NONE') {
        // Distance proxy: Tier 1 = 5km, Tier 2 = 20km. Tiers 3+ exceed radius.
        const effectiveDistance = distanceKm !== null ? distanceKm : (zoneTier === 1 ? 5 : (zoneTier === 2 ? 20 : 9999));
        
        const selfDelivery = computeSelfDeliveryFee(effectiveDistance, sellerProfile.vehicleType, config);
        
        if (!selfDelivery.exceedsRadius) {
            return { fee: selfDelivery.fee, fuelCost: selfDelivery.fuelCost, resolvedType: 'SELF_DELIVERY', breakdown: selfDelivery.breakdown };
        }
    }

    // Fallback to third-party flat rate
    const flatRate = THIRD_PARTY_FLAT_RATES[zoneTier] || 150; // Fallback to 150 if undefined
    return { fee: flatRate, fuelCost: 0, resolvedType: 'THIRD_PARTY', breakdown: [`Standard delivery flat rate: ₱${flatRate.toFixed(2)}`] };
}
