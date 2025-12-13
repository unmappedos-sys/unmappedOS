/**
 * Database Connection Pooling (Phase 7.2)
 * 
 * Optimized Supabase client with connection pooling and query optimization.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Reusable clients
let anonClient: ReturnType<typeof createClient> | null = null;
let serviceClient: ReturnType<typeof createClient> | null = null;

/**
 * Get anonymous client (client-side, respects RLS)
 */
export function getAnonClient() {
  if (!anonClient) {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'x-client-info': 'unmapped-os-web',
        },
      },
    });
  }

  return anonClient;
}

/**
 * Get service role client (server-side, bypasses RLS)
 */
export function getServiceClient() {
  if (!serviceClient) {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceClient;
}

/**
 * Optimized zone query with indexes
 */
export async function getZoneOptimized(zoneId: string) {
  const client = getAnonClient();

  const { data, error } = await client
    .from('zones')
    .select(
      `
      zone_id,
      name,
      city,
      texture_type,
      base_price_usd,
      status,
      geom
    `
    )
    .eq('zone_id', zoneId)
    .eq('status', 'ACTIVE')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Batch zone fetch
 */
export async function getZonesBatch(zoneIds: string[]) {
  const client = getAnonClient();

  const { data, error } = await client
    .from('zones')
    .select(
      `
      zone_id,
      name,
      texture_type,
      base_price_usd,
      status
    `
    )
    .in('zone_id', zoneIds)
    .eq('status', 'ACTIVE');

  if (error) throw error;
  return data;
}

/**
 * Get zones near location (PostGIS optimized)
 */
export async function getZonesNearLocation(
  lat: number,
  lng: number,
  radiusMeters: number = 1000,
  limit: number = 10
) {
  const client = getAnonClient();

  // Use PostGIS ST_DWithin for efficient spatial query
  // Cast to bypass type checking for custom RPC function
  const { data, error } = await (client as any).rpc('get_zones_near_point', {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: radiusMeters,
    p_limit: limit,
  });

  if (error) {
    console.error('[DB] Spatial query error:', error);
    return [];
  }

  return data;
}

/**
 * Materialized view refresh (scheduled job)
 */
export async function refreshMaterializedViews() {
  const client = getServiceClient();

  try {
    // Refresh zone statistics
    await client.rpc('refresh_zone_stats');

    // Refresh leaderboard
    await client.rpc('refresh_leaderboard_cache');

    console.log('[DB] Materialized views refreshed');
  } catch (error) {
    console.error('[DB] Materialized view refresh error:', error);
  }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency_ms: number;
}> {
  const start = Date.now();

  try {
    const client = getAnonClient();
    await client.from('zones').select('zone_id').limit(1).single();

    const latency_ms = Date.now() - start;

    return {
      healthy: true,
      latency_ms,
    };
  } catch (error) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
    };
  }
}

/**
 * Query with retry logic
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[DB] Query attempt ${i + 1} failed, retrying...`);

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}
