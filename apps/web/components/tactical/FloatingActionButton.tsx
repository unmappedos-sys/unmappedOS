/**
 * UNMAPPED OS - Floating Action Button
 *
 * Single primary action at any time.
 * Only ONE action visible - if more than one is needed, refactor.
 *
 * Action types:
 * - ENTER_LOCAL: Enter zone for detailed view
 * - NAVIGATE_ANCHOR: Navigate to zone anchor
 * - CRISIS_MODE: Activate emergency interface
 * - GHOST_MODE: Toggle shadow mode
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

export type FloatingActionType =
  | 'ENTER_LOCAL'
  | 'NAVIGATE_ANCHOR'
  | 'CRISIS_MODE'
  | 'GHOST_MODE'
  | 'RECENTER'
  | null;

interface FloatingActionButtonProps {
  action: FloatingActionType;
  opsMode: OpsMode;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

const ACTION_CONFIG: Record<
  NonNullable<FloatingActionType>,
  {
    label: string;
    icon: string;
    variant: 'primary' | 'warning' | 'ghost';
  }
> = {
  ENTER_LOCAL: { label: 'ENTER LOCAL MODE', icon: '◎', variant: 'primary' },
  NAVIGATE_ANCHOR: { label: 'NAVIGATE TO ANCHOR', icon: '⊕', variant: 'primary' },
  CRISIS_MODE: { label: 'ACTIVATE CRISIS MODE', icon: '🚨', variant: 'warning' },
  GHOST_MODE: { label: 'ENABLE GHOST MODE', icon: '👻', variant: 'ghost' },
  RECENTER: { label: 'RECENTER', icon: '◉', variant: 'primary' },
};

function FloatingActionButton({
  action,
  opsMode,
  onPress,
  disabled = false,
  className = '',
}: FloatingActionButtonProps) {
  if (!action) return null;

  const config = ACTION_CONFIG[action];
  const isDayMode = opsMode === 'DAY';

  const getVariantStyles = () => {
    switch (config.variant) {
      case 'warning':
        return isDayMode
          ? 'bg-red-600 text-white hover:bg-red-700 border-red-700'
          : 'bg-red-500 text-white hover:bg-red-600 border-red-400';
      case 'ghost':
        return isDayMode
          ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-700'
          : 'bg-purple-500/80 text-white hover:bg-purple-600 border-purple-400';
      default:
        return isDayMode
          ? 'bg-stone-900 text-white hover:bg-stone-800 border-stone-700'
          : 'bg-white text-black hover:bg-stone-100 border-stone-300';
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={action}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPress}
        disabled={disabled}
        className={`
          fixed bottom-6 left-1/2 -translate-x-1/2 z-40
          px-6 py-3 rounded-full
          font-mono text-sm font-bold tracking-wider
          border-2 shadow-lg
          transition-colors
          ${getVariantStyles()}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
      >
        <span className="mr-2">{config.icon}</span>
        {config.label}
      </motion.button>
    </AnimatePresence>
  );
}

export default memo(FloatingActionButton);
