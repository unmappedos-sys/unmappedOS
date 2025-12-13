# Unmapped OS Feature Implementation Guide

**Version**: Strategy 6.0++  
**Last Updated**: December 2025

---

## Overview

This guide provides detailed implementation information for all Strategy 6.0++ features. Use this as a reference for understanding, extending, or debugging the codebase.

---

## Core Systems

### 1. Operative Mode System

**Files**: 
- [lib/operativeMode.ts](../apps/web/lib/operativeMode.ts)
- [hooks/useOperativeMode.ts](../apps/web/hooks/useOperativeMode.ts)

**Modes**:
| Mode | Trigger | Behavior |
|------|---------|----------|
| FAST_OPS | Low battery (<20%) + moving | Minimal map detail, reduced sync |
| DEEP_OPS | Idle in zone >15 min | Full detail, whispers active |
| SAFE_OPS | Night (0-5 AM) or low vitality | Safe return enabled, reduced features |
| CRISIS | Manual or shake activate | Minimal UI, emergency features only |
| STANDARD | Default conditions | Normal operation |

**Usage**:
```typescript
const { mode, config } = useOperativeMode();

if (config.features.whispers) {
  // Show whisper panel
}
```

---

### 2. Crisis Mode

**Files**:
- [lib/crisisMode.ts](../apps/web/lib/crisisMode.ts)
- [hooks/useCrisisMode.ts](../apps/web/hooks/useCrisisMode.ts)
- [components/CrisisModeUI.tsx](../apps/web/components/CrisisModeUI.tsx)

**Activation**:
1. Shake device (3+ events >15 m/s²)
2. Enter safe phrase
3. Manual toggle

**Safe Phrases by City**:
- Bangkok: ไม่เป็นไร, ขอโทษครับ, ไม่เข้าใจ
- Tokyo: 大丈夫です, すみません, 分かりません

**API**: `POST /api/protected/crisis`

---

### 3. Price Delta Engine

**Files**:
- [lib/priceDelta.ts](../apps/web/lib/priceDelta.ts)
- [components/PriceDeltaDisplay.tsx](../apps/web/components/PriceDeltaDisplay.tsx)

**Delta Status**:
| Status | Condition |
|--------|-----------|
| BARGAIN | Price ≤ median × 0.8 |
| NORMAL | median × 0.8 < price ≤ median × 1.1 |
| HIGH | median × 1.1 < price ≤ median × 1.3 |
| OVERPRICED | Price > median × 1.3 |

**API**: `POST /api/protected/prices`

```typescript
const result = await submitPrice({
  zone_id: 'BKK_001',
  item: 'coffee',
  amount: 80,
  currency: 'THB',
});
// Returns: { delta: { price: 80, zone_median: 60, delta_percent: 33, status: 'HIGH' } }
```

---

### 4. Whisper Engine

**Files**:
- [lib/whisperEngine.ts](../apps/web/lib/whisperEngine.ts)
- [components/WhisperDisplay.tsx](../apps/web/components/WhisperDisplay.tsx)

**Whisper Types**:
- `intel`: General zone intelligence
- `price`: Pricing information
- `safety`: Safety advisories
- `timing`: Time-sensitive info
- `local`: Local tips

**Caching**: Whispers cached in Supabase for 1 hour per zone.

**API**: `GET /api/zones/whispers?zone_id=BKK_001`

---

### 5. Ghost Beacons

**Files**:
- [lib/ghostBeacons.ts](../apps/web/lib/ghostBeacons.ts)
- [components/GhostBeaconIndicator.tsx](../apps/web/components/GhostBeaconIndicator.tsx)

**Beacon Types**:
| Type | Description | OSM Tags |
|------|-------------|----------|
| interest | Point of interest | tourism, amenity |
| hidden_gem | Less-known spot | Low visibility score |
| local_favorite | Frequented by locals | Inferred from data |
| historic | Historical significance | historic=* |
| viewpoint | Scenic view | tourism=viewpoint |

**API**: `GET /api/zones/beacons?zone_id=BKK_001`

---

### 6. Safe Return Path

**Files**:
- [lib/safeReturnPath.ts](../apps/web/lib/safeReturnPath.ts)

**Route Scoring Factors**:
- Lighting (well_lit > moderate > dark)
- Crowding (moderate preferred)
- Known hazards (penalties)
- Distance

**Vitality Budget**: Routes filtered to match user's remaining energy.

**API**: `POST /api/protected/safe-return`

---

### 7. Operative Replay

**Files**:
- [lib/operativeReplay.ts](../apps/web/lib/operativeReplay.ts)
- [pages/operative/replay.tsx](../apps/web/pages/operative/replay.tsx)

**Storage**: IndexedDB only (never synced to server)

**Data Schema**:
```typescript
interface ReplayEvent {
  id: string;
  session_id: string;
  type: 'location' | 'zone_enter' | 'zone_exit' | 'anchor_reached' | 'custom';
  coordinates?: { lat: number; lon: number };
  zone_id?: string;
  anchor_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Export**: JSON or CSV format

---

### 8. Texture Fingerprint

**Files**:
- [lib/textureFingerprint.ts](../apps/web/lib/textureFingerprint.ts)

**Texture Types**: market, nightlife, temple, park, transit, residential, commercial, historic, waterfront, food_street

**Learning Algorithm**: Exponential moving average (α = 0.1)

**API**: `POST /api/protected/fingerprint`

---

## Gamification Systems

### 9. Karma Engine

**Files**:
- [lib/gamify.ts](../apps/web/lib/gamify.ts)

**Karma Awards**:
| Action | Karma |
|--------|-------|
| Submit comment | +5 |
| Verify price | +10 |
| Report hazard (if zone offlined) | +20 |
| Unlock badge | +10 to +250 |

**API**: Uses internal `awardKarma()` function

---

### 10. Streak System

**Files**:
- [lib/streakManager.ts](../apps/web/lib/streakManager.ts)
- [components/StreakIndicator.tsx](../apps/web/components/StreakIndicator.tsx)

**Status**:
- `active`: Activity today
- `at_risk`: Last activity yesterday
- `broken`: More than 1 day gap

**API**: `GET/POST /api/protected/streaks`

---

### 11. Badge System

**Files**:
- [lib/badgeSystem.ts](../apps/web/lib/badgeSystem.ts)
- [components/BadgeGallery.tsx](../apps/web/components/BadgeGallery.tsx)

**Badge Rarities**: common, uncommon, rare, epic, legendary

**Example Badges**:
- `first_intel`: First report submitted
- `streak_5`: 5-day activity streak
- `zone_explorer_10`: Visited 10 unique zones
- `crisis_survivor`: Resolved a crisis event

**API**: `GET/POST /api/protected/badges`

---

### 12. Leaderboards

**Files**:
- [components/Leaderboard.tsx](../apps/web/components/Leaderboard.tsx)

**Types**: karma, level, streak

**Privacy**: Callsigns masked (first 2 + last 2 chars)

**API**: `GET /api/public/leaderboard?type=karma&city=bangkok`

---

## Privacy Features

### 13. Shadow Mode

**Files**:
- [lib/shadowMode.ts](../apps/web/lib/shadowMode.ts)
- [hooks/useShadowMode.ts](../apps/web/hooks/useShadowMode.ts)

**Allowed Actions**: view_map, view_zones, view_prices, download_pack, crisis_mode

**Local-Only Features**: operative_replay, texture_fingerprint, movement_history

---

## API Routes Reference

### Protected (Require Auth)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/protected/prices` | POST | Submit price with delta |
| `/api/protected/safe-return` | POST | Calculate extraction route |
| `/api/protected/crisis` | POST | Log crisis event |
| `/api/protected/quests` | GET, POST | Quest progress |
| `/api/protected/profile` | GET, PUT | User profile |
| `/api/protected/streaks` | GET, POST | Streak status |
| `/api/protected/badges` | GET, POST | Badge status |
| `/api/protected/fingerprint` | GET, POST | Texture fingerprint |

### Public

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/zones/whispers` | GET | Zone whispers |
| `/api/zones/beacons` | GET | Ghost beacons |
| `/api/public/leaderboard` | GET | Anonymous rankings |

### Cron (Internal)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/cron/auto-offline` | POST | Zone status automation |
| `/api/cron/data-retention` | POST | Data purging |

---

## Testing

### Unit Tests

```bash
pnpm test:unit
```

Test files in `apps/web/__tests__/`:
- `auth.test.ts` - Authentication
- `gamification.test.ts` - Karma, streaks, badges
- `operativeMode.test.ts` - Mode switching
- `crisisMode.test.ts` - Emergency features
- `shadowMode.test.ts` - Privacy mode
- `priceDelta.test.ts` - Price tracking
- `whisperEngine.test.ts` - Intel generation
- `safeReturnPath.test.ts` - Route calculation

### E2E Tests

```bash
pnpm test:e2e
```

Test files in `tests/e2e/`:
- `login.spec.ts` - Auth flows
- `zone-entry.spec.ts` - Map navigation
- `price-verification.spec.ts` - Price features
- `hazard-offline.spec.ts` - Offline & hazards
- `crisis-mode.spec.ts` - Emergency UI
- `gamification.spec.ts` - Badges & leaderboard

---

## Configuration

### Environment Variables

See `.env.example` for complete list:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_MAPTILER_KEY=

# Security
CRON_SECRET=

# Logging
LOG_LEVEL=info
```

### Feature Flags

Control features via environment:

```env
NEXT_PUBLIC_ENABLE_CRISIS_MODE=true
NEXT_PUBLIC_ENABLE_SHADOW_MODE=true
NEXT_PUBLIC_ENABLE_LEADERBOARD=true
```

---

## Database Migrations

Migrations in `migrations/`:

1. `001_gamification_tables.sql` - Karma, badges
2. `002_missing_links_and_spy_features.sql` - Additional tables
3. `003_safety_and_security.sql` - Security enhancements
4. `004_strategy_6_enhancements.sql` - Strategy 6.0++ features

Run migrations:
```bash
supabase db push
```

---

*This guide is part of the Unmapped OS Strategy 6.0++ documentation suite.*
