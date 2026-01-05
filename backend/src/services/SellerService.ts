import prisma from '../utils/prismaUtils.js';

export class SellerService {
    // Calculate metrics for a specific seller
    static async getSellerMetrics(sellerId: number) {
        // Fetch relevant items to calculate stats
        const items = await prisma.orderItem.findMany({
            where: {
                sellerId,
                // We only care about items that have reached a definitive state for these metrics
                // However, for ship time, we look for shippedAt
            }
        });

        let totalShipTimeMs = 0;
        let shippedCount = 0;
        let successfulItems = 0;
        let ratedItems = 0; // if we want to include cancellations in rate

        // Success Rate: (Delivered + Completed + Shipped?) / Total Finalized (Delivered + Cancelled)
        // Or simpler: non-cancelled / total. 
        // Let's define Success as "Not Cancelled by Seller" - but we don't track who cancelled easily on item level (Order has rejectionReason).
        // Let's us simplest approximation: (Total - Cancelled) / Total * 100

        // For Ship Time: Average of (shippedAt - createdAt)

        let cancelledCount = 0;
        const totalItems = items.length;

        for (const item of items) {
            if (item.shippedAt) {
                const shipTime = new Date(item.shippedAt).getTime() - new Date(item.createdAt).getTime();
                if (shipTime > 0) {
                    totalShipTimeMs += shipTime;
                    shippedCount++;
                }
            }

            if (item.status === 'cancelled') {
                cancelledCount++;
            }
        }

        const avgShipTimeHours = shippedCount > 0 ? totalShipTimeMs / shippedCount / (1000 * 60 * 60) : 24; // Default to 24h if no data

        // If no items, assume 100% success
        const successRate = totalItems > 0 ? ((totalItems - cancelledCount) / totalItems) * 100 : 100;

        return {
            avgShipTimeHours, // Float
            successRate,      // Float 0-100
            totalItems
        };
    }

    // Batch fetch for multiple sellers
    static async getMetricsForSellers(sellerIds: number[]) {
        const metricsMap: Record<number, { avgShipTimeHours: number; successRate: number }> = {};

        for (const id of sellerIds) {
            const metrics = await this.getSellerMetrics(id);
            metricsMap[id] = metrics;
        }

        return metricsMap;
    }
}
