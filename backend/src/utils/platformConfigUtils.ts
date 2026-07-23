import prisma from './prismaUtils.js';
import { SHIPPING_DEFAULTS } from '../constant/shippingConfig.js';

let configCache: Record<string, string> | null = null;

export async function getShippingConfig() {
    if (configCache) {
        return parseConfig(configCache);
    }

    try {
        const configs = await prisma.platformConfig.findMany();
        if (configs.length === 0) {
            return parseConfig(SHIPPING_DEFAULTS);
        }

        const cache: Record<string, string> = {};
        for (const c of configs) {
            cache[c.key] = c.value;
        }
        configCache = cache;
        return parseConfig(cache);
    } catch (e) {
        console.warn('Failed to fetch platform config, using defaults', e);
        return parseConfig(SHIPPING_DEFAULTS);
    }
}

export function invalidateConfigCache() {
    configCache = null;
}

function parseConfig(raw: Record<string, any>) {
    return {
        fuelPricePerLiter: Number(raw.fuelPricePerLiter) || SHIPPING_DEFAULTS.fuelPricePerLiter,
        motorcycleFuelEfficiency: Number(raw.motorcycleFuelEfficiency) || SHIPPING_DEFAULTS.motorcycleFuelEfficiency,
        tricycleFuelEfficiency: Number(raw.tricycleFuelEfficiency) || SHIPPING_DEFAULTS.tricycleFuelEfficiency,
        multicabFuelEfficiency: Number(raw.multicabFuelEfficiency) || SHIPPING_DEFAULTS.multicabFuelEfficiency,
        laborAllowance: Number(raw.laborAllowance) || SHIPPING_DEFAULTS.laborAllowance,
        floorFee: Number(raw.floorFee) || SHIPPING_DEFAULTS.floorFee,
        selfDeliveryMaxKm: Number(raw.selfDeliveryMaxKm) || SHIPPING_DEFAULTS.selfDeliveryMaxKm,
    };
}
