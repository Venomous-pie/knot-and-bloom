import type { Request, Response, NextFunction } from 'express';

/**
 * Structured request logger middleware.
 * Logs every incoming request with method, path, status code, and response time.
 * Output is JSON-formatted for easy ingestion by log aggregation tools
 * (e.g., CloudWatch, Datadog, Grafana Loki).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    // Capture when the response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
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

        // Use warn level for slow requests (>2s) and error level for 5xx
        if (res.statusCode >= 500) {
            console.error(JSON.stringify(logEntry));
        } else if (duration > 2000) {
            console.warn(JSON.stringify({ ...logEntry, slow: true }));
        } else if (process.env.NODE_ENV !== 'production' || res.statusCode >= 400) {
            // In production, only log errors/warnings. In dev, log everything.
            console.log(JSON.stringify(logEntry));
        }
    });

    next();
}
