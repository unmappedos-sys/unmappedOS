/**
 * Redis Cache Integration (Phase 7.1)
 * 
 * Caching layer for:
 * - Zone data (TTL: 5 minutes)
 * - Whisper engine output (TTL: 30 minutes)
 * - Ghost beacons (TTL: 1 hour)
 * - Texture calculations (TTL: 10 minutes)
 * - User sessions (TTL: 24 hours)
 * 
 * Uses Upstash Redis for serverless compatibility.
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    })
  : null;

const CACHE_ENABLED = !!redis;

interface CacheOptions {
  ttl?: number; // seconds
  namespace?: string;
}

/**
 * Get cached value
 */
export async function getCached<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  if (!CACHE_ENABLED) return null;

  try {
    const { namespace = 'unmapped' } = options;
    const fullKey = `${namespace}:${key}`;

    const value = await redis!.get(fullKey);
    if (!value) return null;

    return value as T;
  } catch (error) {
    console.error('[REDIS] Get error:', error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function setCached<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    const { namespace = 'unmapped', ttl = 300 } = options; // 5 min default
    const fullKey = `${namespace}:${key}`;

    await redis!.set(fullKey, value, { ex: ttl });
  } catch (error) {
    console.error('[REDIS] Set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(
  key: string,
  options: CacheOptions = {}
): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    const { namespace = 'unmapped' } = options;
    const fullKey = `${namespace}:${key}`;

    await redis!.del(fullKey);
  } catch (error) {
    console.error('[REDIS] Delete error:', error);
  }
}

/**
 * Cache zone data
 */
export async function cacheZone(zoneId: string, data: any): Promise<void> {
  await setCached(`zone:${zoneId}`, data, {
    namespace: 'unmapped',
    ttl: 300, // 5 minutes
  });
}

export async function getCachedZone(zoneId: string): Promise<any | null> {
  return getCached(`zone:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Cache whispers
 */
export async function cacheWhispers(
  zoneId: string,
  whispers: any[]
): Promise<void> {
  await setCached(`whispers:${zoneId}`, whispers, {
    namespace: 'unmapped',
    ttl: 1800, // 30 minutes
  });
}

export async function getCachedWhispers(
  zoneId: string
): Promise<any[] | null> {
  return getCached(`whispers:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Cache ghost beacons
 */
export async function cacheGhostBeacons(
  zoneId: string,
  beacons: any[]
): Promise<void> {
  await setCached(`beacons:${zoneId}`, beacons, {
    namespace: 'unmapped',
    ttl: 3600, // 1 hour
  });
}

export async function getCachedGhostBeacons(
  zoneId: string
): Promise<any[] | null> {
  return getCached(`beacons:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Cache texture calculation
 */
export async function cacheTextureCalculation(
  zoneId: string,
  texture: any
): Promise<void> {
  await setCached(`texture:${zoneId}`, texture, {
    namespace: 'unmapped',
    ttl: 600, // 10 minutes
  });
}

export async function getCachedTextureCalculation(
  zoneId: string
): Promise<any | null> {
  return getCached(`texture:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (!CACHE_ENABLED) return { allowed: true, remaining: limit };

  try {
    const key = `ratelimit:${identifier}`;
    // Upstash Redis supports incr and expire
    const redisClient = redis as any;
    const current = await redisClient.incr(key) as number;

    // Set expiry on first request
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    return { allowed, remaining };
  } catch (error) {
    console.error('[REDIS] Rate limit error:', error);
    return { allowed: true, remaining: 0 };
  }
}

/**
 * Session storage
 */
export async function cacheSession(
  sessionId: string,
  data: any
): Promise<void> {
  await setCached(`session:${sessionId}`, data, {
    namespace: 'unmapped',
    ttl: 86400, // 24 hours
  });
}

export async function getCachedSession(
  sessionId: string
): Promise<any | null> {
  return getCached(`session:${sessionId}`, { namespace: 'unmapped' });
}

/**
 * Flush cache pattern
 */
export async function flushPattern(pattern: string): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    // Note: Upstash Redis doesn't support SCAN, so we track keys manually
    console.log(`[REDIS] Flush pattern: ${pattern} (manual implementation needed)`);
  } catch (error) {
    console.error('[REDIS] Flush error:', error);
  }
}

/**
 * Health check
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!CACHE_ENABLED) return false;

  try {
    const redisClient = redis as any;
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}
