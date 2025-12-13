/**
 * Sign-Up Page
 * 
 * Mission-themed operative registration with email/password.
 * Validates inputs, creates Supabase user, and initiates email verification.
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { signUpSchema, type SignUpInput } from '@/lib/authValidation';
import TerminalLoader from '@/components/TerminalLoader';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState<SignUpInput>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SignUpInput, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof SignUpInput]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setAuthError(null);

    // Validate form data
    const validation = signUpSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof SignUpInput, string>> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignUpInput;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        { name: formData.name }
      );

      if (error) {
        setAuthError(error.message === 'User already registered' 
          ? 'OPERATIVE ALREADY REGISTERED' 
          : 'REGISTRATION FAILED // TRY AGAIN');
        setLoading(false);
        return;
      }

      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/login?message=VERIFY_EMAIL');
      }, 3000);
    } catch (err) {
      console.error('[SIGNUP] Unexpected error:', err);
      setAuthError('SYSTEM ERROR // CONTACT OPS');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>REGISTERING OPERATIVE - UNMAPPED OS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center p-4">
          <TerminalLoader 
            stages={[
              { message: 'ACQUIRING BLACK BOX...', duration: 500 },
              { message: 'DECRYPTING PAYLOAD...', duration: 600 },
              { message: 'REGISTERING OPERATIVE...', duration: 700 },
              { message: 'INITIALIZING SECURE SESSION...', duration: 500 },
            ]} 
          />
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>REGISTRATION COMPLETE - UNMAPPED OS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center p-4 relative">
          <div className="hud-overlay" />
          <div className="scan-line" />
          
          <div className="max-w-md w-full space-y-6 animate-fade-in">
            <div className="text-center space-y-4">
              <div className="glitch-text inline-block" data-text="SUCCESS">
                <h1 className="font-tactical text-4xl text-ops-neon-green tracking-widest">
                  SUCCESS
                </h1>
              </div>
              
              <div className="hud-card">
                <div className="space-y-4">
                  <p className="font-tactical text-tactical-base text-ops-neon-cyan">
                    OPERATIVE REGISTERED
                  </p>
                  <p className="font-mono text-tactical-sm text-ops-night-text">
                    Check your email for verification link
                  </p>
                  <p className="font-mono text-tactical-xs text-ops-night-muted terminal-flicker">
                    &gt; Redirecting to authentication...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>REGISTER OPERATIVE - UNMAPPED OS</title>
      </Head>

      <div className="hud-overlay" />
      <div className="scan-line" />

      <div className="diagnostic-panel top-4 right-4">
        <div className="space-y-1">
          <div className="status-indicator active">REGISTRATION SYSTEM</div>
          <div className="status-indicator active">SECURE CHANNEL</div>
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
              REGISTER NEW OPERATIVE
            </h2>
            
            <p className="font-mono text-tactical-xs text-ops-night-muted terminal-flicker">
              &gt; INITIALIZING REGISTRATION PROTOCOL...
            </p>
          </div>

          {/* Error Alert */}
          {authError && (
            <div className="hud-card border-ops-critical/50 animate-fade-in">
              <p className="font-tactical text-tactical-sm text-ops-critical text-center">
                ⚠ {authError}
              </p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="hud-card animate-fade-in">
            <div className="hud-card-header">OPERATIVE CREDENTIALS</div>
            
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Email Address <span className="text-ops-critical">*</span>
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

              {/* Name (Optional) */}
              <div>
                <label htmlFor="name" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Operative Name <span className="text-ops-ghost">(Optional)</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="input-tactical"
                  placeholder="Field Operative"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Password <span className="text-ops-critical">*</span>
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
                <p className="mt-1 font-mono text-tactical-xs text-ops-ghost">
                  Min 8 chars • Uppercase • Lowercase • Number
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block font-tactical text-tactical-xs uppercase mb-2 text-ops-night-muted">
                  Confirm Password <span className="text-ops-critical">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-tactical ${errors.confirmPassword ? 'border-ops-critical' : ''}`}
                  placeholder="••••••••"
                  required
                />
                {errors.confirmPassword && (
                  <p className="mt-1 font-mono text-tactical-xs text-ops-critical">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className="btn-tactical-primary w-full py-4"
              >
                REGISTER OPERATIVE
              </button>

              <p className="font-mono text-tactical-xs text-center text-ops-night-muted">
                SECURE REGISTRATION • EMAIL VERIFICATION REQUIRED
              </p>
            </div>
          </form>

          {/* Already have account */}
          <div className="text-center animate-fade-in space-y-2">
            <p className="font-mono text-tactical-xs text-ops-night-muted">
              Already registered?
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 font-tactical text-tactical-xs text-ops-neon-green hover:text-ops-neon-cyan transition-colors"
            >
              <span>→</span>
              <span>AUTHENTICATE EXISTING OPERATIVE</span>
            </Link>
          </div>

          {/* Back link */}
          <div className="text-center animate-fade-in">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 font-tactical text-tactical-xs text-ops-night-muted hover:text-ops-neon-green transition-colors"
            >
              <span>←</span>
              <span>RETURN TO LANDING</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
