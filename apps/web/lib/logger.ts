/**
 * Structured Logging with Pino
 * 
 * Provides a production-ready logger with:
 * - Structured JSON output
 * - PII redaction (emails, phones, locations, tokens)
 * - Request correlation IDs
 * - Environment-aware configuration
 */

import pino from 'pino';

// Fields to redact from logs (PII and sensitive data)
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'user.email',
  'user.phone',
  'user.phone_number',
  'body.email',
  'body.phone',
  'body.location',
  'body.coordinates',
  'req.body.location',
  'req.body.coordinates',
  'req.body.email',
  'req.body.phone',
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
];

/**
 * Create base logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  
  // Base fields added to every log
  base: {
    app: 'unmappedos',
    env: process.env.NODE_ENV || 'development',
  },

  // Redact sensitive fields
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },

  // Pretty print in development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,

  // Production format
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // ISO timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Logger for API routes with request context
 */
export function createRequestLogger(req: any, correlationId?: string) {
  const id = correlationId || generateCorrelationId();
  
  return logger.child({
    request_id: id,
    method: req.method,
    path: req.url,
    user_agent: req.headers['user-agent'],
    ip: getClientIp(req),
  });
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get client IP from request (handles proxies)
 */
function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    'unknown'
  );
}

/**
 * Log levels enum for type safety
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Type-safe logging interface
 */
export interface Logger {
  trace: (msg: string, data?: any) => void;
  debug: (msg: string, data?: any) => void;
  info: (msg: string, data?: any) => void;
  warn: (msg: string, data?: any) => void;
  error: (msg: string, data?: any) => void;
  fatal: (msg: string, data?: any) => void;
}

export default logger;
