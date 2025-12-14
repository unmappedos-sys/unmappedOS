import { useAuth } from '@/hooks/useAuth';
import Head from 'next/head';

export default function AuthTest() {
  const { user, loading, signInWithOAuth, signOut } = useAuth();

  return (
    <>
      <Head>
        <title>Auth Test - Unmapped OS</title>
      </Head>

      <main className="min-h-screen p-8 space-y-8 max-w-4xl mx-auto">
        <h1 className="mission-heading text-3xl">AUTHENTICATION TEST</h1>

        {/* Status */}
        <div className="ops-card p-6 space-y-4">
          <h2 className="font-mono text-xl">Current Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <p><strong>Status:</strong> {loading ? 'loading' : user ? 'authenticated' : 'unauthenticated'}</p>
            <p><strong>Session:</strong> {user ? '✅ Active' : '❌ Not authenticated'}</p>
            {user && (
              <>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.user_metadata?.name || 'Not set'}</p>
                <p><strong>ID:</strong> {user.id || 'Not set'}</p>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ops-card p-6 space-y-4">
          <h2 className="font-mono text-xl">Actions</h2>
          <div className="space-y-2">
            {!user && (
              <>
                <a href="/login" className="ops-button w-full block text-center">
                  Test Email Authentication
                </a>
                <button
                  onClick={() => signInWithOAuth('github')}
                  className="ops-button w-full"
                >
                  Test GitHub Authentication
                </button>
                <button
                  onClick={() => signInWithOAuth('google')}
                  className="ops-button w-full"
                >
                  Test Google Authentication
                </button>
              </>
            )}
            {user && (
              <button
                onClick={signOut}
                className="ops-button w-full"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Session Data */}
        {user && (
          <div className="ops-card p-6 space-y-4">
            <h2 className="font-mono text-xl">User Data (JSON)</h2>
            <pre className="bg-black text-green-500 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}

        {/* Environment Check */}
        <div className="ops-card p-6 space-y-4">
          <h2 className="font-mono text-xl">Environment Variables</h2>
          <div className="space-y-2 font-mono text-xs">
            <p>✅ NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : '❌ Missing'}</p>
            <p>✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : '❌ Missing'}</p>
            <p className="text-gray-500 text-xs mt-2">
              Note: OAuth credentials are configured in Supabase dashboard.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="ops-card p-6 space-y-4">
          <h2 className="font-mono text-xl">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Click one of the authentication buttons above</li>
            <li>Complete the sign-in flow</li>
            <li>You should be redirected back here with session active</li>
            <li>User data will appear in JSON format</li>
            <li>Check browser console (F12) for any errors</li>
          </ol>
        </div>

        {/* Back link */}
        <div className="text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </a>
        </div>
      </main>
    </>
  );
}
