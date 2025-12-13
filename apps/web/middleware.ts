/**
 * Next.js Middleware for Authentication and Authorization
 * 
 * Protects routes that require authentication using Supabase SSR:
 * - /operative* pages -> redirect to /login if not authenticated
 * - /api/protected/* routes -> return 401 if not authenticated
 * 
 * Public API routes (excluded from auth):
 * - /api/auth/*
 * - /api/search
 * - /api/health
 * - /api/packs (public city packs)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabaseServer';

const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/search',
  '/api/health',
  '/api/packs',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Skip middleware for static files and _next
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/public') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedPage = pathname.startsWith('/operative');
  const isProtectedAPI = pathname.startsWith('/api/protected') || 
    (pathname.startsWith('/api') && 
     !PUBLIC_API_ROUTES.some(route => pathname.startsWith(route)));

  // Only check auth for protected routes
  if (!isProtectedPage && !isProtectedAPI) {
    return NextResponse.next();
  }

  try {
    // Create Supabase client with cookie handling
    const { supabase, response } = createMiddlewareSupabaseClient(req);

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Handle unauthenticated requests
    if (!session) {
      if (isProtectedAPI) {
        // Return 401 for API routes
        return NextResponse.json(
          { error: 'AUTH_REQUIRED', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Redirect to login for pages
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('reason', 'AUTH_REQUIRED');
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // User is authenticated, continue with the updated response (includes cookies)
    return response;
  } catch (error) {
    console.error('[MIDDLEWARE] Auth check failed:', error);

    // Fail-safe: redirect to login on error
    if (isProtectedPage) {
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('reason', 'AUTH_ERROR');
      return NextResponse.redirect(redirectUrl);
    }

    // Return 401 for API routes on error
    return NextResponse.json(
      { error: 'AUTH_ERROR', message: 'Authentication verification failed' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|public).*)',
  ],
};
