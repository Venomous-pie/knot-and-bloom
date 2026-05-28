import type { Request, Response } from 'express';
export declare const sellerController: {
    registerSeller(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    onboardSeller(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getSellerBySlug(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateSeller(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    listSellers(req: Request, res: Response): Promise<void>;
    listActiveSellers(req: Request, res: Response): Promise<void>;
    getSellerOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getOwnProducts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    markWelcomeSeen(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    cancelApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getDashboardStats(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getSidebarStats(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=SellerController.d.ts.map