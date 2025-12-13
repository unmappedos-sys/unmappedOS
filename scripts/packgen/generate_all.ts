import * as path from 'path';
import { generateCityPack } from './generate_pack';

const CITIES = ['bangkok', 'tokyo'];

async function generateAll() {
  console.log('🚀 Generating all city packs...\n');

  for (const city of CITIES) {
    const outputPath = path.join(
      process.cwd(),
      'apps',
      'web',
      'public',
      'data',
      'packs',
      `${city}_pack.json`
    );

    try {
      await generateCityPack(city, outputPath);
    } catch (error) {
      console.error(`Failed to generate ${city} pack:`, error);
    }
  }

  console.log('✓ All packs generated\n');
}

generateAll().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
