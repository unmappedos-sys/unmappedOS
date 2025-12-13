/**
 * Logger Middleware for API Routes
 * 
 * Provides structured logging with:
 * - Correlation IDs for request tracing
 * - Request/response timing
 * - PII redaction
 * - Error capture
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createLogger, logger } from './logger';
import { randomUUID } from 'crypto';

export interface LoggedRequest extends NextApiRequest {
  correlationId: string;
  log: ReturnType<typeof createLogger>;
  startTime: number;
}

export type LoggedApiHandler = (
  req: LoggedRequest,
  res: NextApiResponse
) => Promise<void> | void;

/**
 * Wrap an API handler with logging middleware
 */
export function withLogging(handler: LoggedApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    
    // Generate or extract correlation ID
    const correlationId = 
      (req.headers['x-correlation-id'] as string) || 
      (req.headers['x-request-id'] as string) || 
      randomUUID();

    // Create request-scoped logger
    const requestLogger = createLogger({
      correlationId,
      method: req.method,
      path: req.url,
      userAgent: req.headers['user-agent']?.substring(0, 100),
    });

    // Attach to request
    const loggedReq = req as LoggedRequest;
    loggedReq.correlationId = correlationId;
    loggedReq.log = requestLogger;
    loggedReq.startTime = startTime;

    // Set correlation ID header for response
    res.setHeader('X-Correlation-ID', correlationId);

    // Log request start
    requestLogger.info({
      event: 'request_start',
      query: sanitizeQuery(req.query),
    });

    // Capture original end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, callback?: any) {
      const duration = Date.now() - startTime;
      
      requestLogger.info({
        event: 'request_complete',
        statusCode: res.statusCode,
        duration,
      });

      return originalEnd.call(this, chunk, encoding, callback);
    };

    try {
      await handler(loggedReq, res);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      requestLogger.error({
        event: 'request_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
      });

      // Don't expose internal errors
      if (!res.headersSent) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          correlationId,
        });
      }
    }
  };
}

/**
 * Sanitize query parameters for logging (remove sensitive data)
 */
function sanitizeQuery(query: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['token', 'key', 'password', 'secret', 'auth'];

  for (const [key, value] of Object.entries(query)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Log an audit event (immutable, for compliance)
 */
export async function logAudit(
  actorId: string,
  action: string,
  resource: Record<string, any>,
  req?: NextApiRequest
) {
  const auditLogger = createLogger({ audit: true });
  
  auditLogger.info({
    event: 'audit',
    actorId,
    action,
    resource: sanitizeResource(resource),
    ip: req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress,
    userAgent: req?.headers['user-agent']?.substring(0, 200),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Sanitize resource data for audit logs
 */
function sanitizeResource(resource: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['email', 'phone', 'location', 'coordinates', 'password', 'token'];

  for (const [key, value] of Object.entries(resource)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeResource(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Express-style middleware for custom Next.js server (optional)
 */
export function loggingMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || randomUUID();

    req.correlationId = correlationId;
    req.log = createLogger({ correlationId });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        correlationId,
      });
    });

    next();
  };
}
