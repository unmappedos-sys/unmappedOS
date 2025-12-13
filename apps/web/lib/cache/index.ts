/**
 * Caching Layer for Production Scale
 * 
 * Supports:
 * - In-memory LRU cache (development/single instance)
 * - Redis (production/multi-instance)
 * - Edge caching via headers
 */

// Simple LRU Cache for development (no external dependencies)
class LRUCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Singleton instances per cache type
const caches = {
  leaderboard: new LRUCache<any>(100),
  whispers: new LRUCache<any>(500),
  packs: new LRUCache<any>(50),
  sessions: new LRUCache<any>(10000),
};

// TTL configurations (milliseconds)
export const TTL = {
  LEADERBOARD: 5 * 60 * 1000,      // 5 minutes
  WHISPERS: 60 * 60 * 1000,         // 1 hour
  PACK_META: 24 * 60 * 60 * 1000,   // 24 hours
  SESSION: 60 * 60 * 1000,          // 1 hour
  STREAK: 24 * 60 * 60 * 1000,      // 24 hours
  ZONE_MEDIAN: 30 * 60 * 1000,      // 30 minutes
};

// Cache key generators
export const CacheKey = {
  leaderboard: (city: string, type: string) => `lb:${city}:${type}`,
  whispers: (zoneId: string) => `whisper:${zoneId}`,
  packMeta: (city: string) => `pack:${city}:meta`,
  session: (userId: string) => `session:${userId}`,
  streak: (userId: string) => `streak:${userId}`,
  zoneMedian: (zoneId: string, category: string) => `median:${zoneId}:${category}`,
  userBadges: (userId: string) => `badges:${userId}`,
};

/**
 * Cache interface - can be swapped for Redis in production
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory cache provider (development/single instance)
 */
class MemoryCacheProvider implements CacheProvider {
  private getCache(key: string): LRUCache<any> {
    if (key.startsWith('lb:')) return caches.leaderboard;
    if (key.startsWith('whisper:')) return caches.whispers;
    if (key.startsWith('pack:')) return caches.packs;
    if (key.startsWith('session:')) return caches.sessions;
    return caches.sessions; // default
  }

  async get<T>(key: string): Promise<T | null> {
    return this.getCache(key).get(key);
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.getCache(key).set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    this.getCache(key).delete(key);
  }
}

/**
 * Redis cache provider (production/multi-instance)
 * Uncomment and configure when scaling
 */
// import { Redis } from '@upstash/redis';
// 
// class RedisCacheProvider implements CacheProvider {
//   private redis: Redis;
// 
//   constructor() {
//     this.redis = new Redis({
//       url: process.env.UPSTASH_REDIS_URL!,
//       token: process.env.UPSTASH_REDIS_TOKEN!,
//     });
//   }
// 
//   async get<T>(key: string): Promise<T | null> {
//     return this.redis.get<T>(key);
//   }
// 
//   async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
//     await this.redis.setex(key, Math.floor(ttlMs / 1000), JSON.stringify(value));
//   }
// 
//   async delete(key: string): Promise<void> {
//     await this.redis.del(key);
//   }
// }

// Export singleton based on environment
export const cache: CacheProvider = new MemoryCacheProvider();
// For production: export const cache = new RedisCacheProvider();

/**
 * Cache-aside pattern helper
 * Tries cache first, falls back to fetch function, caches result
 */
export async function cacheAside<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch from source
  const data = await fetchFn();

  // Store in cache (fire and forget for performance)
  cache.set(key, data, ttlMs).catch(console.error);

  return data;
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  await cache.delete(key);
}

/**
 * Invalidate multiple cache entries by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  // For memory cache, this is a no-op (LRU handles eviction)
  // For Redis, use: await redis.keys(pattern).then(keys => redis.del(...keys));
  console.log(`Cache invalidation requested for pattern: ${pattern}`);
}
