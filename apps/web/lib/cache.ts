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
 * Redis is optional - if not installed, caching is gracefully disabled.
 */

// Initialize Redis client (optional - falls back to no-cache)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redis: any = null;
let CACHE_ENABLED = false;

// Lazy load Redis to avoid build errors when package is not installed
function getRedis() {
  if (redis !== null || CACHE_ENABLED) return redis;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisModule = require('@upstash/redis');

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new RedisModule.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      CACHE_ENABLED = true;
      return redis;
    }
  } catch (error) {
    // @upstash/redis not installed - caching disabled
    if (typeof window === 'undefined') {
      // Only log on server to avoid noise
      console.warn('[CACHE] Redis not available - caching disabled');
    }
  }

  return null;
}
interface CacheOptions {
  ttl?: number; // seconds
  namespace?: string;
}

/**
 * Get cached value
 */
export async function getCached<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
  const redisClient = getRedis();
  if (!redisClient) return null;

  try {
    const { namespace = 'unmapped' } = options;
    const fullKey = `${namespace}:${key}`;

    const value = await redisClient.get(fullKey);
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
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    const { namespace = 'unmapped', ttl = 300 } = options; // 5 min default
    const fullKey = `${namespace}:${key}`;

    await redisClient.set(fullKey, value, { ex: ttl });
  } catch (error) {
    console.error('[REDIS] Set error:', error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string, options: CacheOptions = {}): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    const { namespace = 'unmapped' } = options;
    const fullKey = `${namespace}:${key}`;

    await redisClient.del(fullKey);
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
export async function cacheWhispers(zoneId: string, whispers: any[]): Promise<void> {
  await setCached(`whispers:${zoneId}`, whispers, {
    namespace: 'unmapped',
    ttl: 1800, // 30 minutes
  });
}

export async function getCachedWhispers(zoneId: string): Promise<any[] | null> {
  return getCached(`whispers:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Cache ghost beacons
 */
export async function cacheGhostBeacons(zoneId: string, beacons: any[]): Promise<void> {
  await setCached(`beacons:${zoneId}`, beacons, {
    namespace: 'unmapped',
    ttl: 3600, // 1 hour
  });
}

export async function getCachedGhostBeacons(zoneId: string): Promise<any[] | null> {
  return getCached(`beacons:${zoneId}`, { namespace: 'unmapped' });
}

/**
 * Cache texture calculation
 */
export async function cacheTextureCalculation(zoneId: string, texture: any): Promise<void> {
  await setCached(`texture:${zoneId}`, texture, {
    namespace: 'unmapped',
    ttl: 600, // 10 minutes
  });
}

export async function getCachedTextureCalculation(zoneId: string): Promise<any | null> {
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
  const redisClient = getRedis();
  if (!redisClient) return { allowed: true, remaining: limit };

  try {
    const key = `ratelimit:${identifier}`;
    // Upstash Redis supports incr and expire
    const current = (await redisClient.incr(key)) as number;

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
export async function cacheSession(sessionId: string, data: any): Promise<void> {
  await setCached(`session:${sessionId}`, data, {
    namespace: 'unmapped',
    ttl: 86400, // 24 hours
  });
}

export async function getCachedSession(sessionId: string): Promise<any | null> {
  return getCached(`session:${sessionId}`, { namespace: 'unmapped' });
}

/**
 * Flush cache pattern
 */
export async function flushPattern(pattern: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

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
  const redisClient = getRedis();
  if (!redisClient) return false;

  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}
