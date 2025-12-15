/**
 * UNMAPPED OS - Offline Overlay
 *
 * Shown when connection is lost.
 * Map remains functional with local intelligence.
 * Subtle visual treatment - not alarming.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

interface OfflineOverlayProps {
  visible: boolean;
  hasLocalIntel: boolean;
  opsMode: OpsMode;
}

function OfflineOverlay({ visible, hasLocalIntel, opsMode }: OfflineOverlayProps) {
  const isDayMode = opsMode === 'DAY';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Subtle noise texture overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 pointer-events-none"
            style={{
              background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              opacity: isDayMode ? 0.03 : 0.05,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Status banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`
              fixed bottom-24 left-4 right-4 z-40
              max-w-sm mx-auto
              p-3 rounded-lg
              font-mono text-center text-sm
              ${
                isDayMode
                  ? 'bg-stone-200 text-stone-700 border border-stone-300'
                  : 'bg-stone-900/90 text-stone-300 border border-stone-700 backdrop-blur-sm'
              }
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold tracking-wider">CONNECTION LOST</span>
            </div>
            <div className="mt-1 text-xs opacity-70">
              {hasLocalIntel ? 'LOCAL INTELLIGENCE ACTIVE' : 'CACHED DATA UNAVAILABLE'}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(OfflineOverlay);
