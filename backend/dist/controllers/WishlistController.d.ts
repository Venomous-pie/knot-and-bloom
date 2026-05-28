import type { Request, Response } from 'express';
export declare const WishlistController: {
    getWishlist: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    toggleWishlistItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=WishlistController.d.ts.map