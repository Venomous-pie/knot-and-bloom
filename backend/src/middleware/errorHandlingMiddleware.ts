import type { NextFunction, Request, Response } from "express";

export const errorHandlingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err.stack);
    res.status(500).json({ message: "Internal server error." });
};