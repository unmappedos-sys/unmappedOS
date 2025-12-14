/**
 * OSM Ingestion Pipeline v2
 * 
 * Deterministic extraction of structural data from OpenStreetMap.
 * This is the foundation of all city data - treated as SLOW-MOVING TRUTH.
 * 
 * Extracts:
 * - Roads & pedestrian infrastructure
 * - POIs (cafes, parks, markets, bars, etc.)
 * - Street lighting density
 * - Opening hours patterns
 * - Transit access
 * 
 * Generates:
 * - Fuzzy micro-zones (3-4 block areas)
 * - Initial texture classification
 * - Walkability & safety heuristics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LatLon, ZoneBaseline, TextureType } from './schema_v1';

// ============================================================================
// TYPES
// ============================================================================

export interface OSMNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OSMWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  center?: { lat: number; lon: number };
}

export interface OSMRelation {
  type: 'relation';
  id: number;
  members: Array<{ type: string; ref: number; role: string }>;
  tags?: Record<string, string>;
}

export type OSMElement = OSMNode | OSMWay | OSMRelation;

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: { timestamp_osm_base: string };
  elements: OSMElement[];
}

export interface POIData {
  id: string;
  osm_id: number;
  name: string;
  type: POIType;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  opening_hours?: string;
  has_lighting: boolean;
  wheelchair?: string;
  outdoor_seating?: boolean;
}

export type POIType = 
  | 'cafe' 
  | 'restaurant' 
  | 'bar' 
  | 'market' 
  | 'park' 
  | 'temple' 
  | 'museum'
  | 'transit_stop'
  | 'convenience'
  | 'pharmacy'
  | 'atm'
  | 'landmark'
  | 'plaza'
  | 'artwork'
  | 'fountain'
  | 'memorial'
  | 'other';

export interface StreetSegment {
  id: string;
  osm_id: number;
  name?: string;
  type: 'pedestrian' | 'residential' | 'primary' | 'secondary' | 'tertiary' | 'path' | 'footway';
  has_lighting: boolean;
  surface?: string;
  geometry: LatLon[];
}

export interface MicroZone {
  zone_id: string;
  center: LatLon;
  radius_m: number;
  polygon: LatLon[];
  pois: POIData[];
  streets: StreetSegment[];
  lighting_count: number;
}

export interface CityConfig {
  slug: string;
  name: string;
  country: string;
  country_code: string;
  bbox: { south: number; west: number; north: number; east: number };
  center: LatLon;
  timezone: string;
  currency: string;
  currency_symbol: string;
  language_codes: string[];
  zone_radius_m: number;        // Target zone radius
  zone_overlap_factor: number;  // How much zones can overlap
}

// ============================================================================
// CITY CONFIGURATIONS
// ============================================================================

export const CITY_CONFIGS: Record<string, CityConfig> = {
  bangkok: {
    slug: 'bangkok',
    name: 'Bangkok',
    country: 'Thailand',
    country_code: 'TH',
    bbox: { south: 13.65, west: 100.35, north: 13.95, east: 100.70 },
    center: { lat: 13.7563, lon: 100.5018 },
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    currency_symbol: '฿',
    language_codes: ['th', 'en'],
    zone_radius_m: 400,
    zone_overlap_factor: 0.2,
  },
  tokyo: {
    slug: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    country_code: 'JP',
    bbox: { south: 35.55, west: 139.55, north: 35.80, east: 139.90 },
    center: { lat: 35.6762, lon: 139.6503 },
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    currency_symbol: '¥',
    language_codes: ['ja', 'en'],
    zone_radius_m: 350,
    zone_overlap_factor: 0.15,
  },
  singapore: {
    slug: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    country_code: 'SG',
    bbox: { south: 1.22, west: 103.60, north: 1.47, east: 104.05 },
    center: { lat: 1.3521, lon: 103.8198 },
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    currency_symbol: 'S$',
    language_codes: ['en', 'zh', 'ms', 'ta'],
    zone_radius_m: 400,
    zone_overlap_factor: 0.2,
  },
  hongkong: {
    slug: 'hongkong',
    name: 'Hong Kong',
    country: 'Hong Kong',
    country_code: 'HK',
    bbox: { south: 22.15, west: 113.82, north: 22.56, east: 114.44 },
    center: { lat: 22.3193, lon: 114.1694 },
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    currency_symbol: 'HK$',
    language_codes: ['zh', 'en'],
    zone_radius_m: 350,
    zone_overlap_factor: 0.15,
  },
  seoul: {
    slug: 'seoul',
    name: 'Seoul',
    country: 'South Korea',
    country_code: 'KR',
    bbox: { south: 37.42, west: 126.76, north: 37.70, east: 127.18 },
    center: { lat: 37.5665, lon: 126.9780 },
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    currency_symbol: '₩',
    language_codes: ['ko', 'en'],
    zone_radius_m: 400,
    zone_overlap_factor: 0.2,
  },
  bali: {
    slug: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    country_code: 'ID',
    bbox: { south: -8.85, west: 114.40, north: -8.05, east: 115.70 },
    center: { lat: -8.4095, lon: 115.1889 },
    timezone: 'Asia/Makassar',
    currency: 'IDR',
    currency_symbol: 'Rp',
    language_codes: ['id', 'en'],
    zone_radius_m: 500,
    zone_overlap_factor: 0.25,
  },
  kualalumpur: {
    slug: 'kualalumpur',
    name: 'Kuala Lumpur',
    country: 'Malaysia',
    country_code: 'MY',
    bbox: { south: 3.03, west: 101.60, north: 3.25, east: 101.78 },
    center: { lat: 3.1390, lon: 101.6869 },
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    currency_symbol: 'RM',
    language_codes: ['ms', 'en', 'zh'],
    zone_radius_m: 400,
    zone_overlap_factor: 0.2,
  },
  hanoi: {
    slug: 'hanoi',
    name: 'Hanoi',
    country: 'Vietnam',
    country_code: 'VN',
    bbox: { south: 20.95, west: 105.70, north: 21.10, east: 105.92 },
    center: { lat: 21.0285, lon: 105.8542 },
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    currency_symbol: '₫',
    language_codes: ['vi', 'en'],
    zone_radius_m: 350,
    zone_overlap_factor: 0.2,
  },
  hochiminh: {
    slug: 'hochiminh',
    name: 'Ho Chi Minh City',
    country: 'Vietnam',
    country_code: 'VN',
    bbox: { south: 10.70, west: 106.55, north: 10.90, east: 106.80 },
    center: { lat: 10.8231, lon: 106.6297 },
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    currency_symbol: '₫',
    language_codes: ['vi', 'en'],
    zone_radius_m: 400,
    zone_overlap_factor: 0.2,
  },
  taipei: {
    slug: 'taipei',
    name: 'Taipei',
    country: 'Taiwan',
    country_code: 'TW',
    bbox: { south: 24.96, west: 121.45, north: 25.21, east: 121.66 },
    center: { lat: 25.0330, lon: 121.5654 },
    timezone: 'Asia/Taipei',
    currency: 'TWD',
    currency_symbol: 'NT$',
    language_codes: ['zh', 'en'],
    zone_radius_m: 350,
    zone_overlap_factor: 0.15,
  },
};

// ============================================================================
// OVERPASS API
// ============================================================================

const OVERPASS_ENDPOINT = process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';
const RATE_LIMIT_MS = parseInt(process.env.OVERPASS_RATE_LIMIT_MS || '2000', 10);

let lastRequestTime = 0;

async function queryOverpass(query: string): Promise<OverpassResponse> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  
  console.log(`[OSM] Querying Overpass API...`);
  
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json() as OverpassResponse;
  console.log(`[OSM] Received ${data.elements.length} elements`);
  
  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// OVERPASS QUERIES
// ============================================================================

function buildPOIQuery(bbox: CityConfig['bbox']): string {
  const { south, west, north, east } = bbox;
  
  return `
[out:json][timeout:180];
(
  // Cafes & Restaurants
  node["amenity"="cafe"](${south},${west},${north},${east});
  node["amenity"="restaurant"](${south},${west},${north},${east});
  node["amenity"="bar"](${south},${west},${north},${east});
  node["amenity"="pub"](${south},${west},${north},${east});
  node["amenity"="fast_food"](${south},${west},${north},${east});
  
  // Markets & Shopping
  node["shop"="convenience"](${south},${west},${north},${east});
  node["shop"="supermarket"](${south},${west},${north},${east});
  node["amenity"="marketplace"](${south},${west},${north},${east});
  way["amenity"="marketplace"](${south},${west},${north},${east});
  
  // Parks & Recreation
  node["leisure"="park"](${south},${west},${north},${east});
  way["leisure"="park"](${south},${west},${north},${east});
  node["leisure"="garden"](${south},${west},${north},${east});
  
  // Religious & Cultural
  node["amenity"="place_of_worship"](${south},${west},${north},${east});
  way["amenity"="place_of_worship"](${south},${west},${north},${east});
  node["tourism"="museum"](${south},${west},${north},${east});
  node["historic"](${south},${west},${north},${east});
  
  // Transit
  node["public_transport"="stop_position"](${south},${west},${north},${east});
  node["highway"="bus_stop"](${south},${west},${north},${east});
  node["railway"="station"](${south},${west},${north},${east});
  node["railway"="subway_entrance"](${south},${west},${north},${east});
  
  // Services
  node["amenity"="pharmacy"](${south},${west},${north},${east});
  node["amenity"="atm"](${south},${west},${north},${east});
  
  // Anchor candidates
  node["tourism"="artwork"](${south},${west},${north},${east});
  node["amenity"="fountain"](${south},${west},${north},${east});
  node["historic"="memorial"](${south},${west},${north},${east});
  node["historic"="monument"](${south},${west},${north},${east});
  node["place"="square"](${south},${west},${north},${east});
  way["place"="square"](${south},${west},${north},${east});
  way["highway"="pedestrian"]["area"="yes"](${south},${west},${north},${east});
);
out body center;
>;
out skel qt;
`;
}

function buildStreetQuery(bbox: CityConfig['bbox']): string {
  const { south, west, north, east } = bbox;
  
  return `
[out:json][timeout:180];
(
  // Pedestrian infrastructure
  way["highway"="pedestrian"](${south},${west},${north},${east});
  way["highway"="footway"](${south},${west},${north},${east});
  way["highway"="path"]["foot"="yes"](${south},${west},${north},${east});
  
  // Streets
  way["highway"="residential"](${south},${west},${north},${east});
  way["highway"="primary"](${south},${west},${north},${east});
  way["highway"="secondary"](${south},${west},${north},${east});
  way["highway"="tertiary"](${south},${west},${north},${east});
  
  // Street lighting
  node["highway"="street_lamp"](${south},${west},${north},${east});
);
out body geom;
`;
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

function extractPOIs(elements: OSMElement[]): POIData[] {
  const pois: POIData[] = [];
  
  for (const el of elements) {
    if (el.type !== 'node' && el.type !== 'way') continue;
    if (!el.tags) continue;
    
    const poi = classifyPOI(el);
    if (poi) pois.push(poi);
  }
  
  return pois;
}

function classifyPOI(el: OSMElement): POIData | null {
  const tags = el.tags || {};
  
  let type: POIType = 'other';
  let name = tags.name || '';
  
  // Classify by tags
  if (tags.amenity === 'cafe') type = 'cafe';
  else if (tags.amenity === 'restaurant' || tags.amenity === 'fast_food') type = 'restaurant';
  else if (tags.amenity === 'bar' || tags.amenity === 'pub') type = 'bar';
  else if (tags.amenity === 'marketplace' || tags.shop === 'supermarket') type = 'market';
  else if (tags.shop === 'convenience') type = 'convenience';
  else if (tags.leisure === 'park' || tags.leisure === 'garden') type = 'park';
  else if (tags.amenity === 'place_of_worship') type = 'temple';
  else if (tags.tourism === 'museum') type = 'museum';
  else if (tags.amenity === 'pharmacy') type = 'pharmacy';
  else if (tags.amenity === 'atm') type = 'atm';
  else if (tags.public_transport || tags.railway || tags.highway === 'bus_stop') type = 'transit_stop';
  else if (tags.historic) type = 'landmark';
  else if (tags.tourism === 'artwork') type = 'artwork';
  else if (tags.amenity === 'fountain') type = 'fountain';
  else if (tags.historic === 'memorial' || tags.historic === 'monument') type = 'memorial';
  else if (tags.place === 'square' || (tags.highway === 'pedestrian' && tags.area === 'yes')) type = 'plaza';
  else return null; // Skip unclassified
  
  // Get location
  let lat: number, lon: number;
  if (el.type === 'node') {
    lat = el.lat;
    lon = el.lon;
  } else if (el.type === 'way' && (el as OSMWay).center) {
    lat = (el as OSMWay).center!.lat;
    lon = (el as OSMWay).center!.lon;
  } else {
    return null;
  }
  
  return {
    id: `osm_${el.type}_${el.id}`,
    osm_id: el.id,
    name: name || `${type}_${el.id}`,
    type,
    lat,
    lon,
    tags,
    opening_hours: tags.opening_hours,
    has_lighting: tags.lit === 'yes',
    wheelchair: tags.wheelchair,
    outdoor_seating: tags.outdoor_seating === 'yes',
  };
}

function extractStreets(elements: OSMElement[]): StreetSegment[] {
  const streets: StreetSegment[] = [];
  
  for (const el of elements) {
    if (el.type !== 'way') continue;
    const way = el as OSMWay;
    if (!way.geometry || way.geometry.length < 2) continue;
    
    const tags = way.tags || {};
    const highway = tags.highway;
    
    if (!highway) continue;
    
    let type: StreetSegment['type'];
    switch (highway) {
      case 'pedestrian': type = 'pedestrian'; break;
      case 'footway': type = 'footway'; break;
      case 'path': type = 'path'; break;
      case 'residential': type = 'residential'; break;
      case 'primary': type = 'primary'; break;
      case 'secondary': type = 'secondary'; break;
      case 'tertiary': type = 'tertiary'; break;
      default: continue;
    }
    
    streets.push({
      id: `street_${way.id}`,
      osm_id: way.id,
      name: tags.name,
      type,
      has_lighting: tags.lit === 'yes',
      surface: tags.surface,
      geometry: way.geometry.map(g => ({ lat: g.lat, lon: g.lon })),
    });
  }
  
  return streets;
}

function countStreetLamps(elements: OSMElement[]): number {
  return elements.filter(el => 
    el.type === 'node' && 
    el.tags?.highway === 'street_lamp'
  ).length;
}

// ============================================================================
// ZONE GENERATION
// ============================================================================

function generateMicroZones(
  config: CityConfig,
  pois: POIData[],
  streets: StreetSegment[],
  lightingCount: number
): MicroZone[] {
  const zones: MicroZone[] = [];
  const { bbox, zone_radius_m, zone_overlap_factor, slug } = config;
  
  // Calculate grid dimensions
  const latDelta = metersToLatDelta(zone_radius_m * 2 * (1 - zone_overlap_factor));
  const lonDelta = metersToLonDelta(zone_radius_m * 2 * (1 - zone_overlap_factor), config.center.lat);
  
  let zoneIndex = 0;
  
  for (let lat = bbox.south + latDelta / 2; lat < bbox.north; lat += latDelta) {
    for (let lon = bbox.west + lonDelta / 2; lon < bbox.east; lon += lonDelta) {
      // Find POIs within zone radius
      const zonePois = pois.filter(poi => 
        haversineDistance({ lat, lon }, { lat: poi.lat, lon: poi.lon }) <= zone_radius_m
      );
      
      // Skip zones with very few POIs (likely water, industrial, etc.)
      if (zonePois.length < 3) continue;
      
      // Find streets within zone
      const zoneStreets = streets.filter(street => {
        const midpoint = street.geometry[Math.floor(street.geometry.length / 2)];
        return haversineDistance({ lat, lon }, midpoint) <= zone_radius_m * 1.5;
      });
      
      // Create simplified polygon (square for now)
      const polygon = createSquarePolygon({ lat, lon }, zone_radius_m);
      
      // Count lighting in zone (approximation)
      const areaKm2 = (zone_radius_m * zone_radius_m * Math.PI) / 1_000_000;
      const totalAreaKm2 = ((bbox.north - bbox.south) * 111) * ((bbox.east - bbox.west) * 111 * Math.cos(lat * Math.PI / 180));
      const zoneLightingCount = Math.round(lightingCount * (areaKm2 / totalAreaKm2));
      
      zoneIndex++;
      zones.push({
        zone_id: `${slug.toUpperCase()}_${String(zoneIndex).padStart(3, '0')}`,
        center: { lat, lon },
        radius_m: zone_radius_m,
        polygon,
        pois: zonePois,
        streets: zoneStreets,
        lighting_count: zoneLightingCount,
      });
    }
  }
  
  console.log(`[OSM] Generated ${zones.length} micro-zones`);
  return zones;
}

function createSquarePolygon(center: LatLon, radiusM: number): LatLon[] {
  const latDelta = metersToLatDelta(radiusM);
  const lonDelta = metersToLonDelta(radiusM, center.lat);
  
  return [
    { lat: center.lat - latDelta, lon: center.lon - lonDelta },
    { lat: center.lat - latDelta, lon: center.lon + lonDelta },
    { lat: center.lat + latDelta, lon: center.lon + lonDelta },
    { lat: center.lat + latDelta, lon: center.lon - lonDelta },
    { lat: center.lat - latDelta, lon: center.lon - lonDelta }, // Close polygon
  ];
}

// ============================================================================
// TEXTURE CLASSIFICATION
// ============================================================================

export function classifyZoneTexture(zone: MicroZone): { primary: TextureType; secondary?: TextureType; tags: string[] } {
  const pois = zone.pois;
  const total = pois.length || 1;
  
  // Count POI types
  const counts: Record<string, number> = {};
  pois.forEach(poi => {
    counts[poi.type] = (counts[poi.type] || 0) + 1;
  });
  
  // Calculate ratios
  const cafeRatio = (counts.cafe || 0) / total;
  const restaurantRatio = (counts.restaurant || 0) / total;
  const barRatio = (counts.bar || 0) / total;
  const marketRatio = ((counts.market || 0) + (counts.convenience || 0)) / total;
  const templeRatio = (counts.temple || 0) / total;
  const parkRatio = (counts.park || 0) / total;
  const transitRatio = (counts.transit_stop || 0) / total;
  
  // Determine texture
  let primary: TextureType = 'MIXED';
  let secondary: TextureType | undefined;
  const tags: string[] = [];
  
  // Check for dominant patterns
  if (barRatio > 0.25 || (barRatio > 0.15 && restaurantRatio > 0.2)) {
    primary = 'NEON';
    tags.push('nightlife', 'bars', 'late-night');
    if (marketRatio > 0.1) secondary = 'CHAOS';
  } else if (marketRatio > 0.3 || (cafeRatio + restaurantRatio > 0.4 && zone.pois.length > 15)) {
    primary = 'CHAOS';
    tags.push('busy', 'markets', 'crowded');
    if (cafeRatio > 0.15) secondary = 'ANALOG';
  } else if (cafeRatio > 0.2 || restaurantRatio > 0.3) {
    primary = 'ANALOG';
    tags.push('cafes', 'local', 'relaxed');
    if (barRatio > 0.1) secondary = 'NEON';
  } else if (templeRatio > 0.1 || parkRatio > 0.2) {
    primary = 'SILENCE';
    tags.push('peaceful', 'quiet', 'nature');
  } else if (zone.pois.length < 8) {
    primary = 'SILENCE';
    tags.push('residential', 'quiet');
  } else {
    primary = 'MIXED';
    tags.push('diverse', 'varied');
  }
  
  // Add transit tag if high
  if (transitRatio > 0.1) tags.push('well-connected');
  
  return { primary, secondary, tags };
}

// ============================================================================
// BASELINE METRICS
// ============================================================================

export function calculateZoneBaseline(zone: MicroZone, _config: CityConfig): ZoneBaseline {
  const areaKm2 = (zone.radius_m * zone.radius_m * Math.PI) / 1_000_000;
  
  // POI metrics
  const poiCount = zone.pois.length;
  const poiDensity = poiCount / areaKm2;
  
  // Lighting density (0-1)
  const expectedLighting = areaKm2 * 50; // ~50 lamps per km² as baseline
  const lightingDensity = Math.min(1, zone.lighting_count / expectedLighting);
  
  // Pedestrian score (based on pedestrian-friendly streets)
  const pedStreets = zone.streets.filter(s => 
    s.type === 'pedestrian' || s.type === 'footway' || s.type === 'path'
  );
  const totalStreets = zone.streets.length || 1;
  const pedestrianScore = Math.min(100, Math.round((pedStreets.length / totalStreets) * 100 + poiDensity));
  
  // Transit access (based on transit stops)
  const transitPois = zone.pois.filter(p => p.type === 'transit_stop');
  const transitAccess = Math.min(100, transitPois.length * 20);
  
  // Walkability composite
  const walkability = Math.round(
    pedestrianScore * 0.4 +
    lightingDensity * 30 +
    Math.min(30, poiDensity / 2)
  );
  
  // Safety heuristic (lighting + pedestrian activity + transit)
  const safetyHeuristic = Math.round(
    lightingDensity * 40 +
    (pedestrianScore > 50 ? 30 : 15) +
    (transitAccess > 50 ? 20 : 10) +
    (poiCount > 10 ? 10 : 5)
  );
  
  return {
    poi_count: poiCount,
    poi_density: Math.round(poiDensity * 10) / 10,
    lighting_density: Math.round(lightingDensity * 100) / 100,
    pedestrian_score: Math.min(100, pedestrianScore),
    transit_access: transitAccess,
    walkability: Math.min(100, walkability),
    safety_heuristic: Math.min(100, safetyHeuristic),
    extracted_at: new Date().toISOString(),
  };
}

// ============================================================================
// GEO UTILITIES
// ============================================================================

function haversineDistance(a: LatLon, b: LatLon): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  
  return R * c;
}

function metersToLatDelta(meters: number): number {
  return meters / 111000; // ~111km per degree latitude
}

function metersToLonDelta(meters: number, latitude: number): number {
  return meters / (111000 * Math.cos(latitude * Math.PI / 180));
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export interface OSMIngestResult {
  config: CityConfig;
  pois: POIData[];
  streets: StreetSegment[];
  lightingCount: number;
  zones: MicroZone[];
  osmTimestamp: string;
  extractedAt: string;
}

export async function ingestCityOSM(citySlug: string): Promise<OSMIngestResult> {
  const config = CITY_CONFIGS[citySlug];
  if (!config) {
    throw new Error(`Unknown city: ${citySlug}. Available: ${Object.keys(CITY_CONFIGS).join(', ')}`);
  }
  
  console.log(`\n========================================`);
  console.log(`[OSM] Ingesting ${config.name}, ${config.country}`);
  console.log(`[OSM] Bounding box: ${JSON.stringify(config.bbox)}`);
  console.log(`========================================\n`);
  
  // Query POIs
  console.log('[OSM] Fetching POIs...');
  const poiQuery = buildPOIQuery(config.bbox);
  const poiResponse = await queryOverpass(poiQuery);
  const pois = extractPOIs(poiResponse.elements);
  console.log(`[OSM] Extracted ${pois.length} POIs`);
  
  // Query streets
  console.log('[OSM] Fetching streets and lighting...');
  const streetQuery = buildStreetQuery(config.bbox);
  const streetResponse = await queryOverpass(streetQuery);
  const streets = extractStreets(streetResponse.elements);
  const lightingCount = countStreetLamps(streetResponse.elements);
  console.log(`[OSM] Extracted ${streets.length} street segments, ${lightingCount} street lamps`);
  
  // Generate zones
  console.log('[OSM] Generating micro-zones...');
  const zones = generateMicroZones(config, pois, streets, lightingCount);
  
  // Get OSM timestamp
  const osmTimestamp = poiResponse.osm3s?.timestamp_osm_base || new Date().toISOString();
  
  return {
    config,
    pois,
    streets,
    lightingCount,
    zones,
    osmTimestamp,
    extractedAt: new Date().toISOString(),
  };
}

// ============================================================================
// CLI RUNNER
// ============================================================================

async function main() {
  const citySlug = process.argv[2];
  
  if (!citySlug) {
    console.log('Available cities:', Object.keys(CITY_CONFIGS).join(', '));
    console.log('Usage: npx ts-node osm_ingest_v2.ts <city_slug>');
    process.exit(1);
  }
  
  try {
    const result = await ingestCityOSM(citySlug);
    
    // Save raw output
    const outputDir = path.join(__dirname, '../../data/osm-raw');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${citySlug}_osm.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`\n[OSM] Output saved to ${outputPath}`);
    console.log(`[OSM] Summary:`);
    console.log(`  - POIs: ${result.pois.length}`);
    console.log(`  - Streets: ${result.streets.length}`);
    console.log(`  - Zones: ${result.zones.length}`);
    console.log(`  - OSM Timestamp: ${result.osmTimestamp}`);
    
  } catch (error) {
    console.error('[OSM] Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
