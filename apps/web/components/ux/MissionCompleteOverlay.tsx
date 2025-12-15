import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { c } from '@/lib/ux/copy';

type Props = {
  open: boolean;
  onClose: () => void;
  lines?: string[];
};

export default function MissionCompleteOverlay({ open, onClose, lines }: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] bg-ops-night-bg/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onClick={onClose}
          role="button"
          aria-label="Close mission complete"
        >
          <div className="hud-overlay" />
          <div className="scan-line" />

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
              <div className="hud-card neon-border-top">
                <div className="font-tactical text-tactical-2xl text-ops-neon-green uppercase tracking-widest">
                  {c('mission.complete')}
                </div>
                <div className="mt-2 font-tactical text-tactical-base text-ops-neon-cyan uppercase tracking-wider">
                  {c('mission.avoidedTouristZone')}
                </div>
                <div className="mt-1 font-tactical text-tactical-base text-ops-neon-cyan uppercase tracking-wider">
                  {c('mission.intelUpdated')}
                </div>

                {lines && lines.length > 0 && (
                  <div className="mt-4 space-y-1 font-mono text-tactical-xs text-ops-night-text/90">
                    {lines.map((l) => (
                      <div key={l}>{l}</div>
                    ))}
                  </div>
                )}

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
