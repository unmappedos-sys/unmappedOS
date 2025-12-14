/**
 * Operative Replay Page
 * 
 * Movement timeline visualization and export.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  getAllReplaySessions,
  getReplaySession,
  generateTimelineData,
  exportSessionAsJSON,
  exportSessionAsCSV,
  purgeOldSessions,
  ReplaySession,
} from '@/lib/operativeReplay';

export default function ReplayPage() {
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ReplaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const allSessions = await getAllReplaySessions();
      // Sort by date descending
      allSessions.sort((a, b) => b.date.localeCompare(a.date));
      setSessions(allSessions);

      if (allSessions.length > 0) {
        setSelectedSession(allSessions[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    const session = await getReplaySession(sessionId);
    setSelectedSession(session);
  };

  const handleExport = async () => {
    if (!selectedSession) return;

    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'json') {
        data = await exportSessionAsJSON(selectedSession.id);
        filename = `replay-${selectedSession.date}.json`;
        mimeType = 'application/json';
      } else {
        data = await exportSessionAsCSV(selectedSession.id);
        filename = `replay-${selectedSession.date}.csv`;
        mimeType = 'text/csv';
      }

      // Download file
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePurge = async () => {
    if (confirm('Delete sessions older than 30 days?')) {
      const deleted = await purgeOldSessions(30);
      alert(`Deleted ${deleted} old sessions`);
      loadSessions();
    }
  };

  const timeline = selectedSession ? generateTimelineData(selectedSession) : [];

  return (
    <>
      <Head>
        <title>OPERATIVE REPLAY - UNMAPPED OS</title>
      </Head>

      <div className="min-h-screen bg-ops-night text-ops-night-text font-mono">
        {/* Header */}
        <header className="border-b border-ops-neon-green/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/operative"
                className="text-ops-neon-green hover:underline"
              >
                ← BACK
              </Link>
              <h1 className="font-tactical text-tactical-lg text-ops-neon-green tracking-wider">
                OPERATIVE REPLAY
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ops-night-text-dim">
                {sessions.length} SESSIONS
              </span>
              <button
                onClick={handlePurge}
                className="px-3 py-1 border border-ops-neon-red/50 text-ops-neon-red text-xs hover:bg-ops-neon-red/10 transition-colors"
              >
                PURGE OLD
              </button>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Session List */}
          <aside className="w-64 border-r border-ops-neon-green/30 p-4 space-y-2 max-h-[calc(100vh-80px)] overflow-y-auto">
            <h2 className="text-xs text-ops-night-text-dim uppercase tracking-wider mb-3">
              Sessions
            </h2>

            {loading ? (
              <p className="text-ops-night-text-dim">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-ops-night-text-dim">No sessions recorded</p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`
                    w-full text-left p-3 border transition-colors
                    ${selectedSession?.id === session.id
                      ? 'border-ops-neon-green bg-ops-neon-green/10'
                      : 'border-ops-neon-green/30 hover:border-ops-neon-green/50'
                    }
                  `}
                >
                  <p className="text-sm font-bold">{session.date}</p>
                  <p className="text-xs text-ops-night-text-dim">{session.city}</p>
                  <div className="mt-2 text-xs text-ops-night-text-dim flex gap-3">
                    <span>{session.stats.zones_visited} zones</span>
                    <span>{session.stats.total_distance_km.toFixed(1)}km</span>
                  </div>
                </button>
              ))
            )}
          </aside>

          {/* Session Details */}
          <main className="flex-1 p-6">
            {selectedSession ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard
                    label="Distance"
                    value={`${selectedSession.stats.total_distance_km.toFixed(2)} km`}
                    icon="📍"
                  />
                  <StatCard
                    label="Zones Visited"
                    value={selectedSession.stats.zones_visited.toString()}
                    icon="🗺️"
                  />
                  <StatCard
                    label="Anchors Reached"
                    value={selectedSession.stats.anchors_reached.toString()}
                    icon="⚓"
                  />
                  <StatCard
                    label="Duration"
                    value={formatDuration(
                      selectedSession.stats.end_time - selectedSession.stats.start_time
                    )}
                    icon="⏱️"
                  />
                </div>

                {/* Export Controls */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-ops-night-surface border border-ops-neon-green/30">
                  <span className="text-xs text-ops-night-text-dim uppercase">Export:</span>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                    className="bg-ops-night border border-ops-neon-green/30 text-ops-night-text px-3 py-1 text-sm"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                  <button
                    onClick={handleExport}
                    className="px-4 py-1 bg-ops-neon-green/10 border border-ops-neon-green text-ops-neon-green text-sm hover:bg-ops-neon-green/20 transition-colors"
                  >
                    DOWNLOAD
                  </button>
                </div>

                {/* Timeline */}
                <div className="border border-ops-neon-green/30">
                  <div className="p-3 border-b border-ops-neon-green/30 bg-ops-night-surface">
                    <h3 className="text-sm uppercase tracking-wider">
                      Timeline ({timeline.length} events)
                    </h3>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {timeline.length === 0 ? (
                      <p className="p-4 text-ops-night-text-dim">No events recorded</p>
                    ) : (
                      <div className="divide-y divide-ops-neon-green/20">
                        {timeline.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-4 p-3 hover:bg-ops-neon-green/5"
                          >
                            <span className="text-lg">{item.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm">{item.event}</p>
                              {item.details && (
                                <p className="text-xs text-ops-night-text-dim">
                                  {item.details}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-ops-night-text-dim">
                              {item.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-ops-night-text-dim">
                Select a session to view details
              </div>
            )}
          </main>
        </div>

        {/* Privacy Notice */}
        <footer className="border-t border-ops-neon-green/30 p-4 text-center">
          <p className="text-xs text-ops-night-text-dim">
            🔒 ALL REPLAY DATA IS STORED LOCALLY ON YOUR DEVICE // NEVER UPLOADED
          </p>
        </footer>
      </div>
    </>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="p-4 bg-ops-night-surface border border-ops-neon-green/30">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs text-ops-night-text-dim uppercase">{label}</span>
      </div>
      <p className="text-2xl font-bold text-ops-neon-green">{value}</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}
