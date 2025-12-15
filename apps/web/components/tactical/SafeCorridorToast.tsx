/**
 * UNMAPPED OS - Safe Corridor Toast
 *
 * Shows when safe corridors are detected.
 * Only surfaces when relevant (night, degraded zones).
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

interface SafeCorridorToastProps {
  visible: boolean;
  type: 'NIGHT_SAFE' | 'EXTRACTION' | 'TRANSIT';
  opsMode: OpsMode;
  onDismiss: () => void;
}

const CORRIDOR_COPY: Record<string, { title: string; body: string }> = {
  NIGHT_SAFE: {
    title: 'SAFE CORRIDOR DETECTED',
    body: 'RECOMMENDED FOR NIGHT MOVEMENT',
  },
  EXTRACTION: {
    title: 'EXTRACTION ROUTE AVAILABLE',
    body: 'VERIFIED PATH TO TRANSIT',
  },
  TRANSIT: {
    title: 'TRANSIT CORRIDOR NEARBY',
    body: 'CONNECTS TO MAJOR HUB',
  },
};

function SafeCorridorToast({ visible, type, opsMode, onDismiss }: SafeCorridorToastProps) {
  const isDayMode = opsMode === 'DAY';
  const copy = CORRIDOR_COPY[type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={`
            fixed right-4 top-1/2 -translate-y-1/2 z-40
            max-w-xs p-4 rounded-lg
            font-mono text-sm
            border-l-4 border-emerald-500
            ${
              isDayMode
                ? 'bg-emerald-50 text-stone-800'
                : 'bg-emerald-900/20 text-stone-200 backdrop-blur-sm'
            }
            shadow-lg
          `}
        >
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 opacity-50 hover:opacity-100 text-xs"
          >
            ✕
          </button>

          <div className="space-y-2">
            <div className="text-emerald-400 font-bold tracking-wider">{copy.title}</div>
            <div className="opacity-70">{copy.body}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(SafeCorridorToast);
