import {
    resolveZoneTier,
    computeSelfDeliveryFee,
    computeShippingFee,
    roundToNearest5,
} from '../shippingUtils.js';
import type { ShippingConfig } from '../shippingUtils.js';

describe('Shipping Utils', () => {
    const defaultConfig: ShippingConfig = {
        fuelPricePerLiter: 80,
        motorcycleFuelEfficiency: 40,
        tricycleFuelEfficiency: 25,
        multicabFuelEfficiency: 15,
        laborAllowance: 25,
        floorFee: 30,
        selfDeliveryMaxKm: 25,
    };

    describe('roundToNearest5', () => {
        it('rounds correctly', () => {
            expect(roundToNearest5(42)).toBe(40);
            expect(roundToNearest5(43)).toBe(45);
            expect(roundToNearest5(47)).toBe(45);
            expect(roundToNearest5(48)).toBe(50);
        });
    });

    describe('resolveZoneTier', () => {
        it('uses override if provided', () => {
            expect(resolveZoneTier('A', 'B', 'C', 'X', 'Y', 'Z', 6)).toBe(6);
        });

        it('returns Tier 1 for same citymunCode', () => {
            expect(resolveZoneTier('166805', '1668', '16', '166805', '1668', '16')).toBe(1);
        });

        it('returns Tier 2 for adjacent municipalities in same province', () => {
            // Cantilan (166805) + Madrid (166813)
            expect(resolveZoneTier('166805', '1668', '16', '166813', '1668', '16')).toBe(2);
        });

        it('returns Tier 3 for non-adjacent in same province', () => {
            // Cantilan (166805) + Tandag (166819)
            expect(resolveZoneTier('166805', '1668', '16', '166819', '1668', '16')).toBe(3);
        });

        it('returns Tier 4 for same region, different province', () => {
            // Cantilan (1668) + Surigao City (1667)
            expect(resolveZoneTier('166805', '1668', '16', '166701', '1667', '16')).toBe(4);
        });

        it('returns Tier 4 for same island group, different region', () => {
            // Region 16 (Mindanao) + Region 11 (Mindanao)
            expect(resolveZoneTier('166805', '1668', '16', '110001', '1100', '11')).toBe(4);
        });

        it('returns Tier 5 for different island group', () => {
            // Region 16 (Mindanao) + Region 07 (Visayas)
            expect(resolveZoneTier('166805', '1668', '16', '070001', '0700', '07')).toBe(5);
        });
    });

    describe('computeSelfDeliveryFee', () => {
        it('computes correctly for Tier 1 (5km) motorcycle', () => {
            const { fee, fuelCost, exceedsRadius } = computeSelfDeliveryFee(5, 'MOTORCYCLE', defaultConfig);
            // Fuel: 10 / 40 * 80 = 20
            // Fee: 20 + 25 = 45
            expect(fuelCost).toBe(20);
            expect(fee).toBe(45);
            expect(exceedsRadius).toBe(false);
        });

        it('computes correctly for Tier 2 (20km) motorcycle', () => {
            const { fee, fuelCost, exceedsRadius } = computeSelfDeliveryFee(20, 'MOTORCYCLE', defaultConfig);
            // Fuel: 40 / 40 * 80 = 80
            // Fee: 80 + 25 = 105
            expect(fuelCost).toBe(80);
            expect(fee).toBe(105);
            expect(exceedsRadius).toBe(false);
        });

        it('enforces floor fee', () => {
            const { fee } = computeSelfDeliveryFee(0, 'MOTORCYCLE', defaultConfig);
            expect(fee).toBe(defaultConfig.floorFee);
        });

        it('handles exceeds radius', () => {
            const { exceedsRadius } = computeSelfDeliveryFee(30, 'MOTORCYCLE', defaultConfig);
            expect(exceedsRadius).toBe(true);
        });
    });

    describe('computeShippingFee', () => {
        const sellerWithMoto = { selfDeliveryEnabled: true, vehicleType: 'MOTORCYCLE' as const };
        const sellerNoVehicle = { selfDeliveryEnabled: false, vehicleType: 'NONE' as const };

        it('returns 0 for PICKUP', () => {
            const result = computeShippingFee('PICKUP', sellerWithMoto, 1, 5, defaultConfig);
            expect(result.fee).toBe(0);
            expect(result.resolvedType).toBe('PICKUP');
        });

        it('resolves to SELF_DELIVERY if within radius and enabled', () => {
            const result = computeShippingFee('DELIVERY', sellerWithMoto, 2, 20, defaultConfig);
            expect(result.fee).toBe(105);
            expect(result.resolvedType).toBe('SELF_DELIVERY');
        });

        it('resolves to THIRD_PARTY if exceeding radius', () => {
            const result = computeShippingFee('DELIVERY', sellerWithMoto, 3, 50, defaultConfig);
            expect(result.resolvedType).toBe('THIRD_PARTY');
            expect(result.fee).toBe(150); // From config lookup
        });

        it('resolves to THIRD_PARTY fallback for Tier 1 seller with no vehicle', () => {
            const result = computeShippingFee('DELIVERY', sellerNoVehicle, 1, 5, defaultConfig);
            expect(result.resolvedType).toBe('THIRD_PARTY');
            expect(result.fee).toBe(50); // Fallback for Tier 1
        });
    });
});
