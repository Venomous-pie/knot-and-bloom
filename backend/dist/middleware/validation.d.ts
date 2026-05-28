import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
export declare const validateRequest: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=validation.d.ts.map