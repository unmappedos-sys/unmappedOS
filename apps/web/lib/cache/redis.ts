/**
 * Redis Cache Provider
 * 
 * Production-ready caching using Upstash Redis.
 * Provides distributed cache for all edge and serverless functions.
 * 
 * To enable Redis caching:
 * 1. Install: pnpm add @upstash/redis
 * 2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
 */

interface RedisConfig {
  url: string;
  token: string;
}

interface CacheEntry<T> {
  data: T;
  createdAt: number;
}

// Type for Redis client interface
interface RedisClient {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, opts?: { ex?: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  scan: (cursor: number, opts: { match: string; count: number }) => Promise<[string, string[]]>;
}

class RedisCache {
  private config: RedisConfig | null = null;
  private redis: RedisClient | null = null;

  async initialize(): Promise<boolean> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('Redis not configured - using fallback memory cache');
      return false;
    }

    this.config = { url, token };

    // Dynamic import to avoid bundling when not used
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const upstashRedis = await import('@upstash/redis').catch(() => null);
      if (!upstashRedis) {
        console.warn('Redis package not installed - run: pnpm add @upstash/redis');
        return false;
      }
      
      this.redis = new upstashRedis.Redis({ url, token }) as RedisClient;
      console.log('Redis cache initialized');
      return true;
    } catch (e) {
      console.warn('Redis initialization failed:', e);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const entry = await this.redis.get<CacheEntry<T>>(key);
      if (entry && entry.data) {
        return entry.data;
      }
      return null;
    } catch (e) {
      console.error('Redis get error:', e);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const entry: CacheEntry<T> = {
        data: value,
        createdAt: Date.now(),
      };
      
      await this.redis.set(key, entry, { ex: ttlSeconds });
      return true;
    } catch (e) {
      console.error('Redis set error:', e);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (e) {
      console.error('Redis delete error:', e);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      let cursor = 0;
      let deleted = 0;

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, {
          match: pattern,
          count: 100,
        });
        cursor = parseInt(nextCursor, 10);

        if (keys.length > 0) {
          deleted += await this.redis.del(...keys);
        }
      } while (cursor !== 0);

      return deleted;
    } catch (e) {
      console.error('Redis deletePattern error:', e);
      return 0;
    }
  }

  // Cache-aside pattern with Redis
  async cacheAside<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from source
    const data = await fetchFn();

    // Store in cache (fire and forget)
    this.set(key, data, ttlSeconds).catch(() => {});

    return data;
  }
}

// Singleton instance
export const redisCache = new RedisCache();

// Helper for common cache keys
export const RedisCacheKeys = {
  leaderboard: (type: string, limit: number) => `lb:${type}:${limit}`,
  userProfile: (userId: string) => `user:${userId}`,
  userStats: (userId: string) => `stats:${userId}`,
  zone: (zoneId: string) => `zone:${zoneId}`,
  prices: (zoneId: string, category: string) => `prices:${zoneId}:${category}`,
  pack: (city: string) => `pack:${city}`,
  badges: (userId: string) => `badges:${userId}`,
  quests: (userId: string) => `quests:${userId}`,
};

// TTL presets (in seconds)
export const RedisTTL = {
  SHORT: 60,           // 1 minute - volatile data
  MEDIUM: 300,         // 5 minutes - user stats
  LONG: 3600,          // 1 hour - semi-static
  VERY_LONG: 86400,    // 24 hours - static data
  PACK: 604800,        // 7 days - city packs
};
