/**
 * UNMAPPED OS - Zone Entry Toast
 *
 * Appears when user physically enters a zone.
 * Shows zone status and guidance.
 * Auto-dismisses after 3 seconds.
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

export interface ZoneEntryToastData {
  id: string;
  title: string;
  body?: string;
  type: 'clear' | 'watch' | 'warning' | 'critical';
}

interface ZoneEntryToastProps {
  toast: ZoneEntryToastData | null;
  opsMode: OpsMode;
  onDismiss: () => void;
  duration?: number;
}

const TYPE_STYLES = {
  clear: {
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/20',
    icon: '✓',
    iconColor: 'text-emerald-400',
  },
  watch: {
    border: 'border-amber-500',
    glow: 'shadow-amber-500/20',
    icon: '◉',
    iconColor: 'text-amber-400',
  },
  warning: {
    border: 'border-orange-500',
    glow: 'shadow-orange-500/20',
    icon: '⚠',
    iconColor: 'text-orange-400',
  },
  critical: {
    border: 'border-red-500',
    glow: 'shadow-red-500/20',
    icon: '⊗',
    iconColor: 'text-red-400',
  },
};

function ZoneEntryToast({ toast, opsMode, onDismiss, duration = 3000 }: ZoneEntryToastProps) {
  const [visible, setVisible] = useState(false);
  const isDayMode = opsMode === 'DAY';

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  const style = TYPE_STYLES[toast.type];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className={`
            fixed top-16 left-4 right-4 z-50
            max-w-md mx-auto
            p-4 rounded-lg
            font-mono
            border-l-4 ${style.border}
            shadow-lg ${style.glow}
            cursor-pointer
            ${
              isDayMode
                ? 'bg-stone-100 text-stone-800'
                : 'bg-stone-900/95 text-stone-200 backdrop-blur-sm'
            }
          `}
        >
          <div className="flex items-start gap-3">
            <span className={`text-xl ${style.iconColor}`}>{style.icon}</span>
            <div className="flex-1">
              <h3
                className={`font-bold text-sm tracking-wider ${isDayMode ? 'text-stone-900' : 'text-white'}`}
              >
                {toast.title}
              </h3>
              {toast.body && <p className="text-xs mt-1 opacity-70">{toast.body}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ZoneEntryToast);
