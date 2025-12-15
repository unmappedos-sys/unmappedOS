/**
 * LOCAL SENSE - Long Press Details
 *
 * Optional details revealed on long press.
 * Price range, confidence, safety note.
 * Hidden by default. Never pushed.
 */

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LocalArea } from './types';

interface LongPressDetailsProps {
  area: LocalArea | null;
  visible: boolean;
  position: { x: number; y: number };
  onDismiss: () => void;
}

function LongPressDetails({ area, visible, position, onDismiss }: LongPressDetailsProps) {
  if (!area) return null;

  // Human-readable price feeling
  const priceFeelingText = {
    stable: 'Prices feel stable',
    elevated: 'Prices slightly higher',
    volatile: 'Prices vary',
    unknown: 'Not enough data',
  }[area.priceFeeling];

  // Confidence as feeling
  const confidenceText =
    area.confidence > 0.7
      ? 'Based on recent visits'
      : area.confidence > 0.4
        ? 'Based on limited info'
        : 'Mostly guessing';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onDismiss}
          />

          {/* Details Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 bg-white rounded-2xl shadow-xl shadow-stone-300/30
                       border border-stone-100 p-5 max-w-[240px]"
            style={{
              left: Math.min(Math.max(position.x - 120, 16), window.innerWidth - 256),
              top: Math.min(position.y - 20, window.innerHeight - 200),
            }}
          >
            <div className="space-y-4">
              {/* Price */}
              <div>
                <div className="text-stone-400 text-xs mb-1">Prices</div>
                <div className="text-stone-700 text-sm">{priceFeelingText}</div>
              </div>

              {/* Crowd */}
              {area.crowdFeeling !== 'unknown' && (
                <div>
                  <div className="text-stone-400 text-xs mb-1">Crowd</div>
                  <div className="text-stone-700 text-sm capitalize">{area.crowdFeeling}</div>
                </div>
              )}

              {/* Time note */}
              {area.timeNote && (
                <div>
                  <div className="text-stone-400 text-xs mb-1">Note</div>
                  <div className="text-stone-700 text-sm">{area.timeNote}</div>
                </div>
              )}

              {/* Confidence */}
              <div className="pt-2 border-t border-stone-100">
                <div className="text-stone-400 text-xs">{confidenceText}</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(LongPressDetails);
