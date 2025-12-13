/**
 * Leaderboard Component
 * 
 * Anonymous leaderboard display.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  rank: number;
  callsign: string;
  karma: number;
  level: number;
  streak: number;
}

interface LeaderboardProps {
  city?: string;
  className?: string;
}

type LeaderboardType = 'karma' | 'level' | 'streak';

export function Leaderboard({ city, className = '' }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<LeaderboardType>('karma');

  useEffect(() => {
    fetchLeaderboard();
  }, [city, type]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (city) params.set('city', city);

      const res = await fetch(`/api/public/leaderboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-300';
      case 3:
        return 'text-amber-600';
      default:
        return 'text-gray-500';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '👑';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <div className={`${className} bg-black/60 rounded-lg border border-gray-800`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-mono text-sm font-bold">
            LEADERBOARD
          </h3>
          <span className="text-gray-500 text-xs font-mono">
            {city || 'GLOBAL'}
          </span>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2 mt-3">
          {(['karma', 'level', 'streak'] as LeaderboardType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`
                px-3 py-1 rounded text-xs font-mono uppercase
                transition-colors
                ${type === t
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="p-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500 font-mono text-xs animate-pulse">
            LOADING...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-600 font-mono text-xs">
            NO DATA
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  flex items-center gap-3 p-2 rounded
                  ${entry.rank <= 3 ? 'bg-gray-800/50' : 'bg-gray-900/30'}
                `}
              >
                {/* Rank */}
                <div className={`w-8 text-center font-mono font-bold ${getRankColor(entry.rank)}`}>
                  {getRankIcon(entry.rank) || `#${entry.rank}`}
                </div>

                {/* Callsign */}
                <div className="flex-1 text-white font-mono text-sm truncate">
                  {entry.callsign}
                </div>

                {/* Value */}
                <div className="text-right">
                  <span className="text-green-400 font-mono font-bold">
                    {type === 'karma' && entry.karma.toLocaleString()}
                    {type === 'level' && `LVL ${entry.level}`}
                    {type === 'streak' && `${entry.streak}🔥`}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
