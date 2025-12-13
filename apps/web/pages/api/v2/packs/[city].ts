/**
 * Edge-Optimized City Pack API
 * 
 * Serves city packs from edge locations with aggressive caching.
 * Supports ETag-based conditional requests for bandwidth savings.
 */

import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
  regions: ['sin1', 'hnd1', 'iad1', 'fra1', 'syd1', 'gru1'], // Global coverage
};

// In production, these would come from R2/S3
const PACK_URLS: Record<string, string> = {
  bangkok: '/data/packs/bangkok_pack.json',
  tokyo: '/data/packs/tokyo_pack.json',
};

// Simple hash function for edge runtime (no Node.js crypto)
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const city = url.pathname.split('/').pop()?.toLowerCase();

  if (!city || !PACK_URLS[city]) {
    return new Response(
      JSON.stringify({ error: 'City not found', available: Object.keys(PACK_URLS) }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Check If-None-Match header for conditional request
    const clientEtag = req.headers.get('If-None-Match');

    // Fetch from origin (in production, this would be R2/S3)
    const origin = new URL(PACK_URLS[city], req.url);
    const packResponse = await fetch(origin);

    if (!packResponse.ok) {
      throw new Error(`Pack fetch failed: ${packResponse.status}`);
    }

    const packData = await packResponse.text();
    
    // Generate ETag from content hash
    const etag = `"${await hashContent(packData)}"`;

    // Return 304 if client has current version
    if (clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      });
    }

    // Return full response with caching headers
    return new Response(packData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ETag': etag,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'public, max-age=604800',
        'Vary': 'Accept-Encoding',
        'X-Pack-City': city,
        'X-Edge-Location': req.headers.get('x-vercel-id')?.split('::')[0] || 'unknown',
      },
    });
  } catch (error) {
    console.error(`Pack fetch error for ${city}:`, error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch pack' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
