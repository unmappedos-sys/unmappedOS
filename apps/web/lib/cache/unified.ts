/**
 * Unified Cache Provider
 * 
 * Automatically uses Redis in production, falls back to LRU in dev.
 * Provides consistent API across environments.
 */

import { cache, cacheAside as lruCacheAside, invalidateCache } from './index';
import { redisCache, RedisCacheKeys, RedisTTL } from './redis';

type CacheProvider = 'redis' | 'memory';

interface UnifiedCacheConfig {
  provider: CacheProvider;
  initialized: boolean;
}

const config: UnifiedCacheConfig = {
  provider: 'memory',
  initialized: false,
};

/**
 * Initialize the cache system
 * Automatically selects Redis if configured, else memory cache
 */
export async function initializeCache(): Promise<CacheProvider> {
  if (config.initialized) return config.provider;

  const hasRedis = process.env.UPSTASH_REDIS_REST_URL && 
                   process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasRedis) {
    const success = await redisCache.initialize();
    if (success) {
      config.provider = 'redis';
      console.log('✅ Using Redis cache');
    }
  } else {
    console.log('📦 Using in-memory LRU cache');
  }

  config.initialized = true;
  return config.provider;
}

/**
 * Cache-aside pattern - unified interface
 */
export async function cacheGet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  if (config.provider === 'redis') {
    return redisCache.cacheAside(key, fetchFn, ttlSeconds);
  }
  
  // Memory cache uses different TTL format (milliseconds)
  return lruCacheAside(key, ttlSeconds * 1000, fetchFn);
}

/**
 * Direct cache set
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<boolean> {
  if (config.provider === 'redis') {
    return redisCache.set(key, value, ttlSeconds);
  }
  
  await cache.set(key, value, ttlSeconds * 1000);
  return true;
}

/**
 * Direct cache get
 */
export async function cacheGetDirect<T>(key: string): Promise<T | null> {
  if (config.provider === 'redis') {
    return redisCache.get<T>(key);
  }
  
  return cache.get(key) as Promise<T | null>;
}

/**
 * Cache invalidation
 */
export async function cacheInvalidate(key: string): Promise<boolean> {
  if (config.provider === 'redis') {
    return redisCache.delete(key);
  }
  
  await cache.delete(key);
  return true;
}

/**
 * Pattern-based cache invalidation (Redis only)
 */
export async function cacheInvalidatePattern(pattern: string): Promise<number> {
  if (config.provider === 'redis') {
    return redisCache.deletePattern(pattern);
  }
  
  // Memory cache doesn't support pattern iteration directly
  // Pattern invalidation is a no-op in memory mode
  console.log(`Cache pattern invalidation: ${pattern} (memory mode - no-op)`);
  return 0;
}

/**
 * Get current cache provider
 */
export function getCacheProvider(): CacheProvider {
  return config.provider;
}

// Re-export useful types and utilities
export { RedisCacheKeys, RedisTTL, invalidateCache };

// Pre-configured cache functions for common patterns
export const cachedLeaderboard = <T>(
  type: string,
  limit: number,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheGet(RedisCacheKeys.leaderboard(type, limit), fetchFn, RedisTTL.MEDIUM);
};

export const cachedUserStats = <T>(
  userId: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheGet(RedisCacheKeys.userStats(userId), fetchFn, RedisTTL.SHORT);
};

export const cachedZone = <T>(
  zoneId: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheGet(RedisCacheKeys.zone(zoneId), fetchFn, RedisTTL.LONG);
};

export const cachedPrices = <T>(
  zoneId: string,
  category: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheGet(RedisCacheKeys.prices(zoneId, category), fetchFn, RedisTTL.SHORT);
};

export const cachedPack = <T>(
  city: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheGet(RedisCacheKeys.pack(city), fetchFn, RedisTTL.PACK);
};

// Invalidation helpers
export const invalidateUserCache = async (userId: string): Promise<void> => {
  await cacheInvalidate(RedisCacheKeys.userProfile(userId));
  await cacheInvalidate(RedisCacheKeys.userStats(userId));
  await cacheInvalidate(RedisCacheKeys.badges(userId));
  await cacheInvalidate(RedisCacheKeys.quests(userId));
};

export const invalidateZoneCache = async (zoneId: string): Promise<void> => {
  await cacheInvalidate(RedisCacheKeys.zone(zoneId));
  await cacheInvalidatePattern(`prices:${zoneId}:*`);
};
