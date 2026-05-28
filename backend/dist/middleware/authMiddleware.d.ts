import type { NextFunction, Request, Response } from 'express';
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const authorize: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireActiveSeller: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authMiddleware.d.ts.map