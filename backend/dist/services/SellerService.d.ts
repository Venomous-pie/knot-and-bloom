export declare class SellerService {
    static getSellerMetrics(sellerId: number): Promise<{
        avgShipTimeHours: number;
        successRate: number;
        totalItems: number;
    }>;
    static getMetricsForSellers(sellerIds: number[]): Promise<Record<number, {
        avgShipTimeHours: number;
        successRate: number;
    }>>;
}
//# sourceMappingURL=SellerService.d.ts.map