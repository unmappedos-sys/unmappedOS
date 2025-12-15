import { useCallback, useEffect, useState } from 'react';
import { CityAccent, CITY_COLORS, EmergencyInfo } from './types';

interface OfflineOverlayProps {
  isOffline: boolean;
  hasLocalCache: boolean;
  emergency?: EmergencyInfo;
  cityAccent?: CityAccent;
  onOpenOfflineMap?: () => void;
  className?: string;
}

/**
 * OfflineOverlay: Critical safety UX for disconnected state
 *
 * Trigger: Airplane Mode / No signal
 * Visual Changes:
 * - All glow removed
 * - Diagonal stripe overlay
 * - Reduced animation
 *
 * Must feel INTENTIONAL, not broken.
 */
export default function OfflineOverlay({
  isOffline,
  hasLocalCache,
  emergency,
  cityAccent = 'default',
  onOpenOfflineMap,
  className = '',
}: OfflineOverlayProps) {
  const [showSOS, setShowSOS] = useState(false);
  const colors = CITY_COLORS[cityAccent];

  // Auto-show SOS card after brief delay when offline without cache
  useEffect(() => {
    if (isOffline && !hasLocalCache) {
      const timer = setTimeout(() => setShowSOS(true), 2000);
      return () => clearTimeout(timer);
    }
    setShowSOS(false);
  }, [isOffline, hasLocalCache]);

  const handleSOS = useCallback(() => {
    setShowSOS((prev) => !prev);
  }, []);

  if (!isOffline) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Diagonal stripe overlay for entire screen */}
      <div
        className="fixed inset-0 pointer-events-none z-40 opacity-5"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            ${colors.primary} 10px,
            ${colors.primary} 20px
          )`,
        }}
      />

      {/* Status banner */}
      <div className="bg-black border-2 p-4" style={{ borderColor: '#FFB000' }}>
        {/* Header with icon */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📡</span>
          <div>
            <div className="font-mono text-base tracking-wider text-ops-warning">
              CONNECTION SEVERED
            </div>
            <div className="font-mono text-xs text-ops-night-muted mt-1">
              {hasLocalCache ? 'LOCAL CACHE ACTIVE' : 'NO LOCAL DATA'}
            </div>
          </div>
        </div>

        {/* Primary action */}
        {hasLocalCache ? (
          <button
            onClick={onOpenOfflineMap}
            className="w-full py-4 font-mono text-sm uppercase tracking-wider border-2 transition-all hover:bg-white/5"
            style={{
              borderColor: colors.primary,
              color: colors.primary,
            }}
          >
            [ OPEN OFFLINE MAP ]
          </button>
        ) : (
          <div className="text-center py-4 font-mono text-sm text-ops-night-muted">
            CONNECT ONCE TO ACQUIRE CITY PACK
          </div>
        )}

        {/* SOS Button */}
        <button
          onClick={handleSOS}
          className="w-full mt-3 py-3 font-mono text-xs uppercase tracking-wider border transition-all hover:bg-ops-critical/10"
          style={{
            borderColor: '#FF0040',
            color: '#FF0040',
          }}
        >
          [ SOS / TRANSLATE ]
        </button>
      </div>

      {/* Emergency card - expands on SOS tap */}
      {showSOS && emergency && (
        <div className="mt-3 bg-black border-2 p-4 animate-boot" style={{ borderColor: '#FF0040' }}>
          {/* Emergency header */}
          <div
            className="font-mono text-xs tracking-widest uppercase pb-3 mb-3 border-b"
            style={{ color: '#FF0040', borderColor: '#FF004040' }}
          >
            EMERGENCY CONTACTS
          </div>

          {/* Emergency numbers */}
          <div className="space-y-3 mb-4">
            <EmergencyRow label="POLICE" value={emergency.police} />
            <EmergencyRow label="AMBULANCE" value={emergency.ambulance} />
            <EmergencyRow label="EMBASSY" value={emergency.embassy} />
          </div>

          {/* Hospital address if available */}
          {emergency.hospitalAddress && (
            <div className="mb-4 p-3 bg-ops-night-surface border border-ops-night-border">
              <div className="font-mono text-[10px] text-ops-night-muted mb-1">
                NEAREST HOSPITAL
              </div>
              <div className="font-mono text-sm text-ops-night-text">
                {emergency.hospitalAddress}
              </div>
            </div>
          )}

          {/* Show to driver phrases */}
          {emergency.phrases && (
            <>
              <div
                className="font-mono text-xs tracking-widest uppercase pb-3 mb-3 border-b"
                style={{ color: '#FFB000', borderColor: '#FFB00040' }}
              >
                SHOW TO DRIVER
              </div>
              <div className="space-y-3">
                <PhraseCard english="I need help" local={emergency.phrases.help} />
                <PhraseCard english="Emergency / Urgent" local={emergency.phrases.emergency} />
                <PhraseCard english="Hospital / Medical" local={emergency.phrases.hospital} />
              </div>
            </>
          )}

          {/* Close button */}
          <button
            onClick={() => setShowSOS(false)}
            className="w-full mt-4 py-2 font-mono text-xs uppercase tracking-wider border border-ops-night-border text-ops-night-muted hover:text-ops-night-text transition-colors"
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}

// Emergency row component
function EmergencyRow({ label, value }: { label: string; value: string }) {
  const handleCall = () => {
    window.location.href = `tel:${value.replace(/[^0-9+]/g, '')}`;
  };

  return (
    <button
      onClick={handleCall}
      className="w-full flex items-center justify-between p-3 bg-ops-night-surface border border-ops-night-border hover:border-ops-critical transition-colors"
    >
      <span className="font-mono text-xs text-ops-night-muted">{label}</span>
      <span className="font-mono text-lg text-ops-critical tracking-wider">{value}</span>
    </button>
  );
}

// Phrase card for show-to-driver
function PhraseCard({ english, local }: { english: string; local: string }) {
  return (
    <div className="p-4 bg-white text-black">
      <div className="text-xs text-gray-500 mb-1">{english}</div>
      <div className="text-2xl font-bold">{local}</div>
    </div>
  );
}
