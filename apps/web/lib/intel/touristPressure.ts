import type { Zone } from '@unmapped/lib';

export type TouristPressureLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ZoneCompromiseStatus = 'CLEAR' | 'WATCH' | 'COMPROMISED';

export interface TouristPressureIndex {
  score: number; // 0-100
  status: ZoneCompromiseStatus;
  tourist_density: TouristPressureLevel;
  local_activity: TouristPressureLevel;
  reason: string;
  price_delta_pct: number | null;
  recommendation?: {
    distance_m: number;
    direction: string;
    target_zone_id: string;
    target_lat: number;
    target_lon: number;
    message: string;
  };
}

const TEXTURE_TOURIST_BIAS: Record<string, number> = {
  COMMERCIAL_DENSE: 0.9,
  TRANSIT_HUB: 0.85,
  CULTURAL: 0.8,
  WATERFRONT: 0.6,
  MIXED: 0.55,
  RESIDENTIAL: 0.25,
  INDUSTRIAL: 0.2,
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDegrees(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function bearingToCardinal(deg: number): string {
  const dirs = [
    'NORTH',
    'NORTHEAST',
    'EAST',
    'SOUTHEAST',
    'SOUTH',
    'SOUTHWEST',
    'WEST',
    'NORTHWEST',
  ];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

function getCityMedianCoffee(zones: Zone[]): number | null {
  const coffees = zones
    .map((z) => z.price_medians?.coffee)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return median(coffees);
}

function scoreFromIntelMarkers(zone: Zone): { anomaly: number; local: number } {
  const markers = zone.intel_markers || [];
  if (markers.length === 0) {
    return { anomaly: 0.2, local: 0.2 };
  }

  const total = markers.reduce((sum, m) => sum + (m.count || 0), 0) || 1;

  let anomaly = 0;
  let local = 0;

  for (const m of markers) {
    const c = (m.count || 0) / total;
    if (m.type === 'OVERPRICING' || m.type === 'HASSLE' || m.type === 'OFFLINE') {
      anomaly += c;
    }
    if (m.type === 'CLEAN') {
      local += c;
    }
  }

  // If we have markers but none are CLEAN, local signal should still be low, not zero.
  return {
    anomaly: clamp(anomaly + 0.05, 0, 1),
    local: clamp(local + 0.05, 0, 1),
  };
}

function labelFromRatio(r: number): TouristPressureLevel {
  if (r >= 0.7) return 'HIGH';
  if (r >= 0.4) return 'MEDIUM';
  return 'LOW';
}

export function computeTouristPressureIndex(zone: Zone, cityZones: Zone[]): TouristPressureIndex {
  const cityCoffeeMedian = getCityMedianCoffee(cityZones);
  const zoneCoffee =
    typeof zone.price_medians?.coffee === 'number' ? zone.price_medians.coffee : null;

  const priceDeltaPct =
    cityCoffeeMedian && zoneCoffee
      ? ((zoneCoffee - cityCoffeeMedian) / cityCoffeeMedian) * 100
      : null;

  const textureBias = TEXTURE_TOURIST_BIAS[zone.texture_type] ?? 0.55;

  const intelScores = scoreFromIntelMarkers(zone);
  const anomalyRate = intelScores.anomaly;
  const localSignal = intelScores.local;

  const offlinePenalty = zone.status === 'OFFLINE' ? 0.3 : 0;

  const pricePressure = priceDeltaPct === null ? 0.35 : clamp(priceDeltaPct / 30, 0, 1);
  const localDegraded = 1 - localSignal;

  // Weighted score: price delta + tourist bias + anomaly + low local activity.
  let score =
    100 *
    (0.45 * pricePressure +
      0.25 * textureBias +
      0.2 * anomalyRate +
      0.1 * localDegraded +
      offlinePenalty);

  score = clamp(score, 0, 100);

  const status: ZoneCompromiseStatus =
    score >= 70 || (priceDeltaPct !== null && priceDeltaPct >= 25)
      ? 'COMPROMISED'
      : score >= 40
        ? 'WATCH'
        : 'CLEAR';

  const tourist_density = labelFromRatio(clamp(0.6 * textureBias + 0.4 * anomalyRate, 0, 1));
  const local_activity = labelFromRatio(localSignal);

  let reason = 'LOCAL SIGNAL NORMAL';
  if (priceDeltaPct !== null && Math.abs(priceDeltaPct) >= 5) {
    const sign = priceDeltaPct >= 0 ? '+' : '';
    reason = `PRICE DELTA ${sign}${Math.round(priceDeltaPct)}%`;
  } else if (anomalyRate >= 0.55) {
    reason = 'ANOMALY RATE ELEVATED';
  } else if (localSignal <= 0.35) {
    reason = 'LOCAL ACTIVITY DEGRADED';
  }

  const result: TouristPressureIndex = {
    score: Math.round(score),
    status,
    tourist_density,
    local_activity,
    reason,
    price_delta_pct: priceDeltaPct === null ? null : Math.round(priceDeltaPct),
  };

  // Recommendation: nearest lower-pressure zone with normal-ish prices.
  const origin = { lat: zone.centroid.lat, lon: zone.centroid.lon };

  let best: {
    zone: Zone;
    tpi: TouristPressureIndex;
    distance_m: number;
    direction: string;
  } | null = null;

  for (const candidate of cityZones) {
    if (candidate.zone_id === zone.zone_id) continue;

    const candTpi = computeTouristPressureIndexShallow(candidate, cityZones, cityCoffeeMedian);
    if (candTpi.status === 'COMPROMISED') continue;

    const d = haversineMeters(origin, { lat: candidate.centroid.lat, lon: candidate.centroid.lon });

    // Prefer close and clearly better.
    const improvement = score - candTpi.score;
    if (improvement < 10) continue;

    if (!best || d < best.distance_m) {
      const dir = bearingToCardinal(
        bearingDegrees(origin, { lat: candidate.centroid.lat, lon: candidate.centroid.lon })
      );
      best = { zone: candidate, tpi: candTpi, distance_m: d, direction: dir };
    }
  }

  if (best) {
    const distance_m = Math.round(best.distance_m / 10) * 10;
    result.recommendation = {
      distance_m,
      direction: best.direction,
      target_zone_id: best.zone.zone_id,
      target_lat: best.zone.centroid.lat,
      target_lon: best.zone.centroid.lon,
      message: `EXTRACT ${distance_m}m ${best.direction} FOR NORMAL PRICES.`,
    };
  }

  return result;
}

// Same logic, but avoids recursion explosion by reusing cityCoffeeMedian and not generating nested recommendations.
function computeTouristPressureIndexShallow(
  zone: Zone,
  cityZones: Zone[],
  cityCoffeeMedian: number | null
): Omit<TouristPressureIndex, 'recommendation'> {
  const zoneCoffee =
    typeof zone.price_medians?.coffee === 'number' ? zone.price_medians.coffee : null;
  const priceDeltaPct =
    cityCoffeeMedian && zoneCoffee
      ? ((zoneCoffee - cityCoffeeMedian) / cityCoffeeMedian) * 100
      : null;

  const textureBias = TEXTURE_TOURIST_BIAS[zone.texture_type] ?? 0.55;
  const intelScores = scoreFromIntelMarkers(zone);
  const anomalyRate = intelScores.anomaly;
  const localSignal = intelScores.local;
  const offlinePenalty = zone.status === 'OFFLINE' ? 0.3 : 0;

  const pricePressure = priceDeltaPct === null ? 0.35 : clamp(priceDeltaPct / 30, 0, 1);
  const localDegraded = 1 - localSignal;

  let score =
    100 *
    (0.45 * pricePressure +
      0.25 * textureBias +
      0.2 * anomalyRate +
      0.1 * localDegraded +
      offlinePenalty);

  score = clamp(score, 0, 100);

  const status: ZoneCompromiseStatus =
    score >= 70 || (priceDeltaPct !== null && priceDeltaPct >= 25)
      ? 'COMPROMISED'
      : score >= 40
        ? 'WATCH'
        : 'CLEAR';

  const tourist_density = labelFromRatio(clamp(0.6 * textureBias + 0.4 * anomalyRate, 0, 1));
  const local_activity = labelFromRatio(localSignal);

  let reason = 'LOCAL SIGNAL NORMAL';
  if (priceDeltaPct !== null && Math.abs(priceDeltaPct) >= 5) {
    const sign = priceDeltaPct >= 0 ? '+' : '';
    reason = `PRICE DELTA ${sign}${Math.round(priceDeltaPct)}%`;
  } else if (anomalyRate >= 0.55) {
    reason = 'ANOMALY RATE ELEVATED';
  } else if (localSignal <= 0.35) {
    reason = 'LOCAL ACTIVITY DEGRADED';
  }

  return {
    score: Math.round(score),
    status,
    tourist_density,
    local_activity,
    reason,
    price_delta_pct: priceDeltaPct === null ? null : Math.round(priceDeltaPct),
  };
}
