import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { c } from '@/lib/ux/copy';

type Props = {
  open: boolean;
  onClose: () => void;
  city: string;
  zonesExplored: number;
  anchorsReached: number;
  overpaymentsAvoided: number;
};

export default function DailySummaryOverlay({
  open,
  onClose,
  city,
  zonesExplored,
  anchorsReached,
  overpaymentsAvoided,
}: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-ops-night-bg/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onClick={onClose}
          role="button"
          aria-label="Close daily summary"
        >
          <div className="hud-overlay" />
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
              <div className="hud-card neon-border-top">
                <div className="font-tactical text-tactical-lg text-ops-neon-green uppercase tracking-widest">
                  {c('daily.title', { city: city.toUpperCase() })}
                </div>

                <div className="mt-5 space-y-3 font-mono text-tactical-xs">
                  <div className="flex justify-between">
                    <span className="text-ops-night-muted">{c('daily.zonesExplored')}:</span>
                    <span className="text-ops-night-text">{zonesExplored}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ops-night-muted">{c('daily.anchorsReached')}:</span>
                    <span className="text-ops-night-text">{anchorsReached}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ops-night-muted">{c('daily.overpaymentsAvoided')}:</span>
                    <span className="text-ops-night-text">{overpaymentsAvoided}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn-tactical-primary mt-6 w-full py-3 text-tactical-xs"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
