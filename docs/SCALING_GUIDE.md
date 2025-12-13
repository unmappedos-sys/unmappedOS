# Scaling Guide - Unmapped OS

> **Free Tier First**: This app works great on free tiers. All scaling features gracefully fall back to in-memory implementations.

## Free Tier Stack (Default)

Works out of the box with **$0/month**:

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Vercel Hobby** | Hosting & Edge | 100k function invocations |
| **Supabase Free** | Database & Auth | 500MB, 50k MAU |
| **Built-in Cache** | In-memory LRU | Per-instance |
| **Built-in Queue** | Sync processing | Per-request |

**Estimated Capacity**: 5,000-10,000 monthly active users

```
┌─────────────────────────────────────────────────┐
│              FREE TIER ARCHITECTURE              │
├─────────────────────────────────────────────────┤
│  Vercel Hobby                                   │
│  ├── Serverless Functions                       │
│  ├── Edge CDN (auto)                           │
│  └── Static Assets                             │
├─────────────────────────────────────────────────┤
│  Supabase Free                                 │
│  ├── PostgreSQL (500MB)                        │
│  ├── Auth (50k MAU)                            │
│  └── REST API                                  │
├─────────────────────────────────────────────────┤
│  Built-in (No External Service)                │
│  ├── In-Memory LRU Cache                       │
│  └── Synchronous Processing                    │
└─────────────────────────────────────────────────┘
```

## When to Consider Scaling

Upgrade when you consistently see:
- ⚠️ Database approaching 500MB
- ⚠️ >50k monthly active users
- ⚠️ API response times >500ms
- ⚠️ Vercel function cold starts affecting UX

## Scaling Options (When Needed)

### Option 1: Vercel Pro ($20/month)
- More function invocations
- Longer timeouts
- Preview deployments

### Option 2: Supabase Pro ($25/month)
- 8GB database
- Daily backups
- No MAU limits

### Option 3: Add Redis Cache (Upstash Free: 10k commands/day)
Only needed for multi-instance deployments:

```bash
# .env.local (optional)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

The app auto-detects Redis and uses it when available. Falls back to in-memory cache otherwise.

## Current Optimizations (Already Built-in)

### Edge-Optimized APIs
Located in `pages/api/v2/`:
- `leaderboard.ts` - Cached leaderboard
- `packs/[city].ts` - City pack CDN
- `zones/[zoneId].ts` - Zone data

### Cache Layer
Located in `lib/cache/`:
- `index.ts` - LRU cache (default)
- `redis.ts` - Redis adapter (optional)
- `unified.ts` - Auto-switching provider

### Database Indexes
Run `migrations/005_performance_indexes.sql` for optimized queries.

## Quick Performance Tips

1. **Enable Compression**: Already in `next.config.js`
2. **Use ISR**: Static pages regenerate on demand
3. **Lazy Load Maps**: Maps load after page paint
4. **Service Worker**: Caches packs offline

## Monitoring (Free)

- **Vercel Analytics**: Built-in web vitals
- **Supabase Dashboard**: Query performance
- **Browser DevTools**: Network waterfall

---

For most use cases, the free tier stack handles everything you need!
