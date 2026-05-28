import type { Request, Response, NextFunction } from 'express';
/**
 * Structured request logger middleware.
 *
 * - Development: Only logs errors (4xx/5xx) and slow requests (>2s).
 *   Normal successful requests are silent to keep the console clean.
 * - Production: Logs ALL requests as structured JSON for ingestion by
 *   log aggregation tools (CloudWatch, Datadog, Grafana Loki, etc.).
 */
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestLogger.d.ts.map