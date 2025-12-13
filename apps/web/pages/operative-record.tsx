/**
 * Operative Record Page
 * Full dashboard showing karma, level, badges, activity feed, and export
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import GamifyBadge from '../components/GamifyBadge';

interface GamificationStats {
  karma: number;
  level: number;
  badges: any[];
  streak: number;
  last_active: string;
  total_intel: number;
  quests: any[];
  recent_karma: any[];
}

interface Activity {
  id: string;
  action_type: string;
  payload: any;
  created_at: string;
  metadata: any;
}

export default function OperativeRecord() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadStats();
      loadActivities();
    }
  }, [user, filter, page]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login?reason=AUTH_REQUIRED&redirect=/operative');
      return;
    }

    setUser(session.user);
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/gamify/stats', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadActivities() {
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: (page * 50).toString(),
      });

      if (filter !== 'all') {
        params.set('action_type', filter);
      }

      const response = await fetch(`/api/activity?${params}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  async function exportData(format: 'json' | 'csv') {
    setExporting(true);
    try {
      const response = await fetch(`/api/activity/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unmappedos-activity.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Export failed. You may have exceeded rate limits.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  }

  function formatActionType(type: string): string {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-mono">
        <div className="text-xl">LOADING OPERATIVE RECORD...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="border border-green-500 p-6 mb-8">
          <h1 className="text-3xl mb-2">// OPERATIVE RECORD</h1>
          <p className="text-green-400">AGENT ID: {user?.id?.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="border border-green-500 p-6">
              <div className="text-sm text-green-400">KARMA</div>
              <div className="text-4xl font-bold">{stats.karma}</div>
            </div>
            <div className="border border-green-500 p-6">
              <div className="text-sm text-green-400">LEVEL</div>
              <div className="text-4xl font-bold">{stats.level}</div>
            </div>
            <div className="border border-green-500 p-6">
              <div className="text-sm text-green-400">STREAK</div>
              <div className="text-4xl font-bold">{stats.streak} DAYS</div>
            </div>
            <div className="border border-green-500 p-6">
              <div className="text-sm text-green-400">TOTAL INTEL</div>
              <div className="text-4xl font-bold">{stats.total_intel}</div>
            </div>
          </div>
        )}

        {/* Badges */}
        {stats && stats.badges.length > 0 && (
          <div className="border border-green-500 p-6 mb-8">
            <h2 className="text-xl mb-4">// BADGES UNLOCKED</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.badges.map((badge: any, idx: number) => (
                <GamifyBadge key={idx} badge={badge} />
              ))}
            </div>
          </div>
        )}

        {/* Export Controls */}
        <div className="border border-green-500 p-6 mb-8">
          <h2 className="text-xl mb-4">// DATA EXPORT</h2>
          <div className="flex gap-4">
            <button
              onClick={() => exportData('json')}
              disabled={exporting}
              className="px-6 py-2 border border-green-500 hover:bg-green-500 hover:text-black transition disabled:opacity-50"
            >
              {exporting ? 'EXPORTING...' : 'EXPORT JSON'}
            </button>
            <button
              onClick={() => exportData('csv')}
              disabled={exporting}
              className="px-6 py-2 border border-green-500 hover:bg-green-500 hover:text-black transition disabled:opacity-50"
            >
              {exporting ? 'EXPORTING...' : 'EXPORT CSV'}
            </button>
          </div>
          <p className="text-sm text-green-400 mt-2">
            Rate limit: 5 exports per hour
          </p>
        </div>

        {/* Activity Feed */}
        <div className="border border-green-500 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl">// ACTIVITY LOG</h2>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-black border border-green-500 px-4 py-2 text-green-500"
            >
              <option value="all">ALL ACTIONS</option>
              <option value="comment_create">COMMENTS</option>
              <option value="price_report">PRICES</option>
              <option value="hazard_report">HAZARDS</option>
              <option value="pack_download">DOWNLOADS</option>
              <option value="data_export">EXPORTS</option>
            </select>
          </div>

          <div className="space-y-2">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-green-400">
                NO ACTIVITY LOGGED YET
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="border border-green-500/30 p-4 hover:border-green-500 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{formatActionType(activity.action_type)}</div>
                      {activity.payload.city && (
                        <div className="text-sm text-green-400">
                          {activity.payload.city} // {activity.payload.zone_id?.slice(0, 8)}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-green-400">
                      {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-green-500 hover:bg-green-500 hover:text-black transition disabled:opacity-50"
            >
              PREVIOUS
            </button>
            <div>PAGE {page + 1}</div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={activities.length < 50}
              className="px-4 py-2 border border-green-500 hover:bg-green-500 hover:text-black transition disabled:opacity-50"
            >
              NEXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}

