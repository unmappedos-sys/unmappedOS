/**
 * useAuth Hook
 * 
 * Client-side authentication state management.
 * Provides user data, loading state, and auth methods.
 * 
 * Usage:
 *   const { user, loading, signIn, signUp, signOut } = useAuth();
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabaseClient';
import type { User, AuthError } from '@supabase/supabase-js';

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: { name?: string }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setError(err as AuthError);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State change:', event);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Only redirect from auth pages to avoid double navigation
          // The API callback handles redirects from OAuth flows
          const isAuthPage = router.pathname.startsWith('/auth') || router.pathname === '/login';
          if (isAuthPage) {
            const redirectTo = (router.query.redirect as string) || '/operative';
            router.push(redirectTo);
          }
        }

        if (event === 'SIGNED_OUT') {
          // Clear user state
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error);
      console.error('[AUTH] Sign in failed:', error.message);
    }
    
    return { error };
  };

  /**
   * Send magic link to email
   */
  const signInWithMagicLink = async (email: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/auth/callback`,
      },
    });
    
    if (error) {
      setError(error);
      console.error('[AUTH] Magic link failed:', error.message);
    }
    
    return { error };
  };

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = async (provider: 'google' | 'github' | 'apple') => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/auth/callback`,
      },
    });
    
    if (error) {
      setError(error);
      console.error('[AUTH] OAuth failed:', error.message);
    }
    
    return { error };
  };

  /**
   * Sign up new user with email and password
   */
  const signUp = async (
    email: string,
    password: string,
    metadata?: { name?: string }
  ) => {
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/auth/callback`,
      },
    });
    
    if (error) {
      setError(error);
      console.error('[AUTH] Sign up failed:', error.message);
    }
    
    return { error };
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    setError(null);
    await supabase.auth.signOut();
    router.push('/login?reason=SIGNED_OUT');
  };

  /**
   * Manually refresh the session
   */
  const refreshSession = async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    setUser(session?.user ?? null);
  };

  return {
    user,
    loading,
    error,
    signInWithEmail,
    signInWithMagicLink,
    signInWithOAuth,
    signUp,
    signOut,
    refreshSession,
  };
}
