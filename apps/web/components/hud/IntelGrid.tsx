import { ReactNode } from 'react';
import { CityAccent, CITY_COLORS } from './types';
import {
  ThreatTile,
  EconomicsTile,
  ConnectivityTile,
  AtmosphericsTile,
  ZoneTile,
} from './DataTile';

interface IntelGridProps {
  cityAccent?: CityAccent;
  threat?: {
    level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    index: number;
    primaryRisk: string;
    sector?: string;
  };
  economics?: {
    localPrice: number;
    touristPrice: number;
    currency: string;
    item: string;
  };
  connectivity?: {
    avgWifiMbps: number;
    esimProviders: string[];
  };
  atmospherics?: {
    tempC: number;
    humidity: number;
    condition: string;
    note?: string;
  };
  zones?: {
    zoneCount: number;
    anchorCount: number;
    activeZones: number;
  };
  customTiles?: ReactNode[];
  className?: string;
}

/**
 * IntelGrid: Dense intelligence bento layout
 *
 * Purpose: Maximum intel density with zero fluff
 * Layout: 2×2 or 3×2 grid with sharp borders
 * No photos, no gradients - pure tactical data
 */
export default function IntelGrid({
  cityAccent = 'default',
  threat,
  economics,
  connectivity,
  atmospherics,
  zones,
  customTiles = [],
  className = '',
}: IntelGridProps) {
  const colors = CITY_COLORS[cityAccent];

  const tiles: ReactNode[] = [];

  // Add standard tiles if data provided
  if (threat) {
    tiles.push(
      <ThreatTile
        key="threat"
        level={threat.level}
        index={threat.index}
        primaryRisk={threat.primaryRisk}
        sector={threat.sector}
        cityAccent={cityAccent}
      />
    );
  }

  if (economics) {
    tiles.push(
      <EconomicsTile
        key="economics"
        localPrice={economics.localPrice}
        touristPrice={economics.touristPrice}
        currency={economics.currency}
        item={economics.item}
        cityAccent={cityAccent}
      />
    );
  }

  if (connectivity) {
    tiles.push(
      <ConnectivityTile
        key="connectivity"
        avgWifiMbps={connectivity.avgWifiMbps}
        esimProviders={connectivity.esimProviders}
        cityAccent={cityAccent}
      />
    );
  }

  if (atmospherics) {
    tiles.push(
      <AtmosphericsTile
        key="atmospherics"
        tempC={atmospherics.tempC}
        humidity={atmospherics.humidity}
        condition={atmospherics.condition}
        note={atmospherics.note}
        cityAccent={cityAccent}
      />
    );
  }

  if (zones) {
    tiles.push(
      <ZoneTile
        key="zones"
        zoneCount={zones.zoneCount}
        anchorCount={zones.anchorCount}
        activeZones={zones.activeZones}
        cityAccent={cityAccent}
      />
    );
  }

  // Add custom tiles
  tiles.push(...customTiles);

  // Determine grid layout based on tile count
  const gridCols =
    tiles.length <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : tiles.length <= 4
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`relative ${className}`}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: colors.primary, boxShadow: `0 0 8px ${colors.glow}` }}
        />
        <h2
          className="font-mono text-xs tracking-[0.3em] uppercase"
          style={{ color: colors.primary }}
        >
          INTEL GRID
        </h2>
        <div className="flex-1 h-px" style={{ backgroundColor: `${colors.primary}30` }} />
      </div>

      {/* Grid */}
      <div className={`grid ${gridCols} gap-3 md:gap-4`}>{tiles}</div>

      {/* Bottom classification line */}
      <div
        className="mt-4 pt-3 border-t flex items-center justify-between font-mono text-[10px] tracking-wider"
        style={{ borderColor: `${colors.primary}20` }}
      >
        <span style={{ color: `${colors.primary}60` }}>CLASSIFICATION: FIELD INTEL</span>
        <span style={{ color: `${colors.primary}40` }}>◇ VERIFIED SOURCES ONLY</span>
      </div>
    </div>
  );
}
