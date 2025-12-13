/**
 * Edge-Optimized Zone Data API
 * 
 * Returns zone information with intelligent caching.
 * Separates static zone data from dynamic pricing.
 */

import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  regions: ['sin1', 'hnd1', 'iad1', 'fra1', 'syd1', 'gru1'],
};

// Cache zone data in memory at edge
const zoneCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ZoneData {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radius: number;
  city: string;
}

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const zoneId = url.pathname.split('/').pop();
  const city = url.searchParams.get('city') || 'bangkok';

  if (!zoneId) {
    return new Response(
      JSON.stringify({ error: 'Zone ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check cache
  const cacheKey = `zone:${city}:${zoneId}`;
  const cached = zoneCache.get(cacheKey);
  
  if (cached && cached.expires > Date.now()) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    // In production, this would query Supabase or read from R2
    // For now, construct from seed data pattern
    const zoneData: ZoneData = {
      id: zoneId,
      name: `Zone ${zoneId}`,
      type: 'standard',
      lat: 13.7563,
      lng: 100.5018,
      radius: 500,
      city: city,
    };

    // Store in cache
    zoneCache.set(cacheKey, {
      data: zoneData,
      expires: Date.now() + CACHE_TTL,
    });

    return new Response(JSON.stringify(zoneData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error(`Zone fetch error for ${zoneId}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch zone' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
