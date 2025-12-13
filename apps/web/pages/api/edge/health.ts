/**
 * Edge API: Health Check
 * GET /api/edge/health
 */

import { NextRequest, NextResponse } from 'next/server';

// Vercel Edge Functions extend NextRequest with geo property
interface VercelNextRequest extends NextRequest {
  geo?: {
    city?: string;
    country?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  };
}

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const startTime = Date.now();
  const vercelReq = req as VercelNextRequest;

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    edge_region: vercelReq.geo?.region || 'unknown',
    edge_city: vercelReq.geo?.city || 'unknown',
    latency_ms: 0,
  };

  health.latency_ms = Date.now() - startTime;

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
