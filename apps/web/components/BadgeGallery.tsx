/**
 * BadgeGallery Component
 * 
 * Displays user's badges with unlock status.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Badge } from '@/lib/badgeSystem';

interface BadgeGalleryProps {
  className?: string;
  showLocked?: boolean;
}

interface UserBadge extends Badge {
  unlocked_at?: string;
}

interface BadgeData {
  unlocked: UserBadge[];
  available: Badge[];
  total_unlocked: number;
  total_available: number;
}

export function BadgeGallery({ className = '', showLocked = true }: BadgeGalleryProps) {
  const [data, setData] = useState<BadgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | Badge | null>(null);

  useEffect(() => {
    fetchBadges();
  }, []);

  async function fetchBadges() {
    try {
      const res = await fetch('/api/protected/badges');
      if (res.ok) {
        const badgeData = await res.json();
        setData(badgeData);
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-500 bg-gray-900/50';
      case 'uncommon':
        return 'border-green-500 bg-green-900/30';
      case 'rare':
        return 'border-blue-500 bg-blue-900/30';
      case 'epic':
        return 'border-purple-500 bg-purple-900/30';
      case 'legendary':
        return 'border-yellow-500 bg-yellow-900/30';
      default:
        return 'border-gray-500 bg-gray-900/50';
    }
  };

  if (loading) {
    return (
      <div className={`${className} flex justify-center items-center py-8`}>
        <div className="text-gray-500 font-mono text-xs animate-pulse">
          LOADING BADGES...
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Stats */}
      <div className="flex justify-between items-center mb-4 px-2">
        <span className="text-gray-400 font-mono text-xs">
          BADGES UNLOCKED
        </span>
        <span className="text-green-400 font-mono text-sm font-bold">
          {data.total_unlocked} / {data.total_unlocked + data.total_available}
        </span>
      </div>

      {/* Unlocked Badges */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {data.unlocked.map((badge) => (
          <motion.button
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              aspect-square p-2 rounded border
              ${getRarityColor(badge.rarity)}
              flex flex-col items-center justify-center
              cursor-pointer transition-colors
            `}
          >
            <span className="text-2xl">{badge.icon}</span>
          </motion.button>
        ))}
      </div>

      {/* Locked Badges */}
      {showLocked && data.available.length > 0 && (
        <>
          <div className="text-gray-600 font-mono text-[10px] mb-2 px-2">
            LOCKED
          </div>
          <div className="grid grid-cols-4 gap-2 opacity-40">
            {data.available.map((badge) => (
              <motion.button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`
                  aspect-square p-2 rounded border border-gray-800 bg-gray-900/30
                  flex flex-col items-center justify-center
                  cursor-pointer grayscale
                `}
              >
                <span className="text-2xl">🔒</span>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedBadge(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
              bg-gray-900 border ${getRarityColor(selectedBadge.rarity)}
              rounded-lg p-6 max-w-xs mx-4
            `}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-5xl">{selectedBadge.icon}</span>
            </div>
            <h3 className="text-white font-bold text-center mb-2">
              {selectedBadge.name}
            </h3>
            <p className="text-gray-400 text-sm text-center mb-4">
              {selectedBadge.description}
            </p>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-500 uppercase">
                {selectedBadge.rarity}
              </span>
              <span className="text-gray-500 uppercase">
                {selectedBadge.category}
              </span>
            </div>
            {'unlocked_at' in selectedBadge && selectedBadge.unlocked_at && (
              <div className="mt-4 text-center text-green-400 text-xs font-mono">
                UNLOCKED: {new Date(selectedBadge.unlocked_at as string).toLocaleDateString()}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
