import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../types/authTypes.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

export const requireActiveSeller = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    if (req.user.sellerStatus !== 'ACTIVE') {
        return res.status(403).json({
            error: 'Seller account not active',
            status: req.user.sellerStatus
        });
    }

    next();
};
