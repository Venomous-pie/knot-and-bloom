import type { NextFunction, Request, Response } from "express";
export declare const errorHandlingMiddleware: (err: Error, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=errorHandlingMiddleware.d.ts.map