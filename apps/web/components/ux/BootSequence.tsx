import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { c } from '@/lib/ux/copy';
import { getSessionFlag, setSessionFlag } from '@/lib/ux/sessionFlags';

type BootSequenceProps = {
  storageKey?: string;
  onDone?: () => void;
};

export default function BootSequence({ storageKey = 'boot_seen_v1', onDone }: BootSequenceProps) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const stages = useMemo(
    () => [c('boot.initializing'), c('boot.calibrating'), c('boot.ready')],
    []
  );

  useEffect(() => {
    if (getSessionFlag(storageKey)) return;
    setOpen(true);

    const totalMs = 1800; // ≤2s total
    const id = window.setTimeout(() => {
      setSessionFlag(storageKey, true);
      setOpen(false);
      onDone?.();
    }, totalMs);

    return () => window.clearTimeout(id);
  }, [onDone, storageKey]);

  const skip = () => {
    setSessionFlag(storageKey, true);
    setOpen(false);
    onDone?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] bg-ops-night-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
          onClick={skip}
          role="button"
          aria-label="Skip boot sequence"
        >
          <div className="hud-overlay" />
          <div className="scan-line" />

          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-xl">
              <div className="hud-card">
                <div className="font-mono text-tactical-sm text-ops-night-muted mb-3">
                  TAP TO SKIP
                </div>
                <div className="space-y-2">
                  {stages.map((line, idx) => (
                    <motion.div
                      key={line}
                      className="font-mono text-tactical-base text-ops-neon-green uppercase tracking-wider"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: reducedMotion ? 0 : idx * 0.45,
                        duration: reducedMotion ? 0 : 0.18,
                      }}
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    skip();
                  }}
                  className="btn-tactical-ghost mt-6 w-full py-3 text-tactical-xs"
                >
                  SKIP
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
