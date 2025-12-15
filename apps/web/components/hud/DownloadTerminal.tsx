import { useEffect, useState } from 'react';
import { CityAccent, CITY_COLORS } from './types';

interface DownloadTerminalProps {
  active: boolean;
  cityName: string;
  cityAccent?: CityAccent;
  onComplete?: () => void;
  _onError?: (error: string) => void;
  className?: string;
}

interface TerminalLine {
  id: string;
  text: string;
  type: 'command' | 'output' | 'success' | 'error' | 'progress';
  timestamp: number;
}

const DOWNLOAD_SEQUENCE: { text: string; type: TerminalLine['type']; delay: number }[] = [
  { text: 'ESTABLISHING SECURE HANDSHAKE...', type: 'command', delay: 0 },
  { text: 'CONNECTION VERIFIED // PROTOCOL: TLS 1.3', type: 'output', delay: 400 },
  { text: '', type: 'progress', delay: 600 },
  { text: 'FETCHING GEOMETRY DATA...', type: 'command', delay: 800 },
  { text: 'ZONES: PARSING BOUNDARIES', type: 'output', delay: 1000 },
  { text: 'ANCHORS: RESOLVING COORDINATES', type: 'output', delay: 1200 },
  { text: 'GEOMETRY LOADED ✓', type: 'success', delay: 1600 },
  { text: '', type: 'progress', delay: 1800 },
  { text: 'CACHING LOCAL ANCHORS...', type: 'command', delay: 2000 },
  { text: 'INDEXING 47 PRIMARY WAYPOINTS', type: 'output', delay: 2200 },
  { text: 'ANCHORS CACHED ✓', type: 'success', delay: 2600 },
  { text: '', type: 'progress', delay: 2800 },
  { text: 'DECRYPTING CHEAT SHEET...', type: 'command', delay: 3000 },
  { text: 'TACTICAL INTEL: LOADING', type: 'output', delay: 3200 },
  { text: 'VERIFIED AGAINST SOURCE // HASH: OK', type: 'output', delay: 3400 },
  { text: 'CHEAT SHEET DECRYPTED ✓', type: 'success', delay: 3800 },
  { text: '', type: 'progress', delay: 4000 },
  { text: 'RUNNING INTEGRITY CHECK...', type: 'command', delay: 4200 },
  { text: 'CHECKSUM: VALID', type: 'output', delay: 4400 },
  { text: 'SIGNATURE: VERIFIED', type: 'output', delay: 4600 },
  { text: 'PACK INTEGRITY: 100%', type: 'success', delay: 5000 },
  { text: '', type: 'progress', delay: 5200 },
  { text: '[ ASSETS SECURED ]', type: 'success', delay: 5400 },
];

/**
 * DownloadTerminal: Cinematic terminal sequence for pack download
 *
 * Replaces boring progress bars with immersive terminal output
 * Includes: modem handshake aesthetic, typewriter effect, staged reveal
 */
export default function DownloadTerminal({
  active,
  cityName,
  cityAccent = 'default',
  onComplete,
  _onError,
  className = '',
}: DownloadTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const colors = CITY_COLORS[cityAccent];

  // Run terminal sequence
  useEffect(() => {
    if (!active) {
      setLines([]);
      setProgress(0);
      setCompleted(false);
      return;
    }

    const timers: NodeJS.Timeout[] = [];
    const totalDuration = DOWNLOAD_SEQUENCE[DOWNLOAD_SEQUENCE.length - 1].delay;

    // Add lines progressively
    DOWNLOAD_SEQUENCE.forEach((item, index) => {
      const timer = setTimeout(() => {
        if (item.type !== 'progress') {
          setLines((prev) => [
            ...prev,
            {
              id: `line-${index}`,
              text: item.text,
              type: item.type,
              timestamp: Date.now(),
            },
          ]);
        }

        // Update progress
        setProgress(Math.round((item.delay / totalDuration) * 100));

        // Check for completion
        if (index === DOWNLOAD_SEQUENCE.length - 1) {
          setCompleted(true);
          onComplete?.();
        }
      }, item.delay);

      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [active, onComplete]);

  if (!active) return null;

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return colors.primary;
      case 'output':
        return '#A0A0A0';
      case 'success':
        return '#00FF41';
      case 'error':
        return '#FF0040';
      default:
        return colors.primary;
    }
  };

  return (
    <div
      className={`bg-black border-2 overflow-hidden ${className}`}
      style={{
        borderColor: colors.primary,
        boxShadow: `0 0 30px ${colors.glow}, inset 0 0 60px rgba(0,0,0,0.8)`,
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{
          borderColor: `${colors.primary}40`,
          backgroundColor: `${colors.primary}10`,
        }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-ops-critical animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-ops-warning" />
          <div className="w-3 h-3 rounded-full bg-ops-active" />
        </div>
        <span
          className="flex-1 text-center font-mono text-xs tracking-widest"
          style={{ color: colors.primary }}
        >
          {cityName.toUpperCase()} {/* separator */} CITY PACK ACQUISITION
        </span>
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-sm h-64 overflow-y-auto custom-scrollbar">
        {/* Initial system message */}
        <div className="mb-4 opacity-60" style={{ color: colors.primary }}>
          UNMAPPED OS v6.0.0 // PACK SYNC PROTOCOL
          <br />
          ════════════════════════════════════════
        </div>

        {/* Dynamic lines */}
        {lines.map((line, index) => (
          <div
            key={line.id}
            className={`mb-1 ${index === lines.length - 1 ? 'terminal-flicker' : ''}`}
            style={{ color: getLineColor(line.type) }}
          >
            {line.type === 'command' && <span className="text-ops-neon-cyan mr-2">&gt;</span>}
            {line.type === 'output' && <span className="opacity-50 mr-2">│</span>}
            {line.type === 'success' && <span className="text-ops-active mr-2">✓</span>}
            {line.type === 'error' && <span className="text-ops-critical mr-2">✗</span>}
            {line.text}
          </div>
        ))}

        {/* Blinking cursor */}
        {!completed && (
          <span
            className="inline-block w-2 h-4 animate-pulse"
            style={{ backgroundColor: colors.primary }}
          />
        )}

        {/* Completion flash */}
        {completed && (
          <div
            className="mt-4 text-center animate-pulse-neon text-lg tracking-widest"
            style={{ color: colors.primary, textShadow: `0 0 20px ${colors.glow}` }}
          >
            READY FOR DEPLOYMENT
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 border-t" style={{ borderColor: `${colors.primary}40` }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            backgroundColor: colors.primary,
            boxShadow: `0 0 10px ${colors.glow}`,
          }}
        />
      </div>

      {/* Footer status */}
      <div
        className="px-4 py-2 flex items-center justify-between font-mono text-[10px] border-t"
        style={{
          borderColor: `${colors.primary}40`,
          color: `${colors.primary}80`,
        }}
      >
        <span>PROTOCOL: SECURE</span>
        <span>{progress}% COMPLETE</span>
        <span>EST: {Math.max(0, Math.round((100 - progress) / 20))}s</span>
      </div>
    </div>
  );
}
