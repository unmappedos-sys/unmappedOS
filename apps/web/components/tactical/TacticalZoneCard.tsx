/**
 * UNMAPPED OS - Zone Card (Bottom Sheet)
 *
 * Slides up when a zone is tapped.
 * Shows:
 * - Zone texture type
 * - Confidence level
 * - Last verified time
 * - Status metrics
 * - Recommendation
 * - Anchor navigation (if available)
 *
 * Max height: 35% of screen
 * No scrolling required
 */

import { memo, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import type { TacticalZone, OpsMode, ZoneTexture } from './types';

interface TacticalZoneCardProps {
  zone: TacticalZone | null;
  opsMode: OpsMode;
  onClose: () => void;
  onNavigateToAnchor?: (zoneId: string) => void;
  className?: string;
}

const TEXTURE_LABELS: Record<ZoneTexture, { name: string; icon: string }> = {
  SILENCE: { name: 'SILENCE', icon: '◇' },
  ANALOG: { name: 'ANALOG', icon: '◈' },
  NEON: { name: 'NEON', icon: '◆' },
  CHAOS: { name: 'CHAOS', icon: '⬡' },
  TRANSIT_HUB: { name: 'TRANSIT', icon: '⬢' },
  UNKNOWN: { name: 'UNKNOWN', icon: '○' },
};

const CONFIDENCE_COLORS = {
  HIGH: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  MEDIUM: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  LOW: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  DEGRADED: 'text-red-400 border-red-400/30 bg-red-400/10',
};

function TacticalZoneCard({
  zone,
  opsMode,
  onClose,
  onNavigateToAnchor,
  className = '',
}: TacticalZoneCardProps) {
  const isDayMode = opsMode === 'DAY';

  const recommendation = useMemo(() => {
    if (!zone) return null;

    if (zone.status === 'OFFLINE') {
      return { text: 'ZONE OFFLINE — VERIFY BEFORE ENTERING', type: 'warning' as const };
    }
    if (zone.status === 'DEGRADED') {
      return { text: 'INTEL DEGRADED — PROCEED WITH CAUTION', type: 'caution' as const };
    }
    if (zone.metrics.footTraffic === 'EXTREME' || zone.metrics.priceBaseline === 'VOLATILE') {
      return { text: 'HIGH PRESSURE DETECTED — CONSIDER ALTERNATIVES', type: 'caution' as const };
    }
    if (zone.metrics.footTraffic === 'HIGH') {
      return { text: 'ELEVATED ACTIVITY — STAY AWARE', type: 'notice' as const };
    }
    return { text: 'PROCEED NORMALLY', type: 'clear' as const };
  }, [zone]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleDragEnd}
          className={`
            fixed bottom-0 left-0 right-0 z-50
            max-h-[35vh] rounded-t-2xl
            font-mono
            ${
              isDayMode
                ? 'bg-stone-100 text-stone-800 border-t-2 border-stone-300'
                : 'bg-stone-950 text-stone-200 border-t border-stone-700'
            }
            ${className}
          `}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div
              className={`w-12 h-1 rounded-full ${isDayMode ? 'bg-stone-400' : 'bg-stone-600'}`}
            />
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Header: Zone type & confidence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{TEXTURE_LABELS[zone.texture].icon}</span>
                <div>
                  <h2
                    className={`text-lg font-bold tracking-wider ${isDayMode ? 'text-stone-900' : 'text-white'}`}
                  >
                    ZONE: {TEXTURE_LABELS[zone.texture].name}
                  </h2>
                  <p className="text-xs opacity-60">{zone.name}</p>
                </div>
              </div>

              <div className={`px-3 py-1 rounded border ${CONFIDENCE_COLORS[zone.confidence]}`}>
                <span className="text-xs font-bold">{zone.confidence}</span>
              </div>
            </div>

            {/* Status line */}
            <div className={`text-xs ${isDayMode ? 'text-stone-600' : 'text-stone-400'}`}>
              LAST VERIFIED: {zone.lastVerified || 'UNKNOWN'}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-2 rounded ${isDayMode ? 'bg-stone-200' : 'bg-stone-900'}`}>
                <span className="opacity-60">FOOT TRAFFIC</span>
                <div
                  className={`font-bold ${
                    zone.metrics.footTraffic === 'LOW'
                      ? 'text-emerald-400'
                      : zone.metrics.footTraffic === 'NORMAL'
                        ? 'text-stone-300'
                        : zone.metrics.footTraffic === 'HIGH'
                          ? 'text-amber-400'
                          : 'text-red-400'
                  }`}
                >
                  {zone.metrics.footTraffic}
                </div>
              </div>
              <div className={`p-2 rounded ${isDayMode ? 'bg-stone-200' : 'bg-stone-900'}`}>
                <span className="opacity-60">PRICES</span>
                <div
                  className={`font-bold ${
                    zone.metrics.priceBaseline === 'STABLE'
                      ? 'text-emerald-400'
                      : zone.metrics.priceBaseline === 'ELEVATED'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {zone.metrics.priceBaseline}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div
                className={`p-3 rounded text-sm ${
                  recommendation.type === 'clear'
                    ? isDayMode
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-emerald-900/30 text-emerald-400'
                    : recommendation.type === 'notice'
                      ? isDayMode
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-amber-900/30 text-amber-400'
                      : recommendation.type === 'caution'
                        ? isDayMode
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-orange-900/30 text-orange-400'
                        : isDayMode
                          ? 'bg-red-100 text-red-800'
                          : 'bg-red-900/30 text-red-400'
                }`}
              >
                <span className="font-bold">RECOMMENDATION:</span>
                <br />
                {recommendation.text}
              </div>
            )}

            {/* Anchor navigation */}
            {zone.anchor && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs opacity-60">
                  ANCHOR AVAILABLE: {zone.anchor.distanceMeters}m
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigateToAnchor?.(zone.id)}
                  className={`
                    px-4 py-2 rounded text-sm font-bold tracking-wider
                    ${
                      isDayMode
                        ? 'bg-stone-900 text-white hover:bg-stone-800'
                        : 'bg-white text-black hover:bg-stone-200'
                    }
                    transition-colors
                  `}
                >
                  NAVIGATE TO ANCHOR
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(TacticalZoneCard);
