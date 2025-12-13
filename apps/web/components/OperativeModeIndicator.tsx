/**
 * Operative Mode Indicator Component
 * 
 * Displays current operative mode and allows manual switching.
 */

import { OperativeMode, MODE_TRANSITIONS, getModeConfig } from '@/lib/operativeMode';

interface OperativeModeIndicatorProps {
  mode: OperativeMode;
  onModeChange?: (mode: OperativeMode) => void;
  showDetails?: boolean;
  allowManualSwitch?: boolean;
}

export function OperativeModeIndicator({
  mode,
  onModeChange,
  showDetails = false,
  allowManualSwitch = true,
}: OperativeModeIndicatorProps) {
  const config = getModeConfig(mode);

  const modeStyles: Record<OperativeMode, { bg: string; border: string; text: string; icon: string }> = {
    FAST_OPS: {
      bg: 'bg-ops-neon-amber/10',
      border: 'border-ops-neon-amber',
      text: 'text-ops-neon-amber',
      icon: '⚡',
    },
    DEEP_OPS: {
      bg: 'bg-ops-neon-cyan/10',
      border: 'border-ops-neon-cyan',
      text: 'text-ops-neon-cyan',
      icon: '🔍',
    },
    SAFE_OPS: {
      bg: 'bg-ops-neon-purple/10',
      border: 'border-ops-neon-purple',
      text: 'text-ops-neon-purple',
      icon: '🛡️',
    },
    CRISIS: {
      bg: 'bg-ops-neon-red/10',
      border: 'border-ops-neon-red',
      text: 'text-ops-neon-red',
      icon: '🚨',
    },
    STANDARD: {
      bg: 'bg-ops-neon-green/10',
      border: 'border-ops-neon-green',
      text: 'text-ops-neon-green',
      icon: '●',
    },
  };

  const style = modeStyles[mode];

  return (
    <div className={`${style.bg} border ${style.border} p-3 font-mono`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.icon}</span>
          <span className={`font-bold tracking-wider ${style.text}`}>{mode}</span>
        </div>

        {allowManualSwitch && onModeChange && (
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as OperativeMode)}
            className="bg-transparent border border-ops-neon-green/30 text-ops-night-text text-xs px-2 py-1 focus:outline-none focus:border-ops-neon-green"
          >
            <option value="STANDARD">STANDARD</option>
            <option value="FAST_OPS">FAST OPS</option>
            <option value="DEEP_OPS">DEEP OPS</option>
            <option value="SAFE_OPS">SAFE OPS</option>
          </select>
        )}
      </div>

      {showDetails && (
        <div className="mt-3 space-y-2 text-xs text-ops-night-text-dim">
          <p>{config.description}</p>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex justify-between">
              <span>HUD:</span>
              <span className={style.text}>{config.hudDensity.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>GPS:</span>
              <span className={style.text}>{config.gpsAccuracy.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>CORRIDORS:</span>
              <span className={style.text}>{config.showSafeCorridors ? 'ON' : 'OFF'}</span>
            </div>
            <div className="flex justify-between">
              <span>BEACONS:</span>
              <span className={style.text}>{config.showGhostBeacons ? 'ON' : 'OFF'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModeTransitionOverlayProps {
  fromMode: OperativeMode;
  toMode: OperativeMode;
  onComplete: () => void;
}

export function ModeTransitionOverlay({
  fromMode,
  toMode,
  onComplete,
}: ModeTransitionOverlayProps) {
  const messages = MODE_TRANSITIONS[toMode];
  const style = {
    FAST_OPS: 'text-ops-neon-amber',
    DEEP_OPS: 'text-ops-neon-cyan',
    SAFE_OPS: 'text-ops-neon-purple',
    CRISIS: 'text-ops-neon-red',
    STANDARD: 'text-ops-neon-green',
  }[toMode];

  return (
    <div className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center">
      <div className="text-center space-y-4 font-mono">
        {messages.map((msg, idx) => (
          <p
            key={idx}
            className={`${style} text-lg tracking-wider animate-fade-in`}
            style={{ animationDelay: `${idx * 400}ms` }}
          >
            {msg}
          </p>
        ))}
        <button
          onClick={onComplete}
          className="mt-6 px-6 py-2 border border-ops-neon-green/50 text-ops-neon-green text-sm hover:bg-ops-neon-green/10 transition-colors"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}

export default OperativeModeIndicator;
