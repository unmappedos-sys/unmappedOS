/**
 * Edge API: Health Check
 * GET /api/edge/health
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  const startTime = Date.now();

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    edge_region: req.geo?.region || 'unknown',
    edge_city: req.geo?.city || 'unknown',
    latency_ms: 0,
  };

  health.latency_ms = Date.now() - startTime;

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
