/**
 * UNMAPPED OS - Tourist Pressure Alert
 *
 * Ambient alert shown when high tourist pressure detected.
 * Never uses "tourist trap" language.
 * Provides directional guidance.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TouristPressureAlert as PressureAlertType, OpsMode } from './types';

interface TouristPressureAlertProps {
  alert: PressureAlertType | null;
  opsMode: OpsMode;
  onDismiss: () => void;
}

function TouristPressureAlert({ alert, opsMode, onDismiss }: TouristPressureAlertProps) {
  const isDayMode = opsMode === 'DAY';

  if (!alert || !alert.active) return null;

  const levelColors = {
    MODERATE: isDayMode ? 'border-amber-500 bg-amber-50' : 'border-amber-500 bg-amber-900/20',
    HIGH: isDayMode ? 'border-orange-500 bg-orange-50' : 'border-orange-500 bg-orange-900/20',
    CRITICAL: isDayMode ? 'border-red-500 bg-red-50' : 'border-red-500 bg-red-900/20',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`
          fixed left-4 top-1/2 -translate-y-1/2 z-40
          max-w-xs p-4 rounded-lg
          font-mono text-sm
          border-l-4 ${levelColors[alert.level]}
          ${isDayMode ? 'text-stone-800' : 'text-stone-200'}
          backdrop-blur-sm shadow-lg
        `}
      >
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 opacity-50 hover:opacity-100 text-xs"
        >
          ✕
        </button>

        <div className="space-y-2">
          <div
            className={`font-bold tracking-wider ${
              alert.level === 'CRITICAL'
                ? 'text-red-400'
                : alert.level === 'HIGH'
                  ? 'text-orange-400'
                  : 'text-amber-400'
            }`}
          >
            LOCAL ACTIVITY DEGRADED
          </div>

          <div className="opacity-80">PRICE PRESSURE DETECTED</div>

          <div className={`pt-2 border-t ${isDayMode ? 'border-stone-300' : 'border-stone-700'}`}>
            <span className="opacity-60">RECOMMENDATION:</span>
            <br />
            <span className="font-bold">
              MOVE {alert.distanceMeters}m {alert.direction.toUpperCase()}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(TouristPressureAlert);
