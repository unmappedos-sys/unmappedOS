/**
 * Operative Dashboard
 *
 * Protected page accessible only to authenticated operatives.
 * Demonstrates auth protection and session handling.
 */

import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import TerminalLoader from '@/components/TerminalLoader';

export default function OperativeDashboard() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    // This page is protected by middleware, but we double-check client-side
    if (!loading && !user) {
      router.replace('/login?reason=AUTH_REQUIRED&redirect=/operative');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <>
        <Head>
          <title>LOADING OPERATIVE DASHBOARD - UNMAPPED OS</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center p-4">
          <TerminalLoader
            stages={[
              { message: 'CALIBRATING FIELD POSITION...', duration: 500 },
              { message: 'LOADING OPERATIVE DASHBOARD...', duration: 600 },
              { message: 'SYNCING MISSION DATA...', duration: 500 },
            ]}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>OPERATIVE DASHBOARD - UNMAPPED OS</title>
      </Head>

      <div className="hud-overlay" />
      <div className="scan-line" />

      <div className="diagnostic-panel top-4 right-4">
        <div className="space-y-1">
          <div className="status-indicator active">AUTHENTICATED</div>
          <div className="status-indicator active">SESSION ACTIVE</div>
        </div>
      </div>

      <main className="min-h-screen p-4 relative">
        <div className="max-w-4xl mx-auto space-y-8 py-12">
          {/* Header */}
          <div className="text-center space-y-4 animate-boot">
            <div className="glitch-text inline-block" data-text="UNMAPPED OS">
              <h1 className="font-tactical text-4xl text-ops-neon-green tracking-widest">
                UNMAPPED OS
              </h1>
            </div>

            <h2 className="font-tactical text-tactical-lg text-ops-neon-cyan uppercase tracking-widest">
              OPERATIVE DASHBOARD
            </h2>

            <p className="font-mono text-tactical-xs text-ops-night-muted">
              SECURE SESSION ESTABLISHED
            </p>
          </div>

          {/* User Info Card */}
          <div className="hud-card animate-fade-in">
            <div className="hud-card-header">OPERATIVE PROFILE</div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase mb-1">
                    Operative ID
                  </p>
                  <p className="font-mono text-tactical-sm text-ops-night-text">
                    {user.id.slice(0, 8)}...{user.id.slice(-8)}
                  </p>
                </div>

                <div>
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase mb-1">
                    Email Address
                  </p>
                  <p className="font-mono text-tactical-sm text-ops-night-text">{user.email}</p>
                </div>

                <div>
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase mb-1">
                    Status
                  </p>
                  <p className="font-tactical text-tactical-sm text-ops-neon-green">● ACTIVE</p>
                </div>

                <div>
                  <p className="font-tactical text-tactical-xs text-ops-night-muted uppercase mb-1">
                    Clearance Level
                  </p>
                  <p className="font-mono text-tactical-sm text-ops-neon-cyan">L1 // STANDARD</p>
                </div>
              </div>

              <div className="pt-4 border-t border-ops-night-border">
                <p className="font-mono text-tactical-xs text-ops-ghost">
                  Last authenticated: {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            <Link
              href="/cities"
              className="hud-card hover:border-ops-neon-green transition-all duration-200 group"
            >
              <div className="p-6 space-y-3">
                <h3 className="font-tactical text-tactical-base text-ops-neon-cyan group-hover:text-ops-neon-green transition-colors">
                  EXPLORE CITIES
                </h3>
                <p className="font-mono text-tactical-xs text-ops-night-muted">
                  Access mission zones and field data
                </p>
              </div>
            </Link>

            <Link
              href="/profile"
              className="hud-card hover:border-ops-neon-green transition-all duration-200 group"
            >
              <div className="p-6 space-y-3">
                <h3 className="font-tactical text-tactical-base text-ops-neon-cyan group-hover:text-ops-neon-green transition-colors">
                  VIEW PROFILE
                </h3>
                <p className="font-mono text-tactical-xs text-ops-night-muted">
                  Manage operative settings and karma
                </p>
              </div>
            </Link>

            <Link
              href="/missions"
              className="hud-card hover:border-ops-neon-green transition-all duration-200 group"
            >
              <div className="p-6 space-y-3">
                <h3 className="font-tactical text-tactical-base text-ops-neon-cyan group-hover:text-ops-neon-green transition-colors">
                  ACTIVE MISSIONS
                </h3>
                <p className="font-mono text-tactical-xs text-ops-night-muted">
                  View assigned objectives and progress
                </p>
              </div>
            </Link>

            <button
              onClick={signOut}
              className="hud-card hover:border-ops-critical transition-all duration-200 group text-left"
            >
              <div className="p-6 space-y-3">
                <h3 className="font-tactical text-tactical-base text-ops-night-muted group-hover:text-ops-critical transition-colors">
                  TERMINATE SESSION
                </h3>
                <p className="font-mono text-tactical-xs text-ops-ghost">
                  Sign out and clear credentials
                </p>
              </div>
            </button>
          </div>

          {/* System Info */}
          <div className="hud-card animate-fade-in">
            <div className="hud-card-header">SYSTEM STATUS</div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-tactical-xs text-ops-night-muted">
                  Auth Provider
                </span>
                <span className="font-mono text-tactical-xs text-ops-night-text">SUPABASE SSR</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-mono text-tactical-xs text-ops-night-muted">
                  Session Type
                </span>
                <span className="font-mono text-tactical-xs text-ops-night-text">
                  SECURE COOKIE
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-mono text-tactical-xs text-ops-night-muted">
                  Protection Status
                </span>
                <span className="font-tactical text-tactical-xs text-ops-neon-green">
                  ● MIDDLEWARE ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Back to home */}
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

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}
