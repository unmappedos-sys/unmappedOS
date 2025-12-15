/**
 * UNMAPPED OS - Anchor Reached Overlay
 *
 * Full-screen closure moment when anchor is reached.
 * Shows:
 * - Confirmation message
 * - "Position Verified"
 * - "Disengage Device"
 *
 * This is a CLOSURE moment - user should put phone away.
 */

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpsMode } from './types';

interface AnchorReachedOverlayProps {
  visible: boolean;
  zoneName?: string;
  opsMode: OpsMode;
  onDismiss: () => void;
}

function AnchorReachedOverlay({
  visible,
  zoneName,
  opsMode,
  onDismiss,
}: AnchorReachedOverlayProps) {
  const isDayMode = opsMode === 'DAY';

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onDismiss}
          className={`
            fixed inset-0 z-50
            flex flex-col items-center justify-center
            font-mono text-center
            ${isDayMode ? 'bg-stone-100' : 'bg-black'}
          `}
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
            className={`
              w-24 h-24 rounded-full
              flex items-center justify-center
              mb-8
              ${
                isDayMode
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500'
              }
            `}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-5xl"
            >
              ✓
            </motion.span>
          </motion.div>

          {/* Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h1
              className={`text-2xl font-bold tracking-widest ${isDayMode ? 'text-stone-900' : 'text-white'}`}
            >
              ANCHOR REACHED
            </h1>

            {zoneName && (
              <p
                className={`text-sm opacity-60 ${isDayMode ? 'text-stone-600' : 'text-stone-400'}`}
              >
                {zoneName}
              </p>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className={`
                pt-6 space-y-2
                ${isDayMode ? 'text-stone-600' : 'text-stone-400'}
              `}
            >
              <p className="text-sm tracking-wider">POSITION VERIFIED</p>
              <p
                className={`text-lg font-bold tracking-widest ${isDayMode ? 'text-emerald-600' : 'text-emerald-400'}`}
              >
                DISENGAGE DEVICE
              </p>
            </motion.div>
          </motion.div>

          {/* Tap to dismiss hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.2 }}
            className={`absolute bottom-8 text-xs ${isDayMode ? 'text-stone-500' : 'text-stone-600'}`}
          >
            TAP TO DISMISS
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(AnchorReachedOverlay);
