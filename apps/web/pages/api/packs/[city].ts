import type { NextApiRequest, NextApiResponse } from 'next';
import type { CityPack, TextureType, Zone } from '@unmapped/lib';
import { assignNeonColor } from '@unmapped/lib';
import * as fs from 'fs';
import * as path from 'path';

type BBox = { south: number; west: number; north: number; east: number };

const dynamicPackCache = new Map<string, { pack: CityPack; expiresAt: number }>();
const dynamicPackInFlight = new Map<string, Promise<CityPack>>();
const DYNAMIC_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function normalizeCityKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function deriveCityCode(cityKey: string): string {
  if (cityKey === 'bangalore') return 'BLR';
  return cityKey.slice(0, 3).toUpperCase().padEnd(3, 'X');
}

async function geocodeCityBBox(cityName: string): Promise<BBox | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', cityName);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // Nominatim usage policy asks for a descriptive UA.
        'User-Agent': 'unmapped-os/1.0 (live-bootstrap)',
        Accept: 'application/json',
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) return null;
  const data = (await resp.json()) as Array<{ boundingbox?: [string, string, string, string] }>;
  const bb = data?.[0]?.boundingbox;
  if (!bb || bb.length !== 4) return null;

  const south = parseFloat(bb[0]);
  const north = parseFloat(bb[1]);
  const west = parseFloat(bb[2]);
  const east = parseFloat(bb[3]);
  if (![south, north, west, east].every((n) => Number.isFinite(n))) return null;

  // Guard against absurdly large bboxes (country-sized results).
  const latSpan = Math.abs(north - south);
  const lonSpan = Math.abs(east - west);
  if (latSpan > 2.5 || lonSpan > 2.5) return null;

  return { south, west, north, east };
}

function makeGridZones(city: string, code: string, bbox: BBox, count: number): Zone[] {
  const textures: TextureType[] = [
    'COMMERCIAL_DENSE',
    'RESIDENTIAL',
    'TRANSIT_HUB',
    'CULTURAL',
    'WATERFRONT',
    'INDUSTRIAL',
    'MIXED',
  ];

  // Simple 3x4 default (12 zones). If count differs, approximate a grid.
  const cols = count === 12 ? 4 : Math.max(2, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(2, Math.ceil(count / cols));

  const latStep = (bbox.north - bbox.south) / rows;
  const lonStep = (bbox.east - bbox.west) / cols;

  const zones: Zone[] = [];
  let idx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= count) break;
      idx++;

      const south = bbox.south + r * latStep;
      const north = bbox.south + (r + 1) * latStep;
      const west = bbox.west + c * lonStep;
      const east = bbox.west + (c + 1) * lonStep;

      const centroidLat = (south + north) / 2;
      const centroidLon = (west + east) / 2;

      const texture_type = textures[(idx - 1) % textures.length];
      const neon_color = assignNeonColor(texture_type);
      const zone_id = `${code}_${String(idx).padStart(3, '0')}`;
      const anchorName = `ZONE ${idx}`;

      zones.push({
        zone_id,
        city,
        polygon: {
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
        },
        centroid: { lat: centroidLat, lon: centroidLon },
        texture_type,
        neon_color,
        selected_anchor: {
          id: `live:${zone_id}:centroid`,
          lat: centroidLat,
          lon: centroidLon,
          tags: { source: 'live-bootstrap', name: anchorName },
          name: anchorName,
          selection_reason: 'AUTO-GENERATED (LIVE BOOTSTRAP)',
        },
        price_medians: {},
        cheat_sheet: {
          taxi_phrase: `TAKE ME TO ${anchorName}`,
          price_estimates: 'Coffee ? | Beer ? | Taxi ? ',
          emergency_numbers: {
            police: '112',
            ambulance: '112',
            embassy: '112',
          },
        },
        status: 'ACTIVE',
        intel_markers: [],
        search_index_tokens: [city, zone_id, anchorName.replace(/\s+/g, '_')],
        top_comments: [],
      });
    }
  }

  return zones;
}

async function generateDynamicPack(cityKey: string): Promise<CityPack> {
  const cached = dynamicPackCache.get(cityKey);
  if (cached && cached.expiresAt > Date.now()) return cached.pack;

  const inFlight = dynamicPackInFlight.get(cityKey);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const bbox = await geocodeCityBBox(cityKey);
    if (!bbox) {
      throw new Error('CITY_LOOKUP_FAILED');
    }

    const code = deriveCityCode(cityKey);
    const zones = makeGridZones(cityKey, code, bbox, 12);

    const pack: CityPack = {
      city: cityKey,
      generated_at: new Date().toISOString(),
      version: 1,
      zones,
      meta: {
        source: 'live-bootstrap v1',
        seed_count: zones.length,
      },
    };

    dynamicPackCache.set(cityKey, { pack, expiresAt: Date.now() + DYNAMIC_CACHE_TTL_MS });
    return pack;
  })();

  dynamicPackInFlight.set(cityKey, promise);
  try {
    return await promise;
  } finally {
    dynamicPackInFlight.delete(cityKey);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city } = req.query;

  if (typeof city !== 'string') {
    return res.status(400).json({ error: 'Invalid city parameter' });
  }

  const cityKey = normalizeCityKey(city);
  if (!cityKey) {
    return res.status(400).json({ error: 'Invalid city name' });
  }

  // Dynamic-first: always attempt live bootstrap.
  try {
    const pack = await generateDynamicPack(cityKey);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.setHeader('X-Pack-Source', 'live-bootstrap');
    return res.status(200).json(pack);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN';
    if (msg === 'CITY_LOOKUP_FAILED') {
      // Emergency fallback: if a shipped pack exists, serve it.
      const packPath = path.join(process.cwd(), 'public', 'data', 'packs', `${cityKey}_pack.json`);
      if (fs.existsSync(packPath)) {
        const packData = fs.readFileSync(packPath, 'utf-8');
        const pack = JSON.parse(packData);
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
        res.setHeader('X-Pack-Source', 'static-fallback');
        return res.status(200).json(pack);
      }

      return res.status(404).json({ error: 'City not found (live bootstrap failed)' });
    }
    // Avoid leaking internals.
    return res.status(500).json({ error: 'Failed to bootstrap city pack' });
  }
}
