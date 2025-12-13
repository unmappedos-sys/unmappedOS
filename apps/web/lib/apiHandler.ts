/**
 * API Handler Utilities
 * 
 * Provides a standardized way to create API routes with:
 * - Method routing
 * - Authentication
 * - Validation
 * - Error handling
 * - Logging
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from './supabaseServer';
import { withLogging, LoggedRequest } from './loggerMiddleware';
import { ValidationError } from './validation';
import { ZodSchema } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiContext {
  req: LoggedRequest;
  res: NextApiResponse;
  userId: string | null;
  supabase: ReturnType<typeof createServerSupabaseClient>;
}

export interface HandlerConfig {
  auth?: boolean;
  schema?: ZodSchema;
}

export type RouteHandler = (ctx: ApiContext, body?: any) => Promise<any> | any;

export interface RouteHandlers {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
}

/**
 * Create a typed API handler with built-in features
 */
export function createApiHandler(
  handlers: RouteHandlers,
  config: HandlerConfig = {}
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return withLogging(async (req: LoggedRequest, res: NextApiResponse): Promise<void> => {
    const method = req.method as HttpMethod;
    const handler = handlers[method];

    // Check if method is supported
    if (!handler) {
      const allowed = Object.keys(handlers).join(', ');
      res.setHeader('Allow', allowed);
      res.status(405).json({
        error: 'METHOD_NOT_ALLOWED',
        message: `Method ${method} not allowed. Allowed: ${allowed}`,
      });
      return;
    }

    // Create Supabase client
    const supabase = createServerSupabaseClient(req, res);

    // Get user session if auth is required
    let userId: string | null = null;
    
    if (config.auth !== false) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && config.auth === true) {
        res.status(401).json({
          error: 'AUTH_REQUIRED',
          message: 'Authentication required',
        });
        return;
      }
      
      userId = session?.user?.id || null;
    }

    // Validate request body if schema provided
    let validatedBody: any = undefined;
    
    if (config.schema && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const result = config.schema.safeParse(req.body);
        if (!result.success) {
          const errors = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }));
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            errors,
          });
          return;
        }
        validatedBody = result.data;
      } catch (error) {
        req.log.error({ error }, 'Validation error');
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        });
        return;
      }
    }

    // Create context
    const ctx: ApiContext = {
      req,
      res,
      userId,
      supabase,
    };

    try {
      // Execute handler
      const result = await handler(ctx, validatedBody);
      
      // If handler didn't send response, send the result
      if (!res.headersSent) {
        if (result === undefined) {
          res.status(204).end();
          return;
        }
        res.status(200).json(result);
        return;
      }
    } catch (error) {
      // Handle known error types
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.message,
          errors: error.errors,
        });
        return;
      }

      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.code,
          message: error.message,
        });
        return;
      }

      // Log and return generic error
      req.log.error({ error }, 'Unhandled API error');
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        correlationId: req.correlationId,
      });
      return;
    }
  });
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new ApiError(400, code, message);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'Rate limit exceeded') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

/**
 * Rate limiting helper (simple in-memory, use Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get client IP from request
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}
