/**
 * UNMAPPED OS - Tactical Map Types
 *
 * Type definitions for the Field Operations Interface
 */

export type OpsMode = 'DAY' | 'NIGHT' | 'OFFLINE';
export type GPSStatus = 'ACTIVE' | 'SNAPSHOT' | 'DISABLED' | 'DEGRADED';
export type SyncStatus = 'ONLINE' | 'OFFLINE' | 'BLACK_BOX';
export type ZoneTexture = 'SILENCE' | 'ANALOG' | 'NEON' | 'CHAOS' | 'TRANSIT_HUB' | 'UNKNOWN';

export interface Position {
  lat: number;
  lon: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

export interface TacticalZone {
  id: string;
  name: string;
  texture: ZoneTexture;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'DEGRADED';
  lastVerified: string | null;
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE';
  neonColor: string;
  centroid: { lat: number; lon: number };
  polygon: GeoJSON.Polygon;
  anchor?: TacticalAnchor;
  metrics: {
    footTraffic: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    priceBaseline: 'STABLE' | 'ELEVATED' | 'VOLATILE';
    safetyRating: number; // 0-100
  };
}

export interface TacticalAnchor {
  id: string;
  position: { lat: number; lon: number };
  distanceMeters: number;
  bearing?: number;
}

export interface SafeCorridor {
  id: string;
  path: [number, number][];
  type: 'NIGHT_SAFE' | 'EXTRACTION' | 'TRANSIT';
  confidence: number;
}

export interface TouristPressureAlert {
  active: boolean;
  level: 'MODERATE' | 'HIGH' | 'CRITICAL';
  direction: string;
  distanceMeters: number;
  message: string;
}

export interface CrisisConfig {
  police: string;
  ambulance: string;
  embassy?: string;
  hospital?: { name: string; address: string };
  safePhrases: Array<{
    id: string;
    local: string;
    english: string;
    context: string;
  }>;
}

export interface HUDState {
  city: string;
  cityCode: string;
  opsMode: OpsMode;
  gpsStatus: GPSStatus;
  syncStatus: SyncStatus;
  batteryLevel?: number;
  localTime: string;
}

// Zone color palette by texture
export const ZONE_COLORS: Record<ZoneTexture, { fill: string; stroke: string; glow: string }> = {
  SILENCE: { fill: 'rgba(99, 102, 241, 0.15)', stroke: '#6366f1', glow: '#818cf8' },
  ANALOG: { fill: 'rgba(20, 184, 166, 0.15)', stroke: '#14b8a6', glow: '#2dd4bf' },
  NEON: { fill: 'rgba(236, 72, 153, 0.15)', stroke: '#ec4899', glow: '#f472b6' },
  CHAOS: { fill: 'rgba(239, 68, 68, 0.12)', stroke: '#ef4444', glow: '#f87171' },
  TRANSIT_HUB: { fill: 'rgba(251, 191, 36, 0.12)', stroke: '#fbbf24', glow: '#fcd34d' },
  UNKNOWN: { fill: 'rgba(107, 114, 128, 0.08)', stroke: '#6b7280', glow: '#9ca3af' },
};

// Day ops colors - high contrast
export const ZONE_COLORS_DAY: Record<ZoneTexture, { fill: string; stroke: string }> = {
  SILENCE: { fill: 'rgba(30, 58, 138, 0.25)', stroke: '#1e3a8a' },
  ANALOG: { fill: 'rgba(6, 95, 70, 0.25)', stroke: '#065f46' },
  NEON: { fill: 'rgba(157, 23, 77, 0.25)', stroke: '#9d174d' },
  CHAOS: { fill: 'rgba(153, 27, 27, 0.25)', stroke: '#991b1b' },
  TRANSIT_HUB: { fill: 'rgba(146, 64, 14, 0.25)', stroke: '#92400e' },
  UNKNOWN: { fill: 'rgba(75, 85, 99, 0.15)', stroke: '#4b5563' },
};
