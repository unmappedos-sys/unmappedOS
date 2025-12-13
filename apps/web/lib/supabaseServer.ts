/**
 * Supabase Server Client
 * 
 * Used for server-side operations (API routes, getServerSideProps, middleware).
 * Handles session cookies for SSR authentication.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextApiRequest, type NextApiResponse } from 'next';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from './database.types';

/**
 * Create Supabase client for API routes (Pages Router)
 * Handles cookie management for auth sessions
 */
export function createServerSupabaseClient(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Track all cookies to set (Supabase sets multiple cookies)
  const cookiesToSet: string[] = [];

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          // Append to array instead of overwriting
          cookiesToSet.push(serializeCookie(name, value, options));
          // Set all cookies as array (Next.js handles multiple Set-Cookie headers)
          res.setHeader('Set-Cookie', cookiesToSet);
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push(serializeCookie(name, '', { ...options, maxAge: 0 }));
          res.setHeader('Set-Cookie', cookiesToSet);
        },
      },
    }
  );
}

/**
 * Create Supabase client for middleware (Edge Runtime)
 */
export function createMiddlewareSupabaseClient(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  return { supabase, response };
}

/**
 * Helper to serialize cookies (for API routes)
 */
function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  // Default path to / for auth cookies
  parts.push(`Path=${options.path || '/'}`);
  
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  // Default to secure in production
  if (options.secure || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  if (options.httpOnly) {
    parts.push('HttpOnly');
  }
  // Default SameSite to Lax for OAuth compatibility
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);

  return parts.join('; ');
}

/**
 * Get Supabase client with SERVICE ROLE key (legacy support)
 * WARNING: This bypasses Row Level Security. Use only for server-side admin operations.
 * NEVER expose this to client-side code
 */
export function createServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Get authenticated user or throw 401 error (for legacy API routes)
 */
export async function getUserOr401(req: NextApiRequest): Promise<{ id: string; email: string }> {
  // Create a mock response for Supabase client (we won't use cookie setting)
  const mockRes = {
    setHeader: () => {},
  } as any;
  
  const supabase = createServerSupabaseClient(req, mockRes);
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.user) {
    const err = new Error('AUTH_REQUIRED');
    (err as any).status = 401;
    throw err;
  }
  
  return {
    id: session.user.id,
    email: session.user.email || '',
  };
}
