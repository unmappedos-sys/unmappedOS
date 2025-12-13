# Deployment Guide - Unmapped OS v3.0

## Prerequisites

- Node.js 18+ and pnpm
- Supabase project
- Vercel account (for deployment)
- Upstash Redis account (optional, for caching)
- Mapbox account (for maps)

## Environment Variables

Create `.env` file based on `.env.example`:

```bash
# Core Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# OAuth Providers
NEXT_PUBLIC_GOOGLE_ENABLED=true
NEXT_PUBLIC_GITHUB_ENABLED=true
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Redis (optional but recommended for production)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Feature Flags
NEXT_PUBLIC_TEXTURE_SYSTEM_ENABLED=true
NEXT_PUBLIC_GHOST_BEACONS_ENABLED=true
NEXT_PUBLIC_WHISPER_ENGINE_ENABLED=true
NEXT_PUBLIC_SAFE_CORRIDORS_ENABLED=true
NEXT_PUBLIC_CRISIS_MODE_ENABLED=true
NEXT_PUBLIC_SHADOW_MODE_ENABLED=true

# Rate Limiting
RATE_LIMIT_COMMENTS=10
RATE_LIMIT_WINDOW_MINUTES=60
RATE_LIMIT_REPORTS=5
```

## Database Setup

### 1. Run Migrations

```bash
# Navigate to infrastructure directory
cd infrastructure/supabase

# Run schema (in Supabase SQL editor)
psql $DATABASE_URL < schema.sql
psql $DATABASE_URL < schema_extensions.sql
psql $DATABASE_URL < fix_rls.sql

# Run gamification migrations
cd ../../migrations
psql $DATABASE_URL < 001_gamification_tables.sql
psql $DATABASE_URL < 002_missing_links_and_spy_features.sql
psql $DATABASE_URL < 003_safety_and_security.sql
psql $DATABASE_URL < 004_strategy_6_enhancements.sql
psql $DATABASE_URL < 005_performance_indexes.sql
```

### 2. Enable PostGIS Extension

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Create Spatial Functions

```sql
-- Function: Get zone at point
CREATE OR REPLACE FUNCTION get_zone_at_point(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS TABLE (
  zone_id TEXT,
  name TEXT,
  texture_type TEXT,
  base_price_usd NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT z.zone_id, z.name, z.texture_type, z.base_price_usd
  FROM zones z
  WHERE ST_Contains(z.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
    AND z.status = 'ACTIVE'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get zones near point
CREATE OR REPLACE FUNCTION get_zones_near_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_meters DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  zone_id TEXT,
  name TEXT,
  texture_type TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    z.zone_id,
    z.name,
    z.texture_type,
    ST_Distance(z.geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meters
  FROM zones z
  WHERE ST_DWithin(z.geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    AND z.status = 'ACTIVE'
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

## Seed Data

### Load Bangkok & Tokyo Zones

```bash
cd scripts/seed

# Install dependencies
pnpm install

# Seed database
pnpm tsx seed_database.ts
```

This will load zones from `data/seed/bangkok_zones.json` and `data/seed/tokyo_zones.json`.

## Local Development

```bash
# Install dependencies
pnpm install

# Run dev server
cd apps/web
pnpm dev

# Open browser
# http://localhost:3000
```

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## Deployment to Vercel

### 1. Install Vercel CLI

```bash
pnpm install -g vercel
```

### 2. Link Project

```bash
vercel link
```

### 3. Set Environment Variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all other env vars
```

### 4. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 5. Configure Domains

In Vercel dashboard:
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records

## Edge Functions Setup

Edge functions are automatically deployed with Vercel. They're located in:

```
apps/web/pages/api/edge/
- zone-lookup.ts  # Zone discovery
- whispers.ts      # Whisper generation
- health.ts        # Health checks
```

These run on Vercel Edge Runtime for <50ms response times globally.

## Redis Setup (Upstash)

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy REST URL and Token to env vars
4. Cache will be automatically used for:
   - Zone data (5 min TTL)
   - Whispers (30 min TTL)
   - Ghost beacons (1 hour TTL)
   - Texture calculations (10 min TTL)

## Monitoring

### Application Logs

View logs in Vercel dashboard or via CLI:

```bash
vercel logs
```

### Database Performance

Monitor query performance in Supabase dashboard:
- Settings → Database → Query Performance
- Check slow queries
- Verify index usage

### Redis Metrics

Monitor cache hit rates in Upstash dashboard:
- Operations per second
- Hit/miss ratio
- Memory usage

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm test:e2e
```

## Performance Optimization

### Edge CDN Configuration

In `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/edge/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=300, stale-while-revalidate=600"
        }
      ]
    }
  ]
}
```

### Database Indexes

Ensure these indexes exist:

```sql
-- Zones
CREATE INDEX idx_zones_status ON zones(status);
CREATE INDEX idx_zones_city ON zones(city);
CREATE INDEX idx_zones_texture ON zones(texture_type);
CREATE INDEX idx_zones_geom_gist ON zones USING GIST(geom);

-- Comments
CREATE INDEX idx_comments_zone ON comments(zone_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Karma
CREATE INDEX idx_karma_user ON karma_logs(user_id);
CREATE INDEX idx_karma_created ON karma_logs(created_at DESC);
```

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to client
- [ ] Rate limiting configured
- [ ] CORS configured for production domain
- [ ] OAuth redirect URIs whitelisted
- [ ] Content Security Policy headers set
- [ ] API keys stored in environment variables only

## Backup Strategy

### Database Backups

Supabase provides automatic backups:
- Point-in-time recovery (7 days on Pro plan)
- Manual snapshots before major changes

### User Data Export

Users can export their data:
- Operative Replay sessions (JSON/CSV)
- Texture Fingerprint (JSON)
- Karma history (CSV)

All stored locally in IndexedDB, user controls exports.

## Support & Troubleshooting

### Common Issues

**OAuth buttons not showing**
- Check `NEXT_PUBLIC_GOOGLE_ENABLED=true` in `.env`
- Verify OAuth redirect URIs in provider console
- Restart dev server after env changes

**Maps not loading**
- Verify Mapbox token is valid
- Check browser console for API errors
- Ensure CORS is configured for your domain

**Database queries slow**
- Check PostGIS extension is installed
- Verify spatial indexes exist
- Monitor query performance in Supabase

**Redis not working**
- Verify Upstash credentials
- Check network connectivity
- App will gracefully degrade without Redis

### Getting Help

- GitHub Issues: [github.com/yourusername/unmappedos/issues]
- Discord Community: [discord.gg/unmappedos]
- Email: support@unmappedos.com
