import type { NextFunction, Request, Response } from 'express';
/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * to strip any HTML/script injection from user input.
 */
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=sanitize.d.ts.map