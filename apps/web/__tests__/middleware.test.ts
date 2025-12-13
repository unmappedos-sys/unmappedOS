/**
 * Middleware Auth Tests
 * 
 * Unit tests for authentication middleware behavior.
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '../middleware';

// Mock the Supabase server client
jest.mock('../lib/supabaseServer', () => ({
  createMiddlewareSupabaseClient: jest.fn((req) => {
    const mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
    };

    return {
      supabase: mockSupabase,
      response: NextResponse.next({
        request: {
          headers: req.headers,
        },
      }),
    };
  }),
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow access to public pages without auth', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/'));
    const res = await middleware(req);
    
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307); // Not a redirect
  });

  it('should allow access to login page without auth', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/login'));
    const res = await middleware(req);
    
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307);
  });

  it('should allow access to signup page without auth', async () => {
    const req = new NextRequest(new URL('http://localhost:3000/signup'));
    const res = await middleware(req);
    
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(307);
  });

  it('should allow access to public API routes without auth', async () => {
    const publicRoutes = [
      '/api/auth/callback',
      '/api/search',
      '/api/health',
      '/api/packs/bangkok',
    ];

    for (const route of publicRoutes) {
      const req = new NextRequest(new URL(`http://localhost:3000${route}`));
      const res = await middleware(req);
      
      // Should not return 401 unauthorized
      expect(res.status).not.toBe(401);
    }
  });

  it('should skip middleware for static files', async () => {
    const staticPaths = [
      '/_next/static/css/app.css',
      '/_next/image?url=%2Flogo.png',
      '/favicon.ico',
      '/logo.png',
    ];

    for (const path of staticPaths) {
      const req = new NextRequest(new URL(`http://localhost:3000${path}`));
      const res = await middleware(req);
      
      // Should pass through without modification
      expect(res.status).toBe(200);
    }
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing /operative without auth', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce((_req: any) => ({
        supabase: {
          auth: {
            getSession: jest.fn().mockResolvedValue({
              data: { session: null },
              error: null,
            }),
          },
        },
        response: NextResponse.next(),
      }));

      const req = new NextRequest(new URL('http://localhost:3000/operative'));
      const res = await middleware(req);
      
      expect(res.status).toBe(307); // Redirect
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('reason=AUTH_REQUIRED');
      expect(location).toContain('redirect=%2Foperative');
    });

    it('should return 401 for protected API without auth', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce((_req: any) => ({
        supabase: {
          auth: {
            getSession: jest.fn().mockResolvedValue({
              data: { session: null },
              error: null,
            }),
          },
        },
        response: NextResponse.next(),
      }));

      const req = new NextRequest(new URL('http://localhost:3000/api/protected/data'));
      const res = await middleware(req);
      
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('AUTH_REQUIRED');
    });

    it('should allow access to /operative with valid session', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce((_req: any) => ({
        supabase: {
          auth: {
            getSession: jest.fn().mockResolvedValue({
              data: {
                session: {
                  user: { id: 'user-123', email: 'operative@unmappedos.com' },
                  access_token: 'mock-token',
                },
              },
              error: null,
            }),
          },
        },
        response: NextResponse.next(),
      }));

      const req = new NextRequest(new URL('http://localhost:3000/operative'));
      const res = await middleware(req);
      
      // Should not redirect or return 401
      expect(res.status).not.toBe(307);
      expect(res.status).not.toBe(401);
    });

    it('should allow access to protected API with valid session', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce((_req: any) => ({
        supabase: {
          auth: {
            getSession: jest.fn().mockResolvedValue({
              data: {
                session: {
                  user: { id: 'user-123', email: 'operative@unmappedos.com' },
                  access_token: 'mock-token',
                },
              },
              error: null,
            }),
          },
        },
        response: NextResponse.next(),
      }));

      const req = new NextRequest(new URL('http://localhost:3000/api/protected/data'));
      const res = await middleware(req);
      
      // Should not return 401
      expect(res.status).not.toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should redirect to login on auth check error for pages', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce(() => {
        throw new Error('Auth check failed');
      });

      const req = new NextRequest(new URL('http://localhost:3000/operative'));
      const res = await middleware(req);
      
      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('reason=AUTH_ERROR');
    });

    it('should return 401 on auth check error for API', async () => {
      const { createMiddlewareSupabaseClient } = require('../lib/supabaseServer');
      createMiddlewareSupabaseClient.mockImplementationOnce(() => {
        throw new Error('Auth check failed');
      });

      const req = new NextRequest(new URL('http://localhost:3000/api/protected/data'));
      const res = await middleware(req);
      
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('AUTH_ERROR');
    });
  });
});
