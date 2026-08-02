import prisma from '../utils/prismaUtils.js';
import { invalidateConfigCache } from '../utils/platformConfigUtils.js';

export const fuelService = {
    /**
     * Simulates fetching live fuel prices from a third-party source
     * (e.g. Department of Energy PH or a fuel API).
     */
    fetchLiveFuelPrice: async (): Promise<number> => {
        // MOCK: Generate a fluctuating fuel price around ₱60.00 - ₱65.00
        const basePrice = 60.00;
        const fluctuation = Math.random() * 5.00;
        const price = Number((basePrice + fluctuation).toFixed(2));
        
        console.log(`[FuelService] Fetched live fuel price: ₱${price}`);
        return price;
    },

    /**
     * Updates the platform configuration with the newly fetched fuel price
     */
    updateFuelPriceConfig: async () => {
        try {
            const price = await fuelService.fetchLiveFuelPrice();

            await prisma.platformConfig.upsert({
                where: { key: 'fuelPricePerLiter' },
                update: { value: String(price) },
                create: { key: 'fuelPricePerLiter', value: String(price) },
            });

            // Invalidate the cache so new checkouts use the updated price
            invalidateConfigCache();
            console.log(`[FuelService] Successfully updated fuelPricePerLiter to ${price}`);
        } catch (error) {
            console.error('[FuelService] Failed to update fuel price config:', error);
        }
    }
};
