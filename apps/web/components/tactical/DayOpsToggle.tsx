/**
 * UNMAPPED OS - Day Ops Mode Toggle
 *
 * Quick toggle for Day/Night ops mode.
 * Triggered by:
 * - Manual toggle
 * - Ambient light sensor
 *
 * Transition: Fast hardware-style glitch (≤300ms)
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { OpsMode } from './types';

interface DayOpsToggleProps {
  opsMode: OpsMode;
  onToggle: () => void;
  className?: string;
}

function DayOpsToggle({ opsMode, onToggle, className = '' }: DayOpsToggleProps) {
  const isDayMode = opsMode === 'DAY';

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      className={`
        fixed top-14 right-4 z-40
        w-10 h-10 rounded-full
        flex items-center justify-center
        font-mono text-lg
        transition-colors duration-300
        ${
          isDayMode
            ? 'bg-stone-200 text-amber-600 border border-stone-300 shadow-lg'
            : 'bg-stone-900 text-indigo-400 border border-stone-700'
        }
        ${className}
      `}
      aria-label={isDayMode ? 'Switch to Night Ops' : 'Switch to Day Ops'}
    >
      {isDayMode ? '☀' : '☾'}
    </motion.button>
  );
}

export default memo(DayOpsToggle);
