/**
 * Login Page
 * 
 * Mission-themed authentication with:
 * - Email/password
 * - Magic link
 * - OAuth providers (Google, GitHub, Apple)
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { AuthButtons } from '@/components/AuthButtons';
import { signInSchema, type SignInInput } from '@/lib/authValidation';
import TerminalLoader from '@/components/TerminalLoader';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const { reason, message, redirect } = router.query;
  
  const [formData, setFormData] = useState<SignInInput>({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignInInput, string>>>({});
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof SignInInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError(null);

    // Validate
    const validation = signInSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignInInput, string>> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignInInput;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signInWithEmail(formData.email, formData.password);

      if (error) {
        if (error.message.includes('Invalid') || error.message.includes('credentials')) {
          setAuthError('CREDENTIALS REJECTED // VERIFY AND RETRY');
        } else if (error.message.includes('Email not confirmed')) {
          setAuthError('EMAIL NOT VERIFIED // CHECK INBOX');
        } else {
          setAuthError('AUTHENTICATION FAILED // TRY AGAIN');
        }
        setLoading(false);
        return;
      }

      // Success - useAuth hook handles redirect
    } catch (err) {
      console.error('[SIGNIN] Unexpected error:', err);
      setAuthError('SYSTEM ERROR // CONTACT OPS');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>AUTHENTICATING - UNMAPPED OS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center p-4">
          <TerminalLoader 
            stages={[
              { message: 'VERIFYING CREDENTIALS...', duration: 500 },
              { message: 'DECRYPTING SESSION TOKEN...', duration: 600 },
              { message: 'ESTABLISHING SECURE LINK...', duration: 500 },
              { message: 'CALIBRATING FIELD POSITION...', duration: 400 },
            ]} 
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>AUTHENTICATE OPERATIVE - UNMAPPED OS</title>
      </Head>

      <div className="hud-overlay" />
      <div className="scan-line" />

      <div className="diagnostic-panel top-4 right-4">
        <div className="space-y-1">
          <div className="status-indicator active">AUTH MODULE</div>
          <div className="status-indicator active">SECURE LINK</div>
        </div>
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="max-w-md w-full space-y-8 animate-boot">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <Link href="/" className="inline-block">
              <div className="glitch-text" data-text="UNMAPPED OS">
                <h1 className="font-tactical text-4xl text-ops-neon-green tracking-widest hover:text-ops-neon-cyan transition-colors">
                  UNMAPPED OS
                </h1>
              </div>
            </Link>
            
            <h2 className="font-tactical text-tactical-lg text-ops-neon-cyan uppercase tracking-widest">
              AUTHENTICATE OPERATIVE
            </h2>
            
            <p className="font-mono text-tactical-xs text-ops-night-muted terminal-flicker">
              &gt; VERIFYING CREDENTIALS...
            </p>
          </div>

          {/* Status Messages */}
          {reason === 'AUTH_REQUIRED' && (
            <div className="hud-card border-ops-warning/50 animate-fade-in">
              <p className="font-tactical text-tactical-sm text-ops-warning text-center">
                ⚠ AUTHENTICATION REQUIRED
              </p>
              <p className="font-mono text-tactical-xs text-ops-night-muted text-center mt-2">
                Access to {redirect || 'protected zone'} requires credentials
              </p>
            </div>
          )}

          {reason === 'SIGNED_OUT' && (
            <div className="hud-card border-ops-neon-green/50 animate-fade-in">
              <p className="font-tactical text-tactical-sm text-ops-neon-green text-center">
                SESSION TERMINATED // OPERATIVE SIGNED OUT
              </p>
            </div>
          )}

          {message === 'VERIFY_EMAIL' && (
            <div className="hud-card border-ops-neon-cyan/50 animate-fade-in">
              <p className="font-tactical text-tactical-sm text-ops-neon-cyan text-center">
                ✓ REGISTRATION COMPLETE
              </p>
              <p className="font-mono text-tactical-xs text-ops-night-text text-center mt-2">
                Check email to verify account, then sign in
              </p>
            </div>
          )}

          {/* Auth Error */}
          {authError && (
            <div className="hud-card border-ops-critical/50 animate-fade-in">
              <p className="font-tactical text-tactical-sm text-ops-critical text-center">
                ⚠ {authError}
              </p>
            </div>
          )}

          {/* OAuth & Magic Link Buttons */}
          <div className="animate-slide-in">
            <AuthButtons 
              onError={(error) => setAuthError(error)}
            />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ops-night-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-ops-night-bg px-4 font-tactical text-tactical-xs text-ops-night-muted">
                EMAIL AUTHENTICATION
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="hud-card animate-fade-in">
            <div className="hud-card-header">CREDENTIALS</div>
            
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-tactical ${errors.email ? 'border-ops-critical' : ''}`}
                  placeholder="operative@unmappedos.com"
                  required
                />
                {errors.email && (
                  <p className="mt-1 font-mono text-tactical-xs text-ops-critical">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-tactical ${errors.password ? 'border-ops-critical' : ''}`}
                  placeholder="••••••••"
                  required
                />
                {errors.password && (
                  <p className="mt-1 font-mono text-tactical-xs text-ops-critical">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button 
                type="submit" 
                disabled={loading}
                className="btn-tactical-primary w-full py-4"
              >
                INITIATE AUTHENTICATION
              </button>

              <p className="font-mono text-tactical-xs text-center text-ops-night-muted">
                SECURE SESSION • END-TO-END ENCRYPTION
              </p>
            </div>
          </form>

          {/* New operative signup */}
          <div className="text-center animate-fade-in space-y-2">
            <p className="font-mono text-tactical-xs text-ops-night-muted">
              New operative?
            </p>
            <Link 
              href="/signup" 
              className="inline-flex items-center gap-2 font-tactical text-tactical-xs text-ops-neon-green hover:text-ops-neon-cyan transition-colors"
            >
              <span>→</span>
              <span>REGISTER NEW ACCOUNT</span>
            </Link>
          </div>

          {/* Return to landing */}
          <div className="text-center animate-fade-in">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 font-tactical text-tactical-xs text-ops-night-muted hover:text-ops-neon-green transition-colors"
            >
              <span>←</span>
              <span>RETURN TO LANDING</span>
            </Link>
          </div>

          {/* Debug */}
          {process.env.NODE_ENV === 'development' && (
            <div className="font-mono text-tactical-xs text-ops-ghost text-center space-y-1">
              <p>DEBUG: Auth mode = supabase-ssr</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
