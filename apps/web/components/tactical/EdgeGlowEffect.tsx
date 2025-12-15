/**
 * UNMAPPED OS - Edge Glow Effect
 *
 * Subtle screen-edge glow for zone entry feedback.
 * Colors:
 * - Green: Clear zone
 * - Amber: Watch zone
 * - Red: Warning zone
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EdgeGlowEffectProps {
  color: 'green' | 'amber' | 'red' | null;
}

const GLOW_COLORS = {
  green: 'rgba(34, 197, 94, 0.3)',
  amber: 'rgba(251, 191, 36, 0.3)',
  red: 'rgba(239, 68, 68, 0.3)',
};

function EdgeGlowEffect({ color }: EdgeGlowEffectProps) {
  if (!color) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-30 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 100px 20px ${GLOW_COLORS[color]}`,
        }}
      />
    </AnimatePresence>
  );
}

export default memo(EdgeGlowEffect);
