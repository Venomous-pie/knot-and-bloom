import type { NextFunction, Request, Response } from 'express';
import xss from 'xss';

/**
 * Recursively sanitize all string values in an object to prevent XSS attacks.
 * Strips HTML/script tags from user-provided input before it reaches controllers.
 */
const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
        return xss(value);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        return sanitizeObject(value as Record<string, unknown>);
    }
    return value;
};

const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
};

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 * to strip any HTML/script injection from user input.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        for (const key of Object.keys(req.query)) {
            req.query[key] = sanitizeValue(req.query[key]) as any;
        }
    }
    if (req.params && typeof req.params === 'object') {
        for (const key of Object.keys(req.params)) {
            req.params[key] = sanitizeValue(req.params[key]) as any;
        }
    }
    next();
};
