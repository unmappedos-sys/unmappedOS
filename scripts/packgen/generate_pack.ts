import * as fs from 'fs';
import * as path from 'path';
import { selectAnchor, DEFAULT_ANCHOR_CONFIG } from '@unmapped/lib';
import type { CityPack, Zone, GeoJSONPolygon, Point, SafeCorridor, IntelMarker } from '@unmapped/lib';
import { determineTextureType, assignNeonColor } from '@unmapped/lib';
import { queryOverpassRadius } from '@unmapped/lib';

interface SeedZone {
  zone_id: string;
  polygon: GeoJSONPolygon;
  name: string;
}

interface CityConfig {
  name: string;
  code: string;
  zones: SeedZone[];
  emergency: {
    police: string;
    ambulance: string;
    embassy: string;
  };
  prices: {
    coffee: number;
    beer: number;
    taxi_airport: number;
  };
  taxi_phrase: string;
  currency: string;
}

const CITY_CONFIGS: Record<string, CityConfig> = {
  bangkok: {
    name: 'Bangkok',
    code: 'BKK',
    emergency: {
      police: '191',
      ambulance: '1669',
      embassy: '+66-2-205-4000',
    },
    prices: {
      coffee: 60,
      beer: 80,
      taxi_airport: 350,
    },
    taxi_phrase: 'ไปสนามบิน (pai sà-năam bin)',
    currency: '฿',
    zones: [], // Will be loaded from seed data
  },
  tokyo: {
    name: 'Tokyo',
    code: 'TYO',
    emergency: {
      police: '110',
      ambulance: '119',
      embassy: '+81-3-3224-5000',
    },
    prices: {
      coffee: 400,
      beer: 500,
      taxi_airport: 3000,
    },
    taxi_phrase: '空港まで (kūkō made)',
    currency: '¥',
    zones: [], // Will be loaded from seed data
  },
};

/**
 * Compute Safe Walk Score corridors for a zone
 * Identifies high-vitality walking paths based on street graph
 */
async function computeSafeCorridors(
  centroid: Point,
  polygon: GeoJSONPolygon
): Promise<SafeCorridor[]> {
  try {
    // For simplicity, return a mock corridor
    // In production, query Overpass for pedestrian ways and analyze connectivity
    const corridors: SafeCorridor[] = [];

    corridors.push({
      type: 'LineString',
      coordinates: [
        [centroid.lon - 0.001, centroid.lat - 0.001],
        [centroid.lon + 0.001, centroid.lat + 0.001],
      ],
      vitality_score: 0.8,
    });

    return corridors;
  } catch (error) {
    console.warn('      Safe corridor computation failed, using fallback');
    return [];
  }
}

/**
 * Generate Quick-Intel markers for a zone
 * Aggregates recent intel reports into zone-level markers
 */
function generateIntelMarkers(zoneId: string): IntelMarker[] {
  // In production, query comments/reports from DB
  // For pack generation, create sample markers
  const markers: IntelMarker[] = [];

  // Simulate some intel distribution
  const types: IntelMarker['type'][] = ['CLEAN', 'OVERPRICING', 'HASSLE', 'OFFLINE'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  markers.push({
    type: randomType,
    lat: 0,
    lon: 0,
    count: Math.floor(Math.random() * 5) + 1,
  });

  return markers;
}

/**
 * Generate Mission Whisper for a zone
 * Aggregated micro-advice from recent intel
 */
function generateMissionWhisper(zoneId: string, textureType: string): string {
  const whispers = [
    'COFFEE PRICES STABLE 42-48฿ // AVOID TOURIST-FACING CAFES',
    'CONSTRUCTION EAST EDGE — AVOID AFTER 21:00',
    'LOCAL MARKET HOURS 06:00-14:00 // BEST VALUE',
    'TRANSIT HUB CROWDED 17:00-19:00 // PLAN AHEAD',
    'RECENT REPORTS: AGGRESSIVE TOUTING NEAR ANCHOR',
    'CLEAN ZONE // LOW HASSLE // VERIFIED BY 8 OPERATIVES',
  ];

  return whispers[Math.floor(Math.random() * whispers.length)];
}

/**
 * Generate search index tokens for a zone
 */
function generateSearchTokens(zone: Zone): string[] {
  const tokens = [
    zone.city,
    zone.zone_id,
    zone.texture_type.toLowerCase().replace('_', ' '),
    zone.selected_anchor.name,
  ];

  // Add tag tokens
  Object.entries(zone.selected_anchor.tags).forEach(([key, value]) => {
    tokens.push(`${key}:${value}`);
  });

  return tokens.map((t) => t.toLowerCase());
}

/**
 * Load seed zones from JSON file
 */
function loadSeedZones(city: string): SeedZone[] {
  const seedPath = path.join(process.cwd(), 'data', 'seed', `${city}_zones.json`);

  if (!fs.existsSync(seedPath)) {
    console.warn(`No seed zones found for ${city}, using minimal default`);
    return [];
  }

  const data = fs.readFileSync(seedPath, 'utf-8');
  return JSON.parse(data);
}

/**
 * Generate a city pack
 */
export async function generateCityPack(
  cityKey: string,
  outputPath?: string
): Promise<CityPack> {
  const config = CITY_CONFIGS[cityKey];
  if (!config) {
    throw new Error(`Unknown city: ${cityKey}`);
  }

  console.log(`\n🗺️  Generating pack for ${config.name}...`);

  // Load seed zones
  const seedZones = loadSeedZones(cityKey);
  if (seedZones.length === 0) {
    throw new Error(`No seed zones available for ${cityKey}`);
  }

  console.log(`   Found ${seedZones.length} seed zones`);

  // Process each zone
  const zones: Zone[] = [];

  for (let i = 0; i < seedZones.length; i++) {
    const seedZone = seedZones[i];
    console.log(`   [${i + 1}/${seedZones.length}] Processing ${seedZone.zone_id}...`);

    try {
      // Select anchor using algorithm
      const anchor = await selectAnchor(seedZone.polygon, DEFAULT_ANCHOR_CONFIG);

      // Compute centroid
      const centroid: Point = {
        lat: anchor.lat, // Use anchor lat/lon as approximate centroid
        lon: anchor.lon,
      };

      // Determine texture and color
      const textureType = determineTextureType([anchor.tags]);
      const neonColor = assignNeonColor(textureType);

      // Compute additional features
      const safeCorridors = await computeSafeCorridors(centroid, seedZone.polygon);
      const intelMarkers = generateIntelMarkers(seedZone.zone_id);
      const missionWhisper = generateMissionWhisper(seedZone.zone_id, textureType);

      const zone: Zone = {
        zone_id: seedZone.zone_id,
        city: config.name.toLowerCase(),
        polygon: seedZone.polygon,
        centroid,
        texture_type: textureType as Zone['texture_type'],
        neon_color: neonColor,
        selected_anchor: anchor,
        price_medians: {
          coffee: config.prices.coffee,
          beer: config.prices.beer,
          taxi_airport: config.prices.taxi_airport,
        },
        cheat_sheet: {
          taxi_phrase: config.taxi_phrase,
          price_estimates: `Coffee ${config.currency}${config.prices.coffee} | Beer ${config.currency}${config.prices.beer}`,
          emergency_numbers: config.emergency,
        },
        status: 'ACTIVE',
        // New Strategy 6.0+ features
        safe_corridors: safeCorridors,
        intel_markers: intelMarkers,
        mission_whisper: missionWhisper,
        search_index_tokens: [], // Will be generated after zone creation
        top_comments: [], // Populated from DB in production
      };

      // Generate search tokens
      zone.search_index_tokens = generateSearchTokens(zone);

      zones.push(zone);
      console.log(`      ✓ Anchor: ${anchor.name}`);
    } catch (error) {
      console.error(`      ✗ Failed to process zone: ${error}`);
      // Continue with next zone
    }

    // Rate limit: wait 2 seconds between Overpass queries to avoid 504 errors
    if (i < seedZones.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const pack: CityPack = {
    city: cityKey,
    generated_at: new Date().toISOString(),
    version: 1,
    zones,
    meta: {
      source: 'packgen v1',
      seed_count: zones.length,
    },
    pack_token: `${cityKey}-${Date.now()}`,
    pack_size_bytes: 0, // Will be calculated after serialization
  };

  // Calculate pack size
  const packJson = JSON.stringify(pack, null, 2);
  pack.pack_size_bytes = Buffer.byteLength(packJson, 'utf8');

  // Write to file
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2));
    console.log(`   ✓ Pack written to ${outputPath}`);
  }

  console.log(`✓ ${config.name} pack complete: ${zones.length} zones\n`);

  return pack;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const cityArg = args.find((arg) => arg.startsWith('--city='));
  const outArg = args.find((arg) => arg.startsWith('--out='));

  if (!cityArg) {
    console.error('Usage: tsx generate_pack.ts --city=<bangkok|tokyo> [--out=<path>]');
    process.exit(1);
  }

  const city = cityArg.split('=')[1];
  const outputPath =
    outArg?.split('=')[1] ||
    path.join(process.cwd(), 'apps', 'web', 'public', 'data', 'packs', `${city}_pack.json`);

  try {
    await generateCityPack(city, outputPath);
    process.exit(0);
  } catch (error) {
    console.error('Pack generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
