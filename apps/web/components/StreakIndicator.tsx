/**
 * StreakIndicator Component
 * 
 * Shows current streak status with visual feedback.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StreakInfo } from '@/lib/streakManager';

interface StreakIndicatorProps {
  className?: string;
}

export function StreakIndicator({ className = '' }: StreakIndicatorProps) {
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreak();
  }, []);

  async function fetchStreak() {
    try {
      const res = await fetch('/api/protected/streaks');
      if (res.ok) {
        const data = await res.json();
        setStreakInfo(data);
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !streakInfo) {
    return null;
  }

  const getStatusColor = () => {
    switch (streakInfo.streak_status) {
      case 'active':
        return 'text-green-400 border-green-400/30';
      case 'at_risk':
        return 'text-yellow-400 border-yellow-400/30 animate-pulse';
      case 'broken':
        return 'text-red-400 border-red-400/30';
      default:
        return 'text-gray-400 border-gray-400/30';
    }
  };

  const getFireEmoji = () => {
    const count = Math.min(Math.floor(streakInfo.current_streak / 7), 3);
    return '🔥'.repeat(Math.max(1, count));
  };

  return (
    <div className={`${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`
          flex items-center gap-2 px-3 py-1.5
          bg-black/80 border rounded
          font-mono text-xs
          ${getStatusColor()}
        `}
      >
        <span>{getFireEmoji()}</span>
        <span className="font-bold">{streakInfo.current_streak}</span>
        <span className="text-gray-500">DAY STREAK</span>
      </motion.div>

      <AnimatePresence>
        {message && streakInfo.streak_status === 'at_risk' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="
              absolute top-full left-0 mt-1
              px-2 py-1 bg-yellow-900/90 border border-yellow-500/30
              text-yellow-400 text-[10px] font-mono
              rounded whitespace-nowrap
            "
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
