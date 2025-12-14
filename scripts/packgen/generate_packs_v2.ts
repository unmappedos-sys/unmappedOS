/**
 * Generate City Packs v2
 * 
 * Full pipeline:
 * 1. Ingest OSM data for all configured cities
 * 2. Classify textures
 * 3. Initialize confidence scores
 * 4. Generate offline-ready city packs
 */

import * as fs from 'fs';
import * as path from 'path';
import { CITY_CONFIGS, ingestCityFromOSM } from './osm_ingest';
import { generateCityPackV2, CityPackV2 } from './city_pack_schema';

const OUTPUT_DIR = path.join(process.cwd(), 'apps', 'web', 'public', 'data', 'packs');
const CITIES_INDEX_PATH = path.join(process.cwd(), 'apps', 'web', 'public', 'data', 'cities.json');

interface CitiesIndex {
  version: string;
  generated_at: string;
  cities: Array<{
    code: string;
    name: string;
    country: string;
    zone_count: number;
    pack_url: string;
    pack_size_kb: number;
    average_confidence: number;
  }>;
}

async function generateAllPacks(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  UNMAPPED OS - City Pack Generator v2');
  console.log('  Production-grade OSM ingestion pipeline');
  console.log('═══════════════════════════════════════════════════════════\n');

  const cities = Object.keys(CITY_CONFIGS);
  console.log(`Processing ${cities.length} cities...\n`);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const packs: CityPackV2[] = [];
  const citiesIndex: CitiesIndex = {
    version: '2.0.0',
    generated_at: new Date().toISOString(),
    cities: [],
  };

  for (const cityCode of cities) {
    try {
      console.log(`\n${'─'.repeat(60)}`);
      
      // Ingest from OSM
      const { city, zones } = await ingestCityFromOSM(cityCode);
      
      if (zones.length === 0) {
        console.warn(`⚠️  No zones generated for ${city.name}, skipping...`);
        continue;
      }
      
      // Generate pack
      const pack = generateCityPackV2(city, zones);
      packs.push(pack);
      
      // Save pack
      const packPath = path.join(OUTPUT_DIR, `${cityCode}_pack.json`);
      const packJson = JSON.stringify(pack, null, 2);
      fs.writeFileSync(packPath, packJson);
      const packSizeKb = Math.round(packJson.length / 1024);
      
      console.log(`\n📦 Saved ${cityCode}_pack.json (${packSizeKb} KB)`);
      console.log(`   Zones: ${pack.zone_count}`);
      console.log(`   POIs: ${pack.stats.total_pois}`);
      console.log(`   Avg Confidence: ${pack.stats.average_confidence}%`);
      
      // Add to index
      citiesIndex.cities.push({
        code: city.code,
        name: city.name,
        country: city.country,
        zone_count: pack.zone_count,
        pack_url: `/data/packs/${cityCode}_pack.json`,
        pack_size_kb: packSizeKb,
        average_confidence: pack.stats.average_confidence,
      });
      
    } catch (error) {
      console.error(`\n❌ Failed to process ${cityCode}:`, error);
    }
  }

  // Save cities index
  fs.writeFileSync(CITIES_INDEX_PATH, JSON.stringify(citiesIndex, null, 2));
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log('  GENERATION COMPLETE');
  console.log(`${'═'.repeat(60)}`);
  console.log(`\n✅ Generated ${packs.length}/${cities.length} city packs`);
  console.log(`📁 Output: ${OUTPUT_DIR}`);
  console.log(`📋 Index: ${CITIES_INDEX_PATH}\n`);

  // Summary table
  console.log('City Summary:');
  console.log('─'.repeat(60));
  citiesIndex.cities.forEach(city => {
    console.log(`  ${city.name.padEnd(20)} ${city.zone_count} zones  ${city.pack_size_kb} KB  ${city.average_confidence}% conf`);
  });
  console.log('');
}

// Single city generation
async function generateSinglePack(cityCode: string): Promise<void> {
  console.log(`\n🏙️  Generating pack for: ${cityCode}\n`);
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const { city, zones } = await ingestCityFromOSM(cityCode);
  const pack = generateCityPackV2(city, zones);
  
  const packPath = path.join(OUTPUT_DIR, `${cityCode}_pack.json`);
  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2));
  
  console.log(`\n✅ Saved to ${packPath}`);
  console.log(`   Zones: ${pack.zone_count}`);
  console.log(`   POIs: ${pack.stats.total_pois}`);
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--all') || args.length === 0) {
  generateAllPacks().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
  });
} else {
  const cityCode = args[0];
  if (!CITY_CONFIGS[cityCode]) {
    console.error(`Unknown city: ${cityCode}`);
    console.log(`Available cities: ${Object.keys(CITY_CONFIGS).join(', ')}`);
    process.exit(1);
  }
  generateSinglePack(cityCode).catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
  });
}
