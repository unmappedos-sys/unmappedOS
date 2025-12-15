import { memo } from 'react';
import { c } from '@/lib/ux/copy';

type Props = {
  visible: boolean;
  mode: 'OFFLINE' | 'BLACK_BOX';
};

function OfflineBanner({ visible, mode }: Props) {
  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70]">
      <div className="hud-card px-4 py-3 border border-ops-neon-amber/40">
        <div className="font-tactical text-tactical-xs text-ops-neon-amber uppercase tracking-widest">
          {c('offline.lost')}
        </div>
        <div className="font-mono text-tactical-xs text-ops-night-text/90">
          {mode === 'BLACK_BOX' ? c('offline.localActive') : 'NO LOCAL INTEL CACHE'}
        </div>
      </div>
    </div>
  );
}

export default memo(OfflineBanner);
