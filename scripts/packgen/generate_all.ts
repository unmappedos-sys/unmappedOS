import * as fs from 'fs';
import * as path from 'path';
import type { CityPack, GeoJSONPolygon, Zone } from '@unmapped/lib';
import { assignNeonColor } from '@unmapped/lib';
import { CITY_CONFIGS } from './osm_ingest_v2';
import { loadManualSeed } from './manual_seed_loader';

type CityKey = keyof typeof CITY_CONFIGS;

const CITY_CODES: Record<string, string> = {
  bangkok: 'BKK',
  tokyo: 'TYO',
  singapore: 'SIN',
  hongkong: 'HKG',
  seoul: 'SEL',
  bali: 'DPS',
  kualalumpur: 'KUL',
  hanoi: 'HAN',
  hochiminh: 'SGN',
  taipei: 'TPE',
};

function makeGridZones(city: string, bbox: { south: number; west: number; north: number; east: number }, code: string): Zone[] {
  const rows = 3;
  const cols = 4;
  const latStep = (bbox.north - bbox.south) / rows;
  const lonStep = (bbox.east - bbox.west) / cols;

  const zones: Zone[] = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      idx++;
      const south = bbox.south + r * latStep;
      const north = bbox.south + (r + 1) * latStep;
      const west = bbox.west + c * lonStep;
      const east = bbox.west + (c + 1) * lonStep;

      const polygon: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      };

      const centroid = {
        lat: (south + north) / 2,
        lon: (west + east) / 2,
      };

      const texture_type: Zone['texture_type'] = 'MIXED';
      const zone_id = `${code}_${String(idx).padStart(3, '0')}`;

      zones.push({
        zone_id,
        city,
        polygon,
        centroid,
        texture_type,
        neon_color: assignNeonColor(texture_type),
        selected_anchor: {
          id: `seed:${zone_id}`,
          lat: centroid.lat,
          lon: centroid.lon,
          tags: { source: 'seed' },
          score: 0,
          name: 'Zone Anchor',
          selection_reason: 'Seeded centroid anchor (demo)',
        },
        price_medians: {},
        cheat_sheet: {
          taxi_phrase: '',
          price_estimates: '',
          emergency_numbers: {
            police: '',
            ambulance: '',
            embassy: '',
          },
        },
        status: 'ACTIVE',
        safe_corridors: [
          {
            type: 'LineString',
            coordinates: [
              [west, south],
              [east, north],
            ],
            vitality_score: 0.6,
          },
        ],
        intel_markers: [],
        mission_whisper: 'DEMO PACK — LIMITED INTEL. VERIFY ON CONTACT.',
        search_index_tokens: [city, zone_id, texture_type.toLowerCase()],
      });
    }
  }

  return zones;
}

function applyManualSeedDefaults(city: string, pack: CityPack): void {
  const seed = loadManualSeed(city);
  if (!seed) return;

  const currencySymbol = seed.price_baselines.coffee.currency;
  const coffee = seed.price_baselines.coffee.typical;
  const beer = seed.price_baselines.beer.typical;
  const taxi = seed.airports?.[0]?.taxi_to_center?.typical;

  pack.zones.forEach((z) => {
    z.price_medians = {
      coffee,
      beer,
      taxi_airport: taxi,
    };
    z.cheat_sheet = {
      taxi_phrase: '',
      price_estimates: `Coffee ${currencySymbol}${coffee} | Beer ${currencySymbol}${beer}`,
      emergency_numbers: {
        police: seed.emergency.police,
        ambulance: seed.emergency.ambulance,
        embassy: '',
      },
    };
  });
}

async function generateAll() {
  console.log('🚀 Generating demo city packs for web UI...\n');

  const outputDir = path.join(process.cwd(), 'apps', 'web', 'public', 'data', 'packs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const cities = Object.keys(CITY_CONFIGS) as CityKey[];
  const generated: string[] = [];
  const skipped: string[] = [];

  for (const city of cities) {
    const outPath = path.join(outputDir, `${city}_pack.json`);
    if (fs.existsSync(outPath)) {
      skipped.push(city);
      continue;
    }

    const cfg = CITY_CONFIGS[city];
    const code = CITY_CODES[city] || city.slice(0, 3).toUpperCase();

    const pack: CityPack = {
      city,
      generated_at: new Date().toISOString(),
      version: 1,
      zones: makeGridZones(city, cfg.bbox, code),
      meta: {
        source: 'demo-grid',
        seed_count: 12,
      },
    };

    applyManualSeedDefaults(city, pack);

    fs.writeFileSync(outPath, JSON.stringify(pack, null, 2));
    generated.push(city);
  }

  console.log(`✓ Packs generated: ${generated.length}`);
  if (generated.length > 0) console.log(`  ${generated.join(', ')}`);
  console.log(`• Packs skipped (already existed): ${skipped.length}`);
  if (skipped.length > 0) console.log(`  ${skipped.join(', ')}`);
  console.log('');
}

generateAll().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
