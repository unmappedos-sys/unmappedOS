/**
 * Edge API: Whisper Generation
 * GET /api/edge/whispers?zoneId={zoneId}&hour={hour}
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get('zoneId');
  const hour = parseInt(searchParams.get('hour') || `${new Date().getHours()}`);

  if (!zoneId) {
    return NextResponse.json(
      { error: 'Missing zoneId' },
      { status: 400 }
    );
  }

  try {
    // Check Redis cache first (if available)
    const cacheKey = `whispers:${zoneId}:${hour}`;

    // Generate whispers (simplified for edge)
    const whispers = generateEdgeWhispers(zoneId, hour);

    return NextResponse.json(
      { whispers },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    console.error('[EDGE] Whisper generation error:', error);
    return NextResponse.json(
      { error: 'Whisper generation failed' },
      { status: 500 }
    );
  }
}

function generateEdgeWhispers(zoneId: string, hour: number): string[] {
  const whispers: string[] = [];

  // Time-based whispers
  if (hour >= 22 || hour < 6) {
    whispers.push('NIGHT OPS // ELEVATED TEXTURE VARIANCE');
  } else if (hour >= 6 && hour < 9) {
    whispers.push('MORNING WINDOW // BASELINE TEXTURE ACTIVE');
  } else if (hour >= 17 && hour < 20) {
    whispers.push('GOLDEN HOUR // OPTIMAL VISUAL CONDITIONS');
  }

  // Zone-based (simplified)
  whispers.push(`ZONE ${zoneId.slice(0, 8).toUpperCase()} // MONITORING ACTIVE`);

  return whispers;
}
