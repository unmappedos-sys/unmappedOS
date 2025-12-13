/**
 * Ghost Beacon Indicator Component
 * 
 * Displays nearby ghost beacons with direction and distance.
 */

import { GhostBeacon, BeaconType, getBeaconIcon } from '@/lib/ghostBeacons';

interface GhostBeaconIndicatorProps {
  beacon: GhostBeacon & { direction: string; distance_meters: number };
  onInvestigate?: () => void;
}

export function GhostBeaconIndicator({ beacon, onInvestigate }: GhostBeaconIndicatorProps) {
  const typeLabels: Record<BeaconType, string> = {
    interest: 'POINT OF INTEREST',
    hidden_gem: 'HIDDEN GEM',
    local_favorite: 'LOCAL FAVORITE',
    historic: 'HISTORIC SITE',
    viewpoint: 'VIEWPOINT',
  };

  const typeColors: Record<BeaconType, string> = {
    interest: 'border-ops-neon-cyan text-ops-neon-cyan',
    hidden_gem: 'border-ops-neon-purple text-ops-neon-purple',
    local_favorite: 'border-ops-neon-amber text-ops-neon-amber',
    historic: 'border-ops-neon-green text-ops-neon-green',
    viewpoint: 'border-ops-neon-blue text-ops-neon-blue',
  };

  const colors = typeColors[beacon.beacon_type];
  const icon = getBeaconIcon(beacon.beacon_type);
  const label = typeLabels[beacon.beacon_type];

  return (
    <div
      className={`
        px-3 py-2 
        bg-ops-night-surface/80 backdrop-blur-sm
        border-l-2 ${colors}
        font-mono text-xs
        cursor-pointer hover:bg-ops-night-surface
        transition-colors
      `}
      onClick={onInvestigate}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-pulse">{icon}</span>
          <div>
            <p className="text-ops-night-text-dim text-[10px]">GHOST BEACON</p>
            <p className="text-ops-night-text tracking-wide">{label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{beacon.direction}</p>
          <p className="text-ops-night-text-dim">{beacon.distance_meters}M</p>
        </div>
      </div>

      {beacon.osm_tags && Object.keys(beacon.osm_tags).length > 0 && (
        <div className="mt-2 pt-2 border-t border-ops-neon-green/20">
          <p className="text-ops-night-text-dim text-[10px] uppercase">
            {beacon.osm_tags.name || beacon.osm_tags.amenity || beacon.osm_tags.tourism || 'Unknown'}
          </p>
        </div>
      )}
    </div>
  );
}

interface GhostBeaconListProps {
  beacons: Array<GhostBeacon & { direction: string; distance_meters: number }>;
  onInvestigate?: (beacon: GhostBeacon) => void;
  maxDisplay?: number;
}

export function GhostBeaconList({ beacons, onInvestigate, maxDisplay = 3 }: GhostBeaconListProps) {
  const displayBeacons = beacons.slice(0, maxDisplay);

  if (displayBeacons.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-ops-night-text-dim font-mono">
        <span className="animate-pulse">👻</span>
        <span>{beacons.length} BEACON{beacons.length !== 1 ? 'S' : ''} IN RANGE</span>
      </div>

      <div className="space-y-1">
        {displayBeacons.map((beacon) => (
          <GhostBeaconIndicator
            key={beacon.id}
            beacon={beacon}
            onInvestigate={() => onInvestigate?.(beacon)}
          />
        ))}
      </div>

      {beacons.length > maxDisplay && (
        <p className="text-xs text-ops-night-text-dim font-mono text-center">
          +{beacons.length - maxDisplay} MORE NEARBY
        </p>
      )}
    </div>
  );
}

export default GhostBeaconIndicator;
