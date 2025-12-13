import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('🌱 Seeding Unmapped OS database...\n');

  try {
    // 1. Seed test users
    console.log('   Creating test users...');
    const testUsers = [
      { email: 'operative1@unmapped.test', provider: 'email', karma: 0 },
      { email: 'operative2@unmapped.test', provider: 'email', karma: 0 },
      { email: 'operative3@unmapped.test', provider: 'email', karma: 50 },
    ];

    for (const user of testUsers) {
      const { error } = await supabase.from('users').upsert(user, { onConflict: 'email' });
      if (error && !error.message.includes('duplicate')) {
        console.error(`     ✗ Failed to create ${user.email}:`, error);
      } else {
        console.log(`     ✓ ${user.email}`);
      }
    }

    // 2. Load and seed zones from packs
    console.log('\n   Loading zones from city packs...');
    const cities = ['bangkok', 'tokyo'];

    for (const city of cities) {
      const packPath = path.join(
        process.cwd(),
        'apps',
        'web',
        'public',
        'data',
        'packs',
        `${city}_pack.json`
      );

      if (!fs.existsSync(packPath)) {
        console.warn(`     ⚠ Pack not found: ${packPath}`);
        continue;
      }

      const packData = JSON.parse(fs.readFileSync(packPath, 'utf-8'));

      for (const zone of packData.zones) {
        const zoneRecord = {
          zone_id: zone.zone_id,
          city: zone.city,
          geometry: zone.polygon,
          centroid: zone.centroid,
          texture_type: zone.texture_type,
          anchor: zone.selected_anchor,
          neon_color: zone.neon_color,
          status: zone.status,
        };

        const { error } = await supabase
          .from('zones')
          .upsert(zoneRecord, { onConflict: 'zone_id' });

        if (error) {
          console.error(`     ✗ Failed to seed zone ${zone.zone_id}:`, error);
        } else {
          console.log(`     ✓ ${zone.zone_id}`);
        }
      }
    }

    // 3. Seed sample prices
    console.log('\n   Seeding sample prices...');
    const samplePrices = [
      { zone_id: 'BKK_001', city: 'bangkok', item: 'coffee', amount: 60, currency: 'THB' },
      { zone_id: 'BKK_001', city: 'bangkok', item: 'beer', amount: 80, currency: 'THB' },
      { zone_id: 'BKK_002', city: 'bangkok', item: 'coffee', amount: 55, currency: 'THB' },
      { zone_id: 'TYO_001', city: 'tokyo', item: 'coffee', amount: 400, currency: 'JPY' },
      { zone_id: 'TYO_001', city: 'tokyo', item: 'beer', amount: 500, currency: 'JPY' },
    ];

    for (const price of samplePrices) {
      const { error } = await supabase.from('prices').insert(price);
      if (error) {
        console.error(`     ✗ Failed to seed price:`, error);
      } else {
        console.log(`     ✓ ${price.city} ${price.item}: ${price.amount} ${price.currency}`);
      }
    }

    console.log('\n✓ Database seeding complete\n');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
