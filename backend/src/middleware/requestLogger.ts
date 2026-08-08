import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Structured request logger middleware.
 *
 * - Generates a unique `X-Request-ID` for every request and echoes it in the response header.
 * - Development: Outputs clean, color-coded, column-aligned logs for readability.
 * - Production: Logs ALL requests as structured JSON for ingestion by log aggregation tools.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // Determine env inside the function in case dotenv is loaded after imports
    const isDev = process.env.NODE_ENV !== 'production';
    
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        // Skip CORS preflight OPTIONS requests entirely
        if (req.method === 'OPTIONS') return;

        const logEntry = {
            requestId,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration_ms: duration,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent') || 'unknown',
            userId: (req as any).user?.id || null,
        };

        if (!isDev) {
            // Production format (JSON)
            if (res.statusCode >= 500) console.error(JSON.stringify({ ...logEntry, error: true }));
            else if (duration > 2000) console.warn(JSON.stringify({ ...logEntry, slow: true }));
            else console.log(JSON.stringify(logEntry));
            return;
        }

        // Development format (Prettified Terminal Output)
        
        // 1. Colorize Method
        let methodColor = '\x1b[36m'; // Cyan (Default/Other)
        if (req.method === 'GET') methodColor = '\x1b[32m'; // Green
        else if (req.method === 'POST') methodColor = '\x1b[33m'; // Yellow
        else if (req.method === 'PUT' || req.method === 'PATCH') methodColor = '\x1b[34m'; // Blue
        else if (req.method === 'DELETE') methodColor = '\x1b[31m'; // Red

        // 2. Colorize Status Code
        let statusColor = '\x1b[32m'; // Green (200s)
        if (res.statusCode >= 500) statusColor = '\x1b[31m'; // Red (500s)
        else if (res.statusCode >= 400) statusColor = '\x1b[33m'; // Yellow (400s)
        else if (res.statusCode >= 300) statusColor = '\x1b[36m'; // Cyan (300s)

        // 3. Colorize Duration
        let durationColor = '\x1b[32m'; // Green (Fast)
        if (duration > 2000) durationColor = '\x1b[31m'; // Red (Very Slow)
        else if (duration > 500) durationColor = '\x1b[33m'; // Yellow (Moderate)

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Pad strings so the columns align beautifully in the terminal
        const methodStr = `${methodColor}${req.method.padEnd(6)}\x1b[0m`;
        const statusStr = `${statusColor}${res.statusCode}\x1b[0m`;
        const durationStr = `${durationColor}${duration.toString().padStart(4)}ms\x1b[0m`;
        const pathStr = `\x1b[37m${req.originalUrl}\x1b[0m`;
        
        const prefix = `\x1b[90m[${time}]\x1b[0m`;
        
        console.log(`${prefix} ${methodStr} ${statusStr} | ${durationStr} | ${pathStr}`);

        // Only print extra details (IP, Auth, ReqID) if the request was problematic to keep logs clean
        if (res.statusCode >= 400 || duration > 500) {
            const userStr = logEntry.userId ? `user:${logEntry.userId}` : 'anon';
            const shortReqId = logEntry.requestId.split('-')[0];
            const ipStr = logEntry.ip?.replace('::ffff:', '') || 'unknown';
            
            console.log(`         \x1b[90m└─ IP: ${ipStr} | Auth: ${userStr} | ReqID: ${shortReqId}\x1b[0m`);
        }
    });

    next();
}
