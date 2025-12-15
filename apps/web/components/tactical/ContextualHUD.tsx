/**
 * UNMAPPED OS - Contextual HUD Strip
 *
 * Always-visible minimal header showing:
 * - City name and code
 * - Ops mode (DAY/NIGHT)
 * - GPS status
 * - Sync status
 * - Local time
 *
 * Must never distract from the map.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HUDState, GPSStatus, SyncStatus } from './types';

interface ContextualHUDProps extends HUDState {
  className?: string;
}

const GPS_ICONS: Record<GPSStatus, { icon: string; color: string }> = {
  ACTIVE: { icon: '◉', color: 'text-emerald-400' },
  SNAPSHOT: { icon: '◎', color: 'text-amber-400' },
  DISABLED: { icon: '○', color: 'text-red-400' },
  DEGRADED: { icon: '◌', color: 'text-orange-400' },
};

const SYNC_DISPLAY: Record<SyncStatus, { label: string; color: string }> = {
  ONLINE: { label: 'SYNC', color: 'text-emerald-400' },
  OFFLINE: { label: 'OFFLINE', color: 'text-red-400' },
  BLACK_BOX: { label: 'LOCAL', color: 'text-amber-400' },
};

function ContextualHUD({
  city,
  cityCode,
  opsMode,
  gpsStatus,
  syncStatus,
  batteryLevel,
  localTime,
  className = '',
}: ContextualHUDProps) {
  const isDayMode = opsMode === 'DAY';
  const gps = GPS_ICONS[gpsStatus];
  const sync = SYNC_DISPLAY[syncStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed top-0 left-0 right-0 z-40
        px-4 py-2
        font-mono text-xs tracking-wider
        ${
          isDayMode
            ? 'bg-stone-100/90 text-stone-800 border-b border-stone-300'
            : 'bg-black/80 text-stone-300 border-b border-stone-800'
        }
        backdrop-blur-sm
        ${className}
      `}
    >
      <div className="flex items-center justify-between max-w-screen-xl mx-auto">
        {/* Left: City & Mode */}
        <div className="flex items-center gap-3">
          <span className={`font-bold ${isDayMode ? 'text-stone-900' : 'text-white'}`}>
            {city.toUpperCase()}
          </span>
          <span className="opacity-40">{'//'}</span>
          <span className={opsMode === 'NIGHT' ? 'text-indigo-400' : 'text-amber-600'}>
            {opsMode} OPS
          </span>
        </div>

        {/* Center: Status Indicators */}
        <div className="flex items-center gap-4">
          {/* GPS Status */}
          <div className="flex items-center gap-1.5">
            <span className={gps.color}>{gps.icon}</span>
            <span className="opacity-60">GPS</span>
            <AnimatePresence mode="wait">
              {gpsStatus === 'SNAPSHOT' && (
                <motion.span
                  key="snapshot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-amber-400 ml-1"
                >
                  LOCK
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Sync Status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'ONLINE'
                  ? 'bg-emerald-400'
                  : syncStatus === 'BLACK_BOX'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
              }`}
            />
            <span className={sync.color}>{sync.label}</span>
          </div>

          {/* Battery (optional) */}
          {batteryLevel !== undefined && batteryLevel < 30 && (
            <div
              className={`flex items-center gap-1 ${batteryLevel < 15 ? 'text-red-400' : 'text-amber-400'}`}
            >
              <span>⚡</span>
              <span>{batteryLevel}%</span>
            </div>
          )}
        </div>

        {/* Right: Time & Code */}
        <div className="flex items-center gap-3">
          <span className="opacity-40">{cityCode}</span>
          <span className={isDayMode ? 'text-stone-600' : 'text-stone-400'}>{localTime}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ContextualHUD);
