import { useEffect, useState } from 'react';

type GPSStatus = 'DISABLED' | 'SNAPSHOT' | 'ACTIVE';
type SyncStatus = 'ONLINE' | 'OFFLINE' | 'BLACK_BOX';

interface StatusPanelProps {
  gpsStatus: GPSStatus;
  syncStatus: SyncStatus;
  className?: string;
}

/**
 * StatusPanel: Real-time GPS and sync status monitoring
 * 
 * UX Decision: Persistent status visibility builds trust in offline-first architecture.
 * Users need to know when they're operating in ghost mode (offline) vs. connected.
 * 
 * Features:
 * - Auto-updates on connection changes
 * - Color-coded status indicators (green/amber/gray)
 * - Mission lexicon messaging
 * - Compact display suitable for persistent HUD
 * 
 * Status Meanings:
 * GPS DISABLED: Location services off (gray)
 * GPS SNAPSHOT: Last known position cached (amber)
 * GPS ACTIVE: Real-time positioning (green)
 * 
 * SYNC ONLINE: Connected to network (green)
 * SYNC OFFLINE: No connection, operating from cache (amber)
 * SYNC BLACK_BOX: Offline mode with full city pack (green)
 */
export default function StatusPanel({ gpsStatus, syncStatus, className = '' }: StatusPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getGPSColor = () => {
    switch (gpsStatus) {
      case 'ACTIVE': return 'active';
      case 'SNAPSHOT': return 'warning';
      case 'DISABLED': return 'ghost';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'ONLINE': return 'active';
      case 'BLACK_BOX': return 'active';
      case 'OFFLINE': return 'warning';
    }
  };

  const getSyncMessage = () => {
    switch (syncStatus) {
      case 'ONLINE': return 'SECURE CHANNEL ONLINE';
      case 'BLACK_BOX': return 'BLACK BOX MODE';
      case 'OFFLINE': return 'CONNECTION SEVERED';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* GPS Status */}
      <div>
        <div className={`status-indicator ${getGPSColor()}`}>
          GPS: {gpsStatus}
        </div>
        <div className="font-mono text-[10px] text-ops-night-muted mt-1">
          {gpsStatus === 'ACTIVE' && 'REAL-TIME POSITION'}
          {gpsStatus === 'SNAPSHOT' && 'CACHED LOCATION'}
          {gpsStatus === 'DISABLED' && 'NO SIGNAL'}
        </div>
      </div>

      {/* Sync Status */}
      <div>
        <div className={`status-indicator ${getSyncColor()}`}>
          SYNC: {syncStatus}
        </div>
        <div className="font-mono text-[10px] text-ops-night-muted mt-1">
          {getSyncMessage()}
        </div>
      </div>
    </div>
  );
}
