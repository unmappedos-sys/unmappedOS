import { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { TouristPressureIndex } from '@/lib/intel/touristPressure';
import { c } from '@/lib/ux/copy';

type Props = {
  tpi: TouristPressureIndex;
};

function labelFromLevel(level: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  return level;
}

function statusColor(status: TouristPressureIndex['status']): string {
  if (status === 'COMPROMISED') return 'text-ops-neon-red';
  if (status === 'WATCH') return 'text-ops-neon-amber';
  return 'text-ops-neon-green';
}

function segmentActive(i: number, score: number, segments: number): boolean {
  const filled = Math.round((score / 100) * segments);
  return i < filled;
}

function TouristPressureGauge({ tpi }: Props) {
  const reducedMotion = useReducedMotion();
  const segments = 12;

  const ring = useMemo(() => {
    return Array.from({ length: segments }, (_, i) => ({ i }));
  }, []);

  return (
    <div className="bg-ops-night-surface/50 border border-ops-neon-green/20 p-4">
      <div className="flex items-center justify-between">
        <div className="font-tactical text-tactical-sm text-ops-neon-cyan uppercase tracking-wider">
          {c('tpi.title')}
        </div>
        <div
          className={`font-tactical text-tactical-xs uppercase tracking-widest ${statusColor(tpi.status)}`}
        >
          {tpi.status}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[96px_1fr] gap-4 items-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-1">
            {ring.map(({ i }) => (
              <motion.div
                key={i}
                className={`border border-ops-neon-green/20 ${segmentActive(i, tpi.score, segments) ? 'bg-ops-neon-green/25' : 'bg-transparent'}`}
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: segmentActive(i, tpi.score, segments) ? 1 : 0.5,
                      }
                }
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1 font-mono text-tactical-xs">
          <div className="flex justify-between gap-6">
            <span className="text-ops-night-muted">{c('tpi.touristPressure')}:</span>
            <span className="text-ops-night-text">{labelFromLevel(tpi.tourist_density)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-ops-night-muted">{c('tpi.localActivity')}:</span>
            <span className="text-ops-night-text">{labelFromLevel(tpi.local_activity)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-ops-night-muted">REASON:</span>
            <span className="text-ops-night-text">{tpi.reason}</span>
          </div>
        </div>
      </div>

      {tpi.status === 'COMPROMISED' &&
        tpi.price_delta_pct !== null &&
        tpi.price_delta_pct >= 15 && (
          <div className="mt-4 border-t border-ops-neon-red/20 pt-3">
            <div className="font-tactical text-tactical-base text-ops-neon-green uppercase tracking-wider">
              {c('tpi.youWereRight')}
            </div>
            <div className="font-mono text-tactical-sm text-ops-night-text/90">
              {c('tpi.areaOverpriced')}
            </div>
          </div>
        )}
    </div>
  );
}

export default memo(TouristPressureGauge);
