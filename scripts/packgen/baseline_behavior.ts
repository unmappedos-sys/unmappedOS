/**
 * Behavioral Baseline Computation
 * 
 * Computes expected behavioral patterns for each zone WITHOUT scraping.
 * Based entirely on OSM structural data and heuristics.
 * 
 * COMPUTES:
 * - Expected quiet hours
 * - Expected vitality hours  
 * - Expected safety windows
 * - Crowd patterns (weekday vs weekend)
 * 
 * DERIVED FROM:
 * - opening_hours density
 * - cafe vs bar ratios
 * - POI density patterns
 * - park/temple proximity
 * - pedestrian infrastructure
 */

import type { ZoneBehavior, TimeWindow, TextureType } from './schema_v1';
import type { MicroZone, POIData } from './osm_ingest_v2';

// ============================================================================
// TYPES
// ============================================================================

export interface OpeningHoursPattern {
  open_early: number;     // POIs opening before 8am
  open_morning: number;   // POIs opening 8-11am
  open_afternoon: number; // POIs opening 11am-5pm
  open_evening: number;   // POIs opening 5-9pm
  open_late: number;      // POIs opening after 9pm
  close_early: number;    // POIs closing before 6pm
  close_evening: number;  // POIs closing 6-10pm
  close_late: number;     // POIs closing after 10pm
  has_24h: boolean;       // Any 24h POIs
}

export interface POIRatios {
  cafes: number;
  restaurants: number;
  bars: number;
  markets: number;
  temples: number;
  parks: number;
  transit: number;
  services: number;
}

// ============================================================================
// OPENING HOURS PARSING
// ============================================================================

function parseOpeningHours(pois: POIData[]): OpeningHoursPattern {
  const pattern: OpeningHoursPattern = {
    open_early: 0,
    open_morning: 0,
    open_afternoon: 0,
    open_evening: 0,
    open_late: 0,
    close_early: 0,
    close_evening: 0,
    close_late: 0,
    has_24h: false,
  };
  
  for (const poi of pois) {
    if (!poi.opening_hours) continue;
    
    const hours = poi.opening_hours.toLowerCase();
    
    // Check for 24/7
    if (hours.includes('24/7') || hours.includes('24 hours')) {
      pattern.has_24h = true;
      pattern.open_early++;
      pattern.close_late++;
      parseable++;
      continue;
    }
    
    // Simple time extraction (heuristic)
    const timeMatch = hours.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      const openHour = parseInt(timeMatch[1]);
      const closeHour = parseInt(timeMatch[3]);
      
      if (openHour < 8) pattern.open_early++;
      else if (openHour < 11) pattern.open_morning++;
      else if (openHour < 17) pattern.open_afternoon++;
      else if (openHour < 21) pattern.open_evening++;
      else pattern.open_late++;
      
      if (closeHour < 18 || (closeHour === 18 && !timeMatch[4])) pattern.close_early++;
      else if (closeHour < 22) pattern.close_evening++;
      else pattern.close_late++;
      
      parseable++;
    }
  }
  
  return pattern;
}

function calculatePOIRatios(pois: POIData[]): POIRatios {
  const total = pois.length || 1;
  
  const counts = {
    cafe: 0,
    restaurant: 0,
    bar: 0,
    market: 0,
    convenience: 0,
    temple: 0,
    park: 0,
    transit_stop: 0,
    pharmacy: 0,
    atm: 0,
  };
  
  for (const poi of pois) {
    if (poi.type in counts) {
      counts[poi.type as keyof typeof counts]++;
    }
  }
  
  return {
    cafes: counts.cafe / total,
    restaurants: counts.restaurant / total,
    bars: counts.bar / total,
    markets: (counts.market + counts.convenience) / total,
    temples: counts.temple / total,
    parks: counts.park / total,
    transit: counts.transit_stop / total,
    services: (counts.pharmacy + counts.atm) / total,
  };
}

// ============================================================================
// BEHAVIORAL COMPUTATION
// ============================================================================

export function computeZoneBehavior(zone: MicroZone, texture: TextureType): ZoneBehavior {
  const openingPattern = parseOpeningHours(zone.pois);
  const ratios = calculatePOIRatios(zone.pois);
  
  // Compute quiet hours
  const quietHours = computeQuietHours(texture, ratios, openingPattern);
  
  // Compute vitality hours
  const vitalityHours = computeVitalityHours(texture, ratios, openingPattern);
  
  // Compute safety windows
  const safetyWindows = computeSafetyWindows(texture, ratios, zone);
  
  // Compute crowd patterns
  const crowdPattern = computeCrowdPattern(texture, ratios);
  
  return {
    quiet_hours: quietHours,
    vitality_hours: vitalityHours,
    safety_windows: safetyWindows,
    crowd_pattern: crowdPattern,
  };
}

function computeQuietHours(
  texture: TextureType,
  ratios: POIRatios,
  pattern: OpeningHoursPattern
): TimeWindow[] {
  const windows: TimeWindow[] = [];
  
  // Universal quiet period
  windows.push({ start: '02:00', end: '06:00' });
  
  switch (texture) {
    case 'SILENCE':
      // Quiet residential/park areas - quiet most of the day
      windows.push({ start: '10:00', end: '16:00' });
      windows.push({ start: '20:00', end: '23:00' });
      break;
      
    case 'ANALOG':
      // Cafe/local areas - quiet in early morning and late evening
      windows.push({ start: '06:00', end: '08:00' });
      if (ratios.bars < 0.1) {
        windows.push({ start: '21:00', end: '23:00' });
      }
      break;
      
    case 'NEON':
      // Nightlife - quiet during the day
      windows.push({ start: '08:00', end: '17:00' });
      break;
      
    case 'CHAOS':
      // Markets/busy areas - quiet at night if no nightlife
      if (ratios.bars < 0.15) {
        windows.push({ start: '22:00', end: '06:00' });
      }
      break;
      
    case 'MIXED':
    default:
      // Variable - estimate based on closing patterns
      if (pattern.close_early > pattern.close_late) {
        windows.push({ start: '21:00', end: '06:00' });
      }
      break;
  }
  
  return windows;
}

function computeVitalityHours(
  texture: TextureType,
  ratios: POIRatios,
  pattern: OpeningHoursPattern
): TimeWindow[] {
  const windows: TimeWindow[] = [];
  
  switch (texture) {
    case 'SILENCE':
      // Parks/temples - morning and late afternoon
      windows.push({ start: '07:00', end: '09:00' });
      windows.push({ start: '16:00', end: '18:00' });
      break;
      
    case 'ANALOG':
      // Cafes - breakfast and lunch, plus evening
      windows.push({ start: '08:00', end: '11:00' });
      windows.push({ start: '12:00', end: '14:00' });
      if (ratios.restaurants > 0.15) {
        windows.push({ start: '18:00', end: '21:00' });
      }
      break;
      
    case 'NEON':
      // Nightlife - evening and night
      windows.push({ start: '19:00', end: '23:59' });
      if (pattern.has_24h || pattern.close_late > 5) {
        windows.push({ start: '00:00', end: '03:00' });
      }
      break;
      
    case 'CHAOS':
      // Markets - daytime peak
      windows.push({ start: '09:00', end: '12:00' });
      windows.push({ start: '17:00', end: '20:00' });
      break;
      
    case 'MIXED':
    default:
      // Default business hours
      windows.push({ start: '09:00', end: '12:00' });
      windows.push({ start: '17:00', end: '20:00' });
      break;
  }
  
  return windows;
}

function computeSafetyWindows(
  texture: TextureType,
  ratios: POIRatios,
  zone: MicroZone
): TimeWindow[] {
  const windows: TimeWindow[] = [];
  
  // Base: daylight hours are generally safe
  windows.push({ start: '07:00', end: '19:00' });
  
  // Extend based on lighting and activity
  const hasGoodLighting = zone.lighting_count > 5;
  const hasNightActivity = ratios.bars > 0.1 || ratios.restaurants > 0.2;
  const hasTransit = ratios.transit > 0.05;
  
  if (hasGoodLighting && hasNightActivity) {
    windows.push({ start: '19:00', end: '23:00' });
  } else if (hasGoodLighting || hasTransit) {
    windows.push({ start: '19:00', end: '21:00' });
  }
  
  // SILENCE zones may be less safe at night (deserted)
  if (texture === 'SILENCE' && !hasGoodLighting) {
    // Remove evening extension if added
    return [{ start: '07:00', end: '18:00' }];
  }
  
  // NEON zones are active late
  if (texture === 'NEON') {
    windows.push({ start: '19:00', end: '02:00' });
  }
  
  return consolidateWindows(windows);
}

function computeCrowdPattern(
  texture: TextureType,
  ratios: POIRatios
): ZoneBehavior['crowd_pattern'] {
  let weekday: 'LOW' | 'MEDIUM' | 'HIGH' | 'VARIABLE' = 'MEDIUM';
  let weekend: 'LOW' | 'MEDIUM' | 'HIGH' | 'VARIABLE' = 'MEDIUM';
  let notes: string | undefined;
  
  switch (texture) {
    case 'SILENCE':
      weekday = 'LOW';
      weekend = ratios.parks > 0.1 ? 'MEDIUM' : 'LOW';
      notes = ratios.parks > 0.1 ? 'Weekend joggers/families in parks' : undefined;
      break;
      
    case 'ANALOG':
      weekday = ratios.cafes > 0.2 ? 'MEDIUM' : 'LOW';
      weekend = 'MEDIUM';
      notes = 'Popular brunch spots on weekends';
      break;
      
    case 'NEON':
      weekday = 'MEDIUM';
      weekend = 'HIGH';
      notes = 'Busiest Thu-Sat nights';
      break;
      
    case 'CHAOS':
      weekday = 'HIGH';
      weekend = 'HIGH';
      notes = 'Consistently busy, markets peak on weekends';
      break;
      
    case 'MIXED':
    default:
      weekday = 'VARIABLE';
      weekend = 'VARIABLE';
      notes = 'Varies by specific area';
      break;
  }
  
  return { weekday, weekend, notes };
}

// ============================================================================
// UTILITIES
// ============================================================================

function consolidateWindows(windows: TimeWindow[]): TimeWindow[] {
  if (windows.length <= 1) return windows;
  
  // Sort by start time
  const sorted = [...windows].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.start);
    const bStart = parseTimeToMinutes(b.start);
    return aStart - bStart;
  });
  
  const consolidated: TimeWindow[] = [];
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const currentEnd = parseTimeToMinutes(current.end);
    const nextStart = parseTimeToMinutes(next.start);
    
    // If windows overlap or are adjacent, merge them
    if (nextStart <= currentEnd + 60) { // 60 min tolerance
      current = {
        start: current.start,
        end: parseTimeToMinutes(next.end) > currentEnd ? next.end : current.end,
      };
    } else {
      consolidated.push(current);
      current = next;
    }
  }
  consolidated.push(current);
  
  return consolidated;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export interface BehaviorBatchResult {
  behaviors: Map<string, ZoneBehavior>;
  stats: {
    zones_processed: number;
    average_vitality_hours: number;
    zones_with_night_safety: number;
    high_weekend_crowd: number;
  };
}

export function computeBehaviorsForCity(
  zones: MicroZone[],
  textures: Map<string, TextureType>
): BehaviorBatchResult {
  const behaviors = new Map<string, ZoneBehavior>();
  let totalVitalityHours = 0;
  let nightSafeZones = 0;
  let highWeekendZones = 0;
  
  console.log(`[BEHAVIOR] Computing baselines for ${zones.length} zones...`);
  
  for (const zone of zones) {
    const texture = textures.get(zone.zone_id) || 'MIXED';
    const behavior = computeZoneBehavior(zone, texture);
    behaviors.set(zone.zone_id, behavior);
    
    // Stats
    totalVitalityHours += behavior.vitality_hours.reduce((sum, w) => {
      return sum + (parseTimeToMinutes(w.end) - parseTimeToMinutes(w.start)) / 60;
    }, 0);
    
    if (behavior.safety_windows.some(w => parseTimeToMinutes(w.end) >= 21 * 60)) {
      nightSafeZones++;
    }
    
    if (behavior.crowd_pattern.weekend === 'HIGH') {
      highWeekendZones++;
    }
  }
  
  const stats = {
    zones_processed: zones.length,
    average_vitality_hours: Math.round(totalVitalityHours / zones.length * 10) / 10,
    zones_with_night_safety: nightSafeZones,
    high_weekend_crowd: highWeekendZones,
  };
  
  console.log(`[BEHAVIOR] Results:`);
  console.log(`  - Avg vitality hours: ${stats.average_vitality_hours}h`);
  console.log(`  - Night-safe zones: ${stats.zones_with_night_safety}`);
  console.log(`  - High weekend crowd: ${stats.high_weekend_crowd}`);
  
  return { behaviors, stats };
}
