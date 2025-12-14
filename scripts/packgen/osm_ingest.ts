/**
 * OSM Ingestion Pipeline
 * 
 * Extracts structural baseline from OpenStreetMap via Overpass API.
 * This is treated as SLOW-MOVING TRUTH, not real-time data.
 * 
 * Extracts:
 * - Roads & pedestrian zones
 * - POIs (cafes, parks, markets, bars, restaurants)
 * - Street lighting
 * - Opening hours
 * - Public transport stops
 */

import * as fs from 'fs';
import * as path from 'path';

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
  elements: OSMElement[];
}

export interface POIData {
  id: string;
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
  | 'hotel'
  | 'landmark'
  | 'other';

export interface StreetSegment {
  id: string;
  name?: string;
  type: 'pedestrian' | 'residential' | 'primary' | 'secondary' | 'path' | 'footway';
  has_lighting: boolean;
  surface?: string;
  geometry: Array<{ lat: number; lon: number }>;
}

export interface ZoneBaseline {
  zone_id: string;
  center: { lat: number; lon: number };
  radius_m: number;
  pois: POIData[];
  streets: StreetSegment[];
  lighting_density: number; // 0-1, percentage of lit streets
  pedestrian_score: number; // 0-100
  poi_density: number; // POIs per km²
  transit_access: number; // 0-100
  extracted_at: string;
  osm_timestamp: string;
}

// ============================================================================
// OVERPASS QUERIES
// ============================================================================

const OVERPASS_ENDPOINT = process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';
const RATE_LIMIT_MS = parseInt(process.env.OVERPASS_RATE_LIMIT_MS || '2000', 10);

/**
 * Build Overpass query for POIs in a bounding box
 */
function buildPOIQuery(bbox: { south: number; west: number; north: number; east: number }): string {
  const { south, west, north, east } = bbox;
  
  return `
[out:json][timeout:90];
(
  // Cafes & Restaurants
  node["amenity"="cafe"](${south},${west},${north},${east});
  node["amenity"="restaurant"](${south},${west},${north},${east});
  node["amenity"="bar"](${south},${west},${north},${east});
  node["amenity"="pub"](${south},${west},${north},${east});
  
  // Markets & Shopping
  node["shop"="convenience"](${south},${west},${north},${east});
  node["shop"="supermarket"](${south},${west},${north},${east});
  node["amenity"="marketplace"](${south},${west},${north},${east});
  
  // Parks & Recreation
  node["leisure"="park"](${south},${west},${north},${east});
  way["leisure"="park"](${south},${west},${north},${east});
  node["leisure"="garden"](${south},${west},${north},${east});
  
  // Religious & Cultural
  node["amenity"="place_of_worship"](${south},${west},${north},${east});
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
  node["amenity"="bank"](${south},${west},${north},${east});
  node["tourism"="hotel"](${south},${west},${north},${east});
  node["tourism"="guest_house"](${south},${west},${north},${east});
);
out body;
>;
out skel qt;
`;
}

/**
 * Build Overpass query for streets and lighting
 */
function buildStreetQuery(bbox: { south: number; west: number; north: number; east: number }): string {
  const { south, west, north, east } = bbox;
  
  return `
[out:json][timeout:90];
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
// API FUNCTIONS
// ============================================================================

let lastRequestTime = 0;

async function queryOverpass(query: string): Promise<OverpassResponse> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// DATA PROCESSING
// ============================================================================

function classifyPOIType(tags: Record<string, string>): POIType {
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar';
  if (tags.amenity === 'marketplace' || tags.shop === 'supermarket') return 'market';
  if (tags.shop === 'convenience') return 'convenience';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.amenity === 'place_of_worship') return 'temple';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.public_transport || tags.highway === 'bus_stop' || tags.railway) return 'transit_stop';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'atm' || tags.amenity === 'bank') return 'atm';
  if (tags.tourism === 'hotel' || tags.tourism === 'guest_house') return 'hotel';
  if (tags.historic || tags.tourism === 'attraction') return 'landmark';
  return 'other';
}

function processNodes(elements: OSMElement[]): POIData[] {
  return elements
    .filter((el): el is OSMNode => el.type === 'node' && !!el.tags)
    .filter(node => {
      const tags = node.tags!;
      return tags.amenity || tags.shop || tags.leisure || tags.tourism || 
             tags.public_transport || tags.highway === 'bus_stop' || tags.railway;
    })
    .map(node => {
      const tags = node.tags!;
      return {
        id: `osm_node_${node.id}`,
        name: tags.name || tags['name:en'] || 'Unnamed',
        type: classifyPOIType(tags),
        lat: node.lat,
        lon: node.lon,
        tags,
        opening_hours: tags.opening_hours,
        has_lighting: tags.lit === 'yes',
        wheelchair: tags.wheelchair,
        outdoor_seating: tags.outdoor_seating === 'yes',
      };
    });
}

function processStreets(elements: OSMElement[]): { streets: StreetSegment[]; lampCount: number } {
  let lampCount = 0;
  
  const streets = elements
    .filter((el): el is OSMWay => el.type === 'way' && !!el.tags?.highway && !!el.geometry)
    .map(way => {
      const tags = way.tags!;
      const highwayType = tags.highway;
      
      let streetType: StreetSegment['type'] = 'residential';
      if (highwayType === 'pedestrian') streetType = 'pedestrian';
      else if (highwayType === 'footway') streetType = 'footway';
      else if (highwayType === 'path') streetType = 'path';
      else if (highwayType === 'primary') streetType = 'primary';
      else if (highwayType === 'secondary' || highwayType === 'tertiary') streetType = 'secondary';
      
      return {
        id: `osm_way_${way.id}`,
        name: tags.name,
        type: streetType,
        has_lighting: tags.lit === 'yes',
        surface: tags.surface,
        geometry: way.geometry!,
      };
    });

  // Count street lamps
  lampCount = elements.filter(
    (el): el is OSMNode => el.type === 'node' && el.tags?.highway === 'street_lamp'
  ).length;

  return { streets, lampCount };
}

// ============================================================================
// ZONE BASELINE GENERATION
// ============================================================================

/**
 * Generate a zone baseline from OSM data
 */
export async function generateZoneBaseline(
  center: { lat: number; lon: number },
  radiusKm: number = 0.5,
  zoneId: string
): Promise<ZoneBaseline> {
  console.log(`  📍 Generating baseline for zone ${zoneId} at ${center.lat}, ${center.lon}`);

  // Calculate bounding box
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos(center.lat * Math.PI / 180));
  
  const bbox = {
    south: center.lat - latDelta,
    north: center.lat + latDelta,
    west: center.lon - lonDelta,
    east: center.lon + lonDelta,
  };

  // Query POIs
  console.log('     Fetching POIs...');
  const poiResponse = await queryOverpass(buildPOIQuery(bbox));
  const pois = processNodes(poiResponse.elements);
  console.log(`     Found ${pois.length} POIs`);

  // Query streets and lighting
  console.log('     Fetching streets & lighting...');
  const streetResponse = await queryOverpass(buildStreetQuery(bbox));
  const { streets, lampCount } = processStreets(streetResponse.elements);
  console.log(`     Found ${streets.length} streets, ${lampCount} lamps`);

  // Calculate metrics
  const areaKm2 = Math.PI * radiusKm * radiusKm;
  const litStreets = streets.filter(s => s.has_lighting).length;
  const pedestrianStreets = streets.filter(s => 
    s.type === 'pedestrian' || s.type === 'footway' || s.type === 'path'
  ).length;
  const transitStops = pois.filter(p => p.type === 'transit_stop').length;

  const baseline: ZoneBaseline = {
    zone_id: zoneId,
    center,
    radius_m: radiusKm * 1000,
    pois,
    streets,
    lighting_density: streets.length > 0 ? litStreets / streets.length : 0,
    pedestrian_score: Math.min(100, (pedestrianStreets / Math.max(1, streets.length)) * 100 + lampCount * 2),
    poi_density: pois.length / areaKm2,
    transit_access: Math.min(100, transitStops * 10),
    extracted_at: new Date().toISOString(),
    osm_timestamp: new Date().toISOString(),
  };

  return baseline;
}

// ============================================================================
// CITY CONFIGURATION
// ============================================================================

export interface CityOSMConfig {
  name: string;
  code: string;
  country: string;
  center: { lat: number; lon: number };
  zones: Array<{
    id: string;
    name: string;
    center: { lat: number; lon: number };
    radius_km?: number;
  }>;
  emergency: {
    police: string;
    ambulance: string;
    embassy?: string;
  };
  currency: string;
  timezone: string;
}

export const CITY_CONFIGS: Record<string, CityOSMConfig> = {
  bangkok: {
    name: 'Bangkok',
    code: 'BKK',
    country: 'Thailand',
    center: { lat: 13.7563, lon: 100.5018 },
    timezone: 'Asia/Bangkok',
    currency: '฿',
    emergency: { police: '191', ambulance: '1669', embassy: '+66-2-205-4000' },
    zones: [
      { id: 'bkk_khao_san', name: 'Khao San Road', center: { lat: 13.7590, lon: 100.4970 } },
      { id: 'bkk_sukhumvit', name: 'Sukhumvit', center: { lat: 13.7380, lon: 100.5608 } },
      { id: 'bkk_silom', name: 'Silom', center: { lat: 13.7285, lon: 100.5340 } },
      { id: 'bkk_yaowarat', name: 'Chinatown (Yaowarat)', center: { lat: 13.7407, lon: 100.5098 } },
      { id: 'bkk_rattanakosin', name: 'Rattanakosin (Old City)', center: { lat: 13.7520, lon: 100.4910 } },
      { id: 'bkk_thonglor', name: 'Thonglor', center: { lat: 13.7320, lon: 100.5830 } },
      { id: 'bkk_chatuchak', name: 'Chatuchak', center: { lat: 13.7999, lon: 100.5506 } },
    ],
  },
  tokyo: {
    name: 'Tokyo',
    code: 'TYO',
    country: 'Japan',
    center: { lat: 35.6762, lon: 139.6503 },
    timezone: 'Asia/Tokyo',
    currency: '¥',
    emergency: { police: '110', ambulance: '119', embassy: '+81-3-3224-5000' },
    zones: [
      { id: 'tyo_shinjuku', name: 'Shinjuku', center: { lat: 35.6938, lon: 139.7034 } },
      { id: 'tyo_shibuya', name: 'Shibuya', center: { lat: 35.6580, lon: 139.7016 } },
      { id: 'tyo_harajuku', name: 'Harajuku', center: { lat: 35.6702, lon: 139.7027 } },
      { id: 'tyo_asakusa', name: 'Asakusa', center: { lat: 35.7148, lon: 139.7967 } },
      { id: 'tyo_ginza', name: 'Ginza', center: { lat: 35.6717, lon: 139.7649 } },
      { id: 'tyo_akihabara', name: 'Akihabara', center: { lat: 35.7023, lon: 139.7745 } },
      { id: 'tyo_ueno', name: 'Ueno', center: { lat: 35.7141, lon: 139.7774 } },
      { id: 'tyo_roppongi', name: 'Roppongi', center: { lat: 35.6627, lon: 139.7318 } },
    ],
  },
  singapore: {
    name: 'Singapore',
    code: 'SIN',
    country: 'Singapore',
    center: { lat: 1.3521, lon: 103.8198 },
    timezone: 'Asia/Singapore',
    currency: 'S$',
    emergency: { police: '999', ambulance: '995' },
    zones: [
      { id: 'sin_marina_bay', name: 'Marina Bay', center: { lat: 1.2838, lon: 103.8591 } },
      { id: 'sin_orchard', name: 'Orchard Road', center: { lat: 1.3048, lon: 103.8318 } },
      { id: 'sin_chinatown', name: 'Chinatown', center: { lat: 1.2836, lon: 103.8441 } },
      { id: 'sin_little_india', name: 'Little India', center: { lat: 1.3066, lon: 103.8518 } },
      { id: 'sin_clarke_quay', name: 'Clarke Quay', center: { lat: 1.2906, lon: 103.8465 } },
      { id: 'sin_sentosa', name: 'Sentosa', center: { lat: 1.2494, lon: 103.8303 } },
    ],
  },
  'hong-kong': {
    name: 'Hong Kong',
    code: 'HKG',
    country: 'Hong Kong',
    center: { lat: 22.3193, lon: 114.1694 },
    timezone: 'Asia/Hong_Kong',
    currency: 'HK$',
    emergency: { police: '999', ambulance: '999' },
    zones: [
      { id: 'hkg_central', name: 'Central', center: { lat: 22.2800, lon: 114.1588 } },
      { id: 'hkg_tsim_sha_tsui', name: 'Tsim Sha Tsui', center: { lat: 22.2988, lon: 114.1722 } },
      { id: 'hkg_mong_kok', name: 'Mong Kok', center: { lat: 22.3193, lon: 114.1694 } },
      { id: 'hkg_wan_chai', name: 'Wan Chai', center: { lat: 22.2780, lon: 114.1755 } },
      { id: 'hkg_causeway_bay', name: 'Causeway Bay', center: { lat: 22.2800, lon: 114.1850 } },
      { id: 'hkg_lan_kwai_fong', name: 'Lan Kwai Fong', center: { lat: 22.2810, lon: 114.1555 } },
    ],
  },
  seoul: {
    name: 'Seoul',
    code: 'ICN',
    country: 'South Korea',
    center: { lat: 37.5665, lon: 126.9780 },
    timezone: 'Asia/Seoul',
    currency: '₩',
    emergency: { police: '112', ambulance: '119' },
    zones: [
      { id: 'sel_hongdae', name: 'Hongdae', center: { lat: 37.5563, lon: 126.9220 } },
      { id: 'sel_myeongdong', name: 'Myeongdong', center: { lat: 37.5636, lon: 126.9869 } },
      { id: 'sel_gangnam', name: 'Gangnam', center: { lat: 37.4979, lon: 127.0276 } },
      { id: 'sel_itaewon', name: 'Itaewon', center: { lat: 37.5345, lon: 126.9946 } },
      { id: 'sel_insadong', name: 'Insadong', center: { lat: 37.5742, lon: 126.9857 } },
      { id: 'sel_bukchon', name: 'Bukchon Hanok Village', center: { lat: 37.5826, lon: 126.9831 } },
    ],
  },
  bali: {
    name: 'Bali',
    code: 'DPS',
    country: 'Indonesia',
    center: { lat: -8.4095, lon: 115.1889 },
    timezone: 'Asia/Makassar',
    currency: 'Rp',
    emergency: { police: '110', ambulance: '118' },
    zones: [
      { id: 'bali_ubud', name: 'Ubud', center: { lat: -8.5069, lon: 115.2625 } },
      { id: 'bali_seminyak', name: 'Seminyak', center: { lat: -8.6910, lon: 115.1568 } },
      { id: 'bali_kuta', name: 'Kuta', center: { lat: -8.7180, lon: 115.1690 } },
      { id: 'bali_canggu', name: 'Canggu', center: { lat: -8.6478, lon: 115.1385 } },
      { id: 'bali_sanur', name: 'Sanur', center: { lat: -8.6900, lon: 115.2620 } },
      { id: 'bali_uluwatu', name: 'Uluwatu', center: { lat: -8.8291, lon: 115.0849 } },
    ],
  },
  'kuala-lumpur': {
    name: 'Kuala Lumpur',
    code: 'KUL',
    country: 'Malaysia',
    center: { lat: 3.1390, lon: 101.6869 },
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'RM',
    emergency: { police: '999', ambulance: '999' },
    zones: [
      { id: 'kul_bukit_bintang', name: 'Bukit Bintang', center: { lat: 3.1466, lon: 101.7108 } },
      { id: 'kul_klcc', name: 'KLCC', center: { lat: 3.1579, lon: 101.7116 } },
      { id: 'kul_chinatown', name: 'Petaling Street (Chinatown)', center: { lat: 3.1432, lon: 101.6963 } },
      { id: 'kul_bangsar', name: 'Bangsar', center: { lat: 3.1283, lon: 101.6722 } },
      { id: 'kul_mont_kiara', name: 'Mont Kiara', center: { lat: 3.1711, lon: 101.6506 } },
    ],
  },
  hanoi: {
    name: 'Hanoi',
    code: 'HAN',
    country: 'Vietnam',
    center: { lat: 21.0278, lon: 105.8342 },
    timezone: 'Asia/Ho_Chi_Minh',
    currency: '₫',
    emergency: { police: '113', ambulance: '115' },
    zones: [
      { id: 'han_old_quarter', name: 'Old Quarter', center: { lat: 21.0340, lon: 105.8507 } },
      { id: 'han_hoan_kiem', name: 'Hoan Kiem Lake', center: { lat: 21.0285, lon: 105.8525 } },
      { id: 'han_west_lake', name: 'West Lake (Tay Ho)', center: { lat: 21.0595, lon: 105.8240 } },
      { id: 'han_ba_dinh', name: 'Ba Dinh', center: { lat: 21.0360, lon: 105.8340 } },
    ],
  },
  'ho-chi-minh': {
    name: 'Ho Chi Minh City',
    code: 'SGN',
    country: 'Vietnam',
    center: { lat: 10.8231, lon: 106.6297 },
    timezone: 'Asia/Ho_Chi_Minh',
    currency: '₫',
    emergency: { police: '113', ambulance: '115' },
    zones: [
      { id: 'sgn_district_1', name: 'District 1', center: { lat: 10.7769, lon: 106.7009 } },
      { id: 'sgn_ben_thanh', name: 'Ben Thanh Market', center: { lat: 10.7725, lon: 106.6980 } },
      { id: 'sgn_bui_vien', name: 'Bui Vien (Backpacker Area)', center: { lat: 10.7680, lon: 106.6930 } },
      { id: 'sgn_district_3', name: 'District 3', center: { lat: 10.7850, lon: 106.6812 } },
      { id: 'sgn_thao_dien', name: 'Thao Dien', center: { lat: 10.8031, lon: 106.7333 } },
    ],
  },
  taipei: {
    name: 'Taipei',
    code: 'TPE',
    country: 'Taiwan',
    center: { lat: 25.0330, lon: 121.5654 },
    timezone: 'Asia/Taipei',
    currency: 'NT$',
    emergency: { police: '110', ambulance: '119' },
    zones: [
      { id: 'tpe_ximending', name: 'Ximending', center: { lat: 25.0420, lon: 121.5080 } },
      { id: 'tpe_shilin', name: 'Shilin Night Market', center: { lat: 25.0880, lon: 121.5240 } },
      { id: 'tpe_taipei_101', name: 'Taipei 101 / Xinyi', center: { lat: 25.0339, lon: 121.5645 } },
      { id: 'tpe_daan', name: 'Daan', center: { lat: 25.0260, lon: 121.5435 } },
      { id: 'tpe_zhongshan', name: 'Zhongshan', center: { lat: 25.0527, lon: 121.5209 } },
    ],
  },
};

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function ingestCityFromOSM(cityCode: string): Promise<{
  city: CityOSMConfig;
  zones: ZoneBaseline[];
}> {
  const config = CITY_CONFIGS[cityCode];
  if (!config) {
    throw new Error(`Unknown city code: ${cityCode}. Available: ${Object.keys(CITY_CONFIGS).join(', ')}`);
  }

  console.log(`\n🗺️  Ingesting ${config.name} from OpenStreetMap...`);
  console.log(`   ${config.zones.length} zones to process\n`);

  const zones: ZoneBaseline[] = [];

  for (const zoneConfig of config.zones) {
    try {
      const baseline = await generateZoneBaseline(
        zoneConfig.center,
        zoneConfig.radius_km || 0.5,
        zoneConfig.id
      );
      zones.push(baseline);
      console.log(`   ✓ ${zoneConfig.name}: ${baseline.pois.length} POIs, ${baseline.streets.length} streets`);
    } catch (error) {
      console.error(`   ✗ Failed to process ${zoneConfig.name}:`, error);
    }
  }

  console.log(`\n✓ Completed ${config.name}: ${zones.length}/${config.zones.length} zones\n`);

  return { city: config, zones };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (require.main === module) {
  const city = process.argv[2] || 'bangkok';
  
  ingestCityFromOSM(city)
    .then(result => {
      const outputPath = path.join(process.cwd(), 'data', 'osm', `${city}_baseline.json`);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`Saved to ${outputPath}`);
    })
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
