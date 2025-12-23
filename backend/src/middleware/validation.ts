import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    issues: error.issues
                });
            }
            return res.status(500).json({ error: "Internal validation error" });
        }
    };
};
