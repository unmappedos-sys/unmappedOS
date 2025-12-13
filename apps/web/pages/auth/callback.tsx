/**
 * Auth Callback Page
 *
 * Handles magic link and OAuth callbacks from Supabase Auth.
 * Supports PKCE flow for magic links.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabaseClient';

// Disable static optimization for this page since it handles dynamic OAuth callbacks
export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Check for error from query params
        const { error: urlError, error_description, code } = router.query;
        if (urlError) {
          setStatus('error');
          setErrorMsg(
            (error_description as string) || (urlError as string) || 'Authentication failed'
          );
          return;
        }

        // Handle PKCE flow (OAuth and Magic Link)
        // Both OAuth and magic links now use the code exchange flow
        if (code && typeof code === 'string') {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[AUTH CALLBACK] Exchange error:', exchangeError);
            setStatus('error');
            setErrorMsg(exchangeError.message);
            return;
          }

          if (data.session) {
            setStatus('success');
            setTimeout(() => {
              const redirectTo = (router.query.redirect as string) || '/operative';
              router.push(redirectTo);
            }, 1500);
            return;
          }
        }

        // Handle legacy implicit flow (hash-based tokens)
        // This is for older auth flows or direct token access
        if (typeof window !== 'undefined') {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && type) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              console.error('[AUTH CALLBACK] Session error:', sessionError);
              setStatus('error');
              setErrorMsg(sessionError.message);
              return;
            }

            setStatus('success');
            setTimeout(() => {
              router.push('/operative');
            }, 1500);
            return;
          }
        }

        // If we get here, no valid auth data was found
        if (!code) {
          setStatus('error');
          setErrorMsg('No authentication code received');
        }
      } catch (err) {
        console.error('[AUTH CALLBACK] Unexpected error:', err);
        setStatus('error');
        setErrorMsg('An unexpected error occurred');
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        {status === 'processing' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
            <h1 className="text-xl font-mono text-cyan-400 mb-2">AUTHENTICATING IDENTITY...</h1>
            <p className="text-gray-500 font-mono text-sm">Verifying security clearance</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-mono text-green-400 mb-2">IDENTITY VERIFIED</h1>
            <p className="text-gray-500 font-mono text-sm">Redirecting to command center...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-mono text-red-400 mb-2">AUTHENTICATION FAILED</h1>
            <p className="text-gray-400 font-mono text-sm mb-4">
              {errorMsg || 'Security clearance denied'}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-mono text-sm hover:bg-cyan-500/30 transition-colors"
            >
              RETRY AUTHENTICATION
            </button>
          </>
        )}

        {/* Decorative elements */}
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          <div
            className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}

// Force server-side rendering for OAuth callback handling
export async function getServerSideProps() {
  return {
    props: {},
  };
}
