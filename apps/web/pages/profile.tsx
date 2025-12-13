/**
 * UNMAPPED OS — Profile Page
 * 
 * Authenticated operative profile management.
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?reason=AUTH_REQUIRED');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">AUTHENTICATING...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>PROFILE // UNMAPPED OS</title>
        <meta name="description" content="Operative Profile" />
      </Head>

      <div className="min-h-screen bg-black text-green-500 font-mono p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="border border-green-500/30 p-4 mb-6">
            <h1 className="text-2xl tracking-widest">OPERATIVE PROFILE</h1>
            <div className="text-green-500/50 text-xs mt-1">SECURE // AUTHENTICATED</div>
          </div>

          {/* Profile Data */}
          <div className="border border-green-500/30 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-green-500/50 text-xs">CALLSIGN</div>
              <div className="text-green-400">{user.user_metadata?.name || 'OPERATIVE'}</div>

              <div className="text-green-500/50 text-xs">COMMS ID</div>
              <div className="text-green-400 break-all">{user.email || '—'}</div>

              <div className="text-green-500/50 text-xs">STATUS</div>
              <div className="text-green-400">ACTIVE</div>

              <div className="text-green-500/50 text-xs">SESSION</div>
              <div className="text-green-400">VERIFIED</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => router.push('/operative-record')}
              className="flex-1 border border-green-500/30 py-3 hover:bg-green-500/10 transition-colors"
            >
              VIEW RECORD
            </button>
            <button
              onClick={() => router.push('/cities')}
              className="flex-1 border border-green-500/30 py-3 hover:bg-green-500/10 transition-colors"
            >
              OPERATIONS
            </button>
          </div>

          {/* Logout */}
          <div className="mt-6">
            <button
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
              className="w-full border border-red-500/30 text-red-500 py-3 hover:bg-red-500/10 transition-colors"
            >
              TERMINATE SESSION
            </button>
          </div>

          {/* Navigation */}
          <div className="mt-8 pt-4 border-t border-green-500/20">
            <button
              onClick={() => router.back()}
              className="text-green-500/50 hover:text-green-400 text-sm"
            >
              ← RETURN TO PREVIOUS
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
