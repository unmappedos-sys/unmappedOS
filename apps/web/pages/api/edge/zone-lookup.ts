/**
 * Edge API Routes (Phase 7.3)
 * 
 * Critical endpoints optimized for Vercel Edge Runtime.
 * Deployed globally for <50ms response times.
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

/**
 * Zone lookup by coordinates
 * GET /api/edge/zone-lookup?lat={lat}&lng={lng}
 */
export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'Invalid coordinates' },
      { status: 400 }
    );
  }

  try {
    // Use edge-compatible fetch to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_zone_at_point`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey || '',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          p_lat: lat,
          p_lng: lng,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.statusText}`);
    }

    const zone = await response.json();

    return NextResponse.json(zone, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[EDGE] Zone lookup error:', error);
    return NextResponse.json(
      { error: 'Zone lookup failed' },
      { status: 500 }
    );
  }
}
