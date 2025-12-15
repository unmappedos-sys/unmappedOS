import { useCallback, useEffect, useState } from 'react';
import { CityAccent, CITY_COLORS, DownloadStage, DownloadProgress } from './types';
import { vibrateDevice, VIBRATION_PATTERNS } from '@/lib/deviceAPI';

interface BlackBoxActuatorProps {
  cityName: string;
  cityAccent?: CityAccent;
  packDownloaded: boolean;
  packSizeMB?: number;
  onDownload: () => Promise<void>;
  onEnterField: () => void;
  disabled?: boolean;
  className?: string;
}

const DOWNLOAD_STAGES: { stage: DownloadStage; message: string; duration: number }[] = [
  { stage: 'HANDSHAKE', message: 'HANDSHAKE ESTABLISHED', duration: 400 },
  { stage: 'GEOMETRY', message: 'FETCHING GEOMETRY', duration: 800 },
  { stage: 'ANCHORS', message: 'CACHING ANCHORS', duration: 600 },
  { stage: 'CHEATSHEET', message: 'DECRYPTING CHEAT SHEET', duration: 500 },
  { stage: 'VERIFICATION', message: 'VERIFYING INTEGRITY', duration: 400 },
];

/**
 * BlackBoxActuator: Primary action button that transforms during download
 *
 * State 1: ACQUIRE CITY PACK (data-chip aesthetic)
 * State 2: Terminal expansion during download
 * State 3: ENTER FIELD (morphed solid state)
 *
 * This is the bridge from online browsing to offline field operations.
 */
export default function BlackBoxActuator({
  cityName,
  cityAccent = 'default',
  packDownloaded,
  packSizeMB = 45,
  onDownload,
  onEnterField,
  disabled = false,
  className = '',
}: BlackBoxActuatorProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({
    stage: 'IDLE',
    percent: 0,
    message: '',
  });
  const [secured, setSecured] = useState(false);
  const [flashComplete, setFlashComplete] = useState(false);
  const colors = CITY_COLORS[cityAccent];

  // Reset secured state when pack status changes
  useEffect(() => {
    if (packDownloaded) {
      setSecured(true);
    }
  }, [packDownloaded]);

  const handleDownload = useCallback(async () => {
    if (downloading || disabled) return;

    setDownloading(true);
    vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);

    // Play modem sound (optional - can be added via Audio API)
    try {
      const audio = new Audio('/sounds/modem-handshake.mp3');
      audio.volume = 0.1;
      audio.play().catch(() => {
        /* ignore if no audio file */
      });
    } catch {
      /* audio not available */
    }

    // Simulate staged download
    let totalProgress = 0;
    for (const { stage, message, duration } of DOWNLOAD_STAGES) {
      setProgress({ stage, percent: totalProgress, message });

      // Animate progress within this stage
      const startProgress = totalProgress;
      const endProgress = totalProgress + 100 / DOWNLOAD_STAGES.length;
      const steps = duration / 50;

      for (let i = 0; i < steps; i++) {
        await new Promise((r) => setTimeout(r, 50));
        const p = startProgress + (endProgress - startProgress) * (i / steps);
        setProgress((prev) => ({ ...prev, percent: p }));
      }

      totalProgress = endProgress;
    }

    // Actual download
    try {
      await onDownload();
      setProgress({ stage: 'COMPLETE', percent: 100, message: 'ASSETS SECURED' });

      // Flash effect
      setFlashComplete(true);
      vibrateDevice(VIBRATION_PATTERNS.CONFIRM);

      setTimeout(() => {
        setFlashComplete(false);
        setSecured(true);
        setDownloading(false);
      }, 150);
    } catch (error) {
      setProgress({ stage: 'ERROR', percent: 0, message: 'ACQUISITION FAILED' });
      vibrateDevice(VIBRATION_PATTERNS.HAZARD_ALERT);
      setTimeout(() => {
        setDownloading(false);
        setProgress({ stage: 'IDLE', percent: 0, message: '' });
      }, 2000);
    }
  }, [downloading, disabled, onDownload]);

  const handleEnterField = useCallback(() => {
    vibrateDevice(VIBRATION_PATTERNS.LIGHT_CLICK);
    onEnterField();
  }, [onEnterField]);

  // Downloading state - Terminal expansion
  if (downloading) {
    return (
      <div className={`relative ${className}`}>
        {/* Flash overlay */}
        {flashComplete && (
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ backgroundColor: colors.primary, opacity: 0.8 }}
          />
        )}

        <div
          className="bg-black border-2 p-6 font-mono overflow-hidden transition-all duration-300"
          style={{
            borderColor: colors.primary,
            boxShadow: `0 0 30px ${colors.glow}, inset 0 0 60px rgba(0,0,0,0.8)`,
          }}
        >
          {/* Terminal header */}
          <div
            className="flex items-center gap-2 pb-4 mb-4 border-b"
            style={{ borderColor: `${colors.primary}40` }}
          >
            <div className="w-3 h-3 rounded-full bg-ops-neon-red animate-pulse" />
            <span className="text-xs tracking-widest opacity-70" style={{ color: colors.primary }}>
              ACQUIRING {cityName.toUpperCase()} CITY PACK
            </span>
          </div>

          {/* Terminal output */}
          <div className="space-y-2 text-sm">
            {DOWNLOAD_STAGES.map(({ stage, message }, index) => {
              const currentIndex = DOWNLOAD_STAGES.findIndex((s) => s.stage === progress.stage);
              const isDone = index < currentIndex;
              const isActive = index === currentIndex;
              const isPending = index > currentIndex;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 transition-opacity duration-200 ${
                    isPending ? 'opacity-30' : ''
                  }`}
                  style={{ color: colors.primary }}
                >
                  <span className="text-ops-neon-cyan">&gt;</span>
                  <span className={`flex-1 ${isActive ? 'terminal-flicker' : ''}`}>{message}</span>
                  {isDone && <span className="text-ops-active tracking-widest">OK</span>}
                  {isActive && <span className="animate-pulse">...</span>}
                </div>
              );
            })}

            {progress.stage === 'COMPLETE' && (
              <div
                className="mt-4 pt-4 border-t text-center animate-pulse-neon"
                style={{ borderColor: `${colors.primary}40`, color: colors.primary }}
              >
                [ ASSETS SECURED ]
              </div>
            )}

            {progress.stage === 'ERROR' && (
              <div className="mt-4 pt-4 border-t text-center text-ops-critical">
                [ {progress.message} ]
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            className="mt-4 h-1 bg-black border overflow-hidden"
            style={{ borderColor: `${colors.primary}40` }}
          >
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${progress.percent}%`,
                backgroundColor: colors.primary,
                boxShadow: `0 0 10px ${colors.glow}`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Post-download state - ENTER FIELD
  if (secured || packDownloaded) {
    return (
      <button
        onClick={handleEnterField}
        className={`
          group relative w-full py-6 font-mono text-lg md:text-xl uppercase tracking-[0.2em]
          bg-black border-2 transition-all duration-300
          hover:scale-[1.02] active:scale-[0.98]
          ${className}
        `}
        style={{
          borderColor: colors.primary,
          color: colors.primary,
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
      >
        {/* Solid fill on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: `${colors.primary}15` }}
        />

        {/* Scan effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-full h-8 opacity-0 group-hover:opacity-30 transition-opacity"
            style={{
              background: `linear-gradient(to bottom, transparent, ${colors.primary}, transparent)`,
              animation: 'scan 2s linear infinite',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex items-center justify-center gap-3">
          <span className="text-2xl md:text-3xl" style={{ textShadow: `0 0 10px ${colors.glow}` }}>
            ⟫
          </span>
          <span style={{ textShadow: `0 0 10px ${colors.glow}` }}>ENTER FIELD</span>
          <span className="text-2xl md:text-3xl" style={{ textShadow: `0 0 10px ${colors.glow}` }}>
            ⟪
          </span>
        </div>

        {/* Corner accents */}
        <div
          className="absolute top-2 left-2 w-4 h-4 border-t border-l"
          style={{ borderColor: colors.primary }}
        />
        <div
          className="absolute top-2 right-2 w-4 h-4 border-t border-r"
          style={{ borderColor: colors.primary }}
        />
        <div
          className="absolute bottom-2 left-2 w-4 h-4 border-b border-l"
          style={{ borderColor: colors.primary }}
        />
        <div
          className="absolute bottom-2 right-2 w-4 h-4 border-b border-r"
          style={{ borderColor: colors.primary }}
        />
      </button>
    );
  }

  // Default state - ACQUIRE CITY PACK (data-chip aesthetic)
  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      className={`
        group relative w-full py-6 font-mono text-base md:text-lg uppercase tracking-[0.15em]
        bg-black border-2 transition-all duration-300
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-[1.02] active:scale-[0.98]
        ${className}
      `}
      style={{
        borderColor: `${colors.primary}80`,
        color: colors.primary,
      }}
    >
      {/* Data chip texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              ${colors.primary} 0px,
              ${colors.primary} 1px,
              transparent 1px,
              transparent 4px
            )
          `,
        }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ boxShadow: `inset 0 0 30px ${colors.glow}` }}
      />

      {/* Content */}
      <div className="relative space-y-2">
        <div
          className="flex items-center justify-center gap-3"
          style={{ textShadow: `0 0 10px ${colors.glow}` }}
        >
          <span className="text-xl">◈</span>
          <span>ACQUIRE CITY PACK</span>
          <span className="opacity-70">— {packSizeMB}MB</span>
        </div>
        <div className="text-xs tracking-wider opacity-60" style={{ color: colors.primary }}>
          INCLUDES: ZONES • ANCHORS • CHEAT SHEET • OFFLINE MAP
        </div>
      </div>

      {/* Circuit traces */}
      <div
        className="absolute top-0 left-4 w-px h-4 opacity-40"
        style={{ backgroundColor: colors.primary }}
      />
      <div
        className="absolute bottom-0 right-4 w-px h-4 opacity-40"
        style={{ backgroundColor: colors.primary }}
      />
      <div
        className="absolute top-4 left-0 h-px w-4 opacity-40"
        style={{ backgroundColor: colors.primary }}
      />
      <div
        className="absolute bottom-4 right-0 h-px w-4 opacity-40"
        style={{ backgroundColor: colors.primary }}
      />
    </button>
  );
}
