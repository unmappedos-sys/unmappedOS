import { ReactNode } from 'react';
import { CityAccent, CITY_COLORS } from './types';

interface DataTileProps {
  title: string;
  children: ReactNode;
  cityAccent?: CityAccent;
  variant?: 'default' | 'warning' | 'critical';
  className?: string;
}

/**
 * DataTile: Individual intel card for the bento grid
 *
 * Sharp borders, no photos, no gradients.
 * Pure data presentation with tactical aesthetics.
 */
export default function DataTile({
  title,
  children,
  cityAccent = 'default',
  variant = 'default',
  className = '',
}: DataTileProps) {
  const colors = CITY_COLORS[cityAccent];

  const variantColors = {
    default: colors.primary,
    warning: '#FFB000',
    critical: '#FF0040',
  };

  const accentColor = variantColors[variant];

  return (
    <div
      className={`
        relative bg-black border overflow-hidden
        ${className}
      `}
      style={{
        borderColor: `${accentColor}40`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* Header */}
        <div
          className="font-mono text-[10px] md:text-xs tracking-[0.25em] uppercase mb-3 pb-2 border-b"
          style={{
            color: accentColor,
            borderColor: `${accentColor}30`,
          }}
        >
          {title}
        </div>

        {/* Body */}
        <div className="font-mono text-sm md:text-base text-ops-night-text">{children}</div>
      </div>

      {/* Corner markers */}
      <div
        className="absolute bottom-1 right-1 w-2 h-2 border-b border-r opacity-30"
        style={{ borderColor: accentColor }}
      />
    </div>
  );
}

// Threat Assessment Tile
interface ThreatTileProps {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  index: number;
  primaryRisk: string;
  sector?: string;
  cityAccent?: CityAccent;
}

export function ThreatTile({
  level,
  index,
  primaryRisk,
  sector,
  cityAccent = 'default',
}: ThreatTileProps) {
  const variant = level === 'CRITICAL' ? 'critical' : level === 'HIGH' ? 'warning' : 'default';
  const indexStr = String(index).padStart(2, '0');

  return (
    <DataTile title="THREAT ASSESSMENT" cityAccent={cityAccent} variant={variant}>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-ops-night-muted text-xs">HASSLE INDEX</span>
          <span
            className="text-lg font-bold tracking-wider"
            style={{
              color:
                variant === 'critical' ? '#FF0040' : variant === 'warning' ? '#FFB000' : '#00FF41',
            }}
          >
            {level} ({indexStr}/10)
          </span>
        </div>
        <div className="text-xs text-ops-night-muted">
          PRIMARY RISK: <span className="text-ops-night-text">{primaryRisk.toUpperCase()}</span>
          {sector && <span className="opacity-60"> — SECTOR {sector}</span>}
        </div>
      </div>
    </DataTile>
  );
}

// Economics / Price Delta Tile
interface EconomicsTileProps {
  localPrice: number;
  touristPrice: number;
  currency: string;
  item: string;
  cityAccent?: CityAccent;
}

export function EconomicsTile({
  localPrice,
  touristPrice,
  currency,
  item,
  cityAccent = 'default',
}: EconomicsTileProps) {
  const markup = Math.round(((touristPrice - localPrice) / localPrice) * 100);
  const variant = markup > 100 ? 'warning' : 'default';

  return (
    <DataTile title="ECONOMICS" cityAccent={cityAccent} variant={variant}>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">LOCAL {item.toUpperCase()}</span>
          <span className="text-ops-active">
            {currency}
            {localPrice}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">TOURIST {item.toUpperCase()}</span>
          <span className="text-ops-warning">
            {currency}
            {touristPrice}
          </span>
        </div>
        <div className="pt-2 border-t border-ops-night-border text-xs">
          <span className="text-ops-night-muted">MARKUP RISK: </span>
          <span className="font-bold" style={{ color: markup > 100 ? '#FF0040' : '#FFB000' }}>
            +{markup}%
          </span>
        </div>
      </div>
    </DataTile>
  );
}

// Connectivity Tile
interface ConnectivityTileProps {
  avgWifiMbps: number;
  esimProviders: string[];
  cityAccent?: CityAccent;
}

export function ConnectivityTile({
  avgWifiMbps,
  esimProviders,
  cityAccent = 'default',
}: ConnectivityTileProps) {
  const status =
    avgWifiMbps >= 50
      ? 'EXCELLENT'
      : avgWifiMbps >= 25
        ? 'GOOD'
        : avgWifiMbps >= 10
          ? 'FAIR'
          : 'POOR';

  return (
    <DataTile title="SIGNAL" cityAccent={cityAccent}>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">AVG WIFI</span>
          <span className="text-ops-neon-cyan">{avgWifiMbps} MBPS</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">STATUS</span>
          <span
            className={
              status === 'EXCELLENT' || status === 'GOOD' ? 'text-ops-active' : 'text-ops-warning'
            }
          >
            {status}
          </span>
        </div>
        {esimProviders.length > 0 && (
          <div className="pt-2 border-t border-ops-night-border text-xs">
            <span className="text-ops-night-muted">ESIM REC: </span>
            <span className="text-ops-night-text">{esimProviders.join(' / ')}</span>
          </div>
        )}
      </div>
    </DataTile>
  );
}

// Atmospherics Tile
interface AtmosphericsTileProps {
  tempC: number;
  humidity: number;
  condition: string;
  note?: string;
  cityAccent?: CityAccent;
}

export function AtmosphericsTile({
  tempC,
  humidity,
  condition,
  note,
  cityAccent = 'default',
}: AtmosphericsTileProps) {
  const variant = tempC > 35 || humidity > 85 ? 'warning' : 'default';

  return (
    <DataTile title="ATMOSPHERICS" cityAccent={cityAccent} variant={variant}>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">TEMP</span>
          <span className="text-ops-night-text">{tempC}°C</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">HUMIDITY</span>
          <span className={humidity > 80 ? 'text-ops-warning' : 'text-ops-night-text'}>
            {humidity}%
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">CONDITION</span>
          <span className="text-ops-night-text uppercase">{condition}</span>
        </div>
        {note && (
          <div className="pt-2 border-t border-ops-night-border text-xs text-ops-warning">
            NOTE: {note.toUpperCase()}
          </div>
        )}
      </div>
    </DataTile>
  );
}

// Zone Count Tile
interface ZoneTileProps {
  zoneCount: number;
  anchorCount: number;
  activeZones: number;
  cityAccent?: CityAccent;
}

export function ZoneTile({
  zoneCount,
  anchorCount,
  activeZones,
  cityAccent = 'default',
}: ZoneTileProps) {
  return (
    <DataTile title="OPERATIONAL ZONES" cityAccent={cityAccent}>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">TOTAL ZONES</span>
          <span className="text-ops-neon-cyan">{zoneCount}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">ANCHORS</span>
          <span className="text-ops-night-text">{anchorCount}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-ops-night-muted text-xs">ACTIVE</span>
          <span className="text-ops-active">
            {activeZones}/{zoneCount}
          </span>
        </div>
      </div>
    </DataTile>
  );
}
