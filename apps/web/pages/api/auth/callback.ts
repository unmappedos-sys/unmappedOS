/**
 * Auth Callback API Route
 * 
 * Handles OAuth and magic link callbacks from Supabase Auth.
 * Uses server-side client to properly handle PKCE code exchange
 * (reads code_verifier from cookies).
 */

import { type NextApiRequest, type NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, error, error_description, redirect } = req.query;

  // Handle auth errors from provider
  if (error) {
    console.error('[AUTH CALLBACK] Provider error:', error, error_description);
    return res.redirect(
      `/login?error=${encodeURIComponent(String(error))}&message=${encodeURIComponent(String(error_description || 'Authentication failed'))}`
    );
  }

  // Require code for PKCE exchange
  if (!code || typeof code !== 'string') {
    console.error('[AUTH CALLBACK] No code provided');
    return res.redirect('/login?error=no_code&message=No+authentication+code+received');
  }

  try {
    // Create server-side Supabase client - this can access cookies
    // which contain the PKCE code_verifier
    const supabase = createServerSupabaseClient(req, res);
    
    // Exchange the code for a session
    // The code_verifier is automatically read from cookies by @supabase/ssr
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[AUTH CALLBACK] Exchange failed:', exchangeError.message);
      return res.redirect(
        `/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      console.error('[AUTH CALLBACK] No session created');
      return res.redirect('/login?error=no_session&message=Session+creation+failed');
    }

    console.log('[AUTH CALLBACK] Session created for:', data.session.user.email);
  } catch (err) {
    console.error('[AUTH CALLBACK] Unexpected error:', err);
    return res.redirect('/login?error=unexpected&message=An+unexpected+error+occurred');
  }

  // Redirect to intended page or default dashboard
  const redirectTo = typeof redirect === 'string' ? redirect : '/operative';
  res.redirect(redirectTo);
}
