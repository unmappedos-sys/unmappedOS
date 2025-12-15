/**
 * UNMAPPED OS - Power Conservation Banner
 *
 * Shows when power conservation mode is active.
 * Builds trust with the user.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

interface PowerConservationBannerProps {
  visible: boolean;
  batteryLevel?: number;
  opsMode: OpsMode;
}

function PowerConservationBanner({ visible, batteryLevel, opsMode }: PowerConservationBannerProps) {
  const isDayMode = opsMode === 'DAY';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={`
            fixed bottom-24 left-4 z-40
            px-3 py-2 rounded-lg
            font-mono text-xs
            ${
              isDayMode
                ? 'bg-stone-200 text-stone-600 border border-stone-300'
                : 'bg-stone-900/90 text-stone-400 border border-stone-700 backdrop-blur-sm'
            }
          `}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚡</span>
            <div>
              <div className="font-bold tracking-wider">POWER CONSERVATION ACTIVE</div>
              <div className="opacity-70">INTEL SNAPSHOT MODE</div>
              {batteryLevel !== undefined && (
                <div className="opacity-50">{batteryLevel}% REMAINING</div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(PowerConservationBanner);
