import type { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Structured request logger middleware.
 * 
 * - Development: Only logs errors (4xx/5xx) and slow requests (>2s).
 *   Normal successful requests are silent to keep the console clean.
 * - Production: Logs ALL requests as structured JSON for ingestion by
 *   log aggregation tools (CloudWatch, Datadog, Grafana Loki, etc.).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Skip CORS preflight OPTIONS requests entirely
        if (req.method === 'OPTIONS') return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration_ms: duration,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent') || 'unknown',
            userId: (req as any).user?.id || null,
        };

        if (res.statusCode >= 500) {
            console.error(JSON.stringify(logEntry));
        } else if (duration > 2000) {
            console.warn(JSON.stringify({ ...logEntry, slow: true }));
        } else if (!isDev) {
            // In production, log all successful requests too
            console.log(JSON.stringify(logEntry));
        } else if (res.statusCode >= 400) {
            // In dev, only log client/server errors
            console.log(JSON.stringify(logEntry));
        }
        // In dev, 2xx/3xx are silent ✅
    });

    next();
}
