import type { NextFunction, Request, Response } from "express";

export const errorHandlingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err.stack);

    const isDev = process.env.NODE_ENV === 'development';

    res.status(500).json({
        message: "Internal server error.",
        // Only expose error details in development
        ...(isDev && { detail: err.message }),
    });
};