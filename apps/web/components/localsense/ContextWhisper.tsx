/**
 * LOCAL SENSE - Context Whisper
 *
 * A gentle hint that appears near where you tap.
 * No cards. No stats. Just a whisper.
 *
 * Tap once: see a contextual note
 * Tap again: "Take me here" option
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Whisper, LocalArea } from './types';

interface ContextWhisperProps {
  whisper: Whisper | null;
  area: LocalArea | null;
  showNavigation?: boolean;
  onNavigate?: (area: LocalArea) => void;
  onDismiss?: () => void;
}

function ContextWhisper({
  whisper,
  area,
  showNavigation = false,
  onNavigate,
  onDismiss,
}: ContextWhisperProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (whisper) {
      setVisible(true);

      // Auto-dismiss after 4 seconds if not showing navigation
      if (!showNavigation) {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(() => onDismiss?.(), 300);
        }, 4000);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [whisper, showNavigation, onDismiss]);

  if (!whisper) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: Math.min(Math.max(whisper.position.x - 100, 16), window.innerWidth - 216),
            top: Math.min(whisper.position.y + 20, window.innerHeight - 100),
          }}
        >
          <div
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg shadow-stone-200/50 
                       border border-stone-100 px-5 py-4 max-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-stone-600 text-sm font-light leading-relaxed">{whisper.text}</p>

            {showNavigation && area && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => onNavigate?.(area)}
                className="mt-3 w-full py-2 px-4 bg-stone-800 text-white text-sm font-medium
                           rounded-xl hover:bg-stone-700 active:bg-stone-900 transition-colors"
              >
                Take me here
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ContextWhisper);
