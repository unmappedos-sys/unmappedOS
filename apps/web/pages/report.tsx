/**
 * Report Hazard Page
 * Allows users to report hazards, issues, or offline zones
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '../lib/supabaseClient';

const REPORT_CATEGORIES = [
  'OBSTRUCTION',
  'CROWD_SURGE',
  'CLOSED',
  'DATA_ANOMALY',
  'AGGRESSIVE_TOUTING',
  'CONFUSING_TRANSIT',
  'OVERPRICING',
] as const;

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

export default function ReportPage() {
  const router = useRouter();
  const { zone } = router.query;
  const supabase = createClient();

  const [category, setCategory] = useState<typeof REPORT_CATEGORIES[number]>('OBSTRUCTION');
  const [severity, setSeverity] = useState<typeof SEVERITY_LEVELS[number]>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      router.push(`/auth/signin?redirect=/report?zone=${zone}`);
      return;
    }

    if (!zone) {
      setError('Zone ID is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          zoneId: zone,
          city: zone.toString().split('_')[0],
          category,
          severity,
          description,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit report');
      }

      const data = await response.json();
      
      setSuccess(true);
      
      // Show success message with karma award
      setTimeout(() => {
        router.push(`/city/${zone.toString().split('_')[0].toLowerCase()}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-mono">
        <div className="border border-green-500 p-8 max-w-md">
          <h1 className="text-2xl mb-4">✓ REPORT SUBMITTED</h1>
          <p className="mb-2">HAZARD REPORT LOGGED</p>
          <p className="text-sm text-green-400">KARMA +15</p>
          <p className="text-xs text-green-600 mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="border border-green-500 p-6 mb-8">
          <h1 className="text-3xl mb-2">// REPORT HAZARD</h1>
          <p className="text-green-400">Zone: {zone || 'Unknown'}</p>
        </div>

        {/* Auth Check */}
        {!user && (
          <div className="border border-yellow-500 bg-yellow-500/10 p-4 mb-6">
            <p className="text-yellow-500">
              ⚠ Authentication required. You'll be redirected to sign in.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="border border-green-500 p-6">
          {error && (
            <div className="border border-red-500 bg-red-500/10 p-4 mb-6">
              <p className="text-red-500">ERROR: {error}</p>
            </div>
          )}

          {/* Category */}
          <div className="mb-6">
            <label className="block mb-2 text-green-400">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-black border border-green-500 p-3 text-green-500 focus:outline-none focus:border-green-300"
              required
            >
              {REPORT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="mb-6">
            <label className="block mb-2 text-green-400">SEVERITY</label>
            <div className="grid grid-cols-4 gap-2">
              {SEVERITY_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSeverity(level)}
                  className={`p-2 border ${
                    severity === level
                      ? 'border-green-500 bg-green-500 text-black'
                      : 'border-green-500/30 text-green-500'
                  } hover:border-green-500 transition`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block mb-2 text-green-400">
              DESCRIPTION (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-black border border-green-500 p-3 text-green-500 focus:outline-none focus:border-green-300 h-32 resize-none"
              placeholder="Additional details about the hazard..."
              maxLength={500}
            />
            <p className="text-xs text-green-600 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting || !zone}
              className="flex-1 bg-green-500 text-black p-3 font-bold hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 border border-green-500 text-green-500 p-3 hover:bg-green-500 hover:text-black transition"
            >
              CANCEL
            </button>
          </div>

          {/* Karma Info */}
          <div className="mt-6 border-t border-green-500/30 pt-4">
            <p className="text-sm text-green-400">
              ✓ Earn +15 KARMA for reporting hazards
            </p>
            <p className="text-xs text-green-600 mt-1">
              Help keep operatives informed about field conditions
            </p>
          </div>
        </form>

        {/* Info Panel */}
        <div className="border border-green-500/30 p-6 mt-8">
          <h2 className="text-xl mb-4">// REPORT GUIDELINES</h2>
          <ul className="space-y-2 text-sm text-green-400">
            <li>→ Be specific about location and timing</li>
            <li>→ Choose appropriate severity level</li>
            <li>→ Include actionable details when possible</li>
            <li>→ Reports help other operatives stay safe</li>
            <li>→ False reports may impact your karma</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
