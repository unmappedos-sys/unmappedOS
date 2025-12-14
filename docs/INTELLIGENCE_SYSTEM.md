# Intelligence System Architecture

> **Core Principle**: Unmapped OS must NEVER claim perfect real-time accuracy. Instead, it detects change, shows confidence, adapts behavior, degrades gracefully, and stays useful offline.

## Table of Contents

1. [How Our Intel Works](#how-our-intel-works)
2. [What "Real-Time" Means Here](#what-real-time-means-here)
3. [Why We Don't Pin Places](#why-we-dont-pin-places)
4. [How Confidence is Calculated](#how-confidence-is-calculated)
5. [The Kill Switch](#the-kill-switch)
6. [Weather Integration](#weather-integration)
7. [Offline Mode](#offline-mode)
8. [Contributing Intel](#contributing-intel)

---

## How Our Intel Works

Unmapped OS uses a **multi-source intelligence system** that combines:

### 1. OpenStreetMap Foundation
We ingest structural data from OpenStreetMap via the Overpass API:
- POI locations (cafes, restaurants, ATMs, pharmacies)
- Street networks and pedestrian paths
- Lighting infrastructure
- Opening hours (when available)

**This data is our "structural baseline"** - it tells us what *exists*, not what it's *like*.

### 2. User Intel Layer
Real travelers submit ground-truth observations:
- **Price reports**: What things actually cost
- **Hassle reports**: Scams, aggressive vendors, overcharging
- **Crowd levels**: Current density and wait times
- **Zone verification**: Confirming or correcting our data
- **Hazard alerts**: Safety concerns

### 3. Weather Modifiers
Live weather data from Open-Meteo adjusts recommendations:
- Rain reduces outdoor zone scores
- Extreme heat penalizes walking-heavy areas
- Good weather boosts parks and outdoor markets

### 4. Time Context
Zones have time-based relevance:
- Night markets peak in evening
- Temple areas best in morning
- Bar districts activate at night

---

## What "Real-Time" Means Here

**We don't claim real-time accuracy.** Here's what we actually mean:

| Term | What It Means |
|------|---------------|
| "Live weather" | Weather data cached for 15 minutes |
| "Current prices" | Most recent user-reported prices (may be hours/days old) |
| "Recent intel" | Reports from the last 24-48 hours |
| "Fresh data" | Confidence score > 80% with intel < 7 days old |

### Data Freshness Indicators

We display freshness clearly:

```
🟢 Fresh (< 24h intel, > 80% confidence)
🟡 Recent (< 7d intel, > 60% confidence)
🟠 Stale (< 30d intel, > 40% confidence)
🔴 Degraded (> 30d since intel, or < 40% confidence)
```

---

## Why We Don't Pin Places

Traditional travel apps pin exact locations. **We don't, and here's why:**

### 1. Things Move
Street vendors relocate. Temporary markets appear and disappear. That coffee cart might not be there tomorrow.

### 2. Things Change
A "cheap local spot" can become a tourist trap. A quiet alley can become a construction zone. Prices shift daily.

### 3. Pinning Creates False Confidence
A pin on a map implies "this is here, go there." We prefer zones with texture descriptions that help you find the *type* of experience you want.

### Our Approach: Zone Textures

Instead of pins, we describe areas by their **texture**:

```
NIGHT MARKET ZONE
├── Primary: night-market
├── Secondary: street-food, local-market
├── Tourist density: MEDIUM
├── Hassle factor: 4/10
├── Walkability: 8/10
└── Best times: evening, night
```

This tells you: "In this area, you'll find night market vibes with street food. Moderate tourists, low hassle, easy to walk around. Best at night."

---

## How Confidence is Calculated

Every zone has a **confidence score** (0-100) that represents how much we trust our data.

### Factors That Increase Confidence

| Factor | Boost |
|--------|-------|
| User verification | +15 points |
| Price submission | +8 points |
| Hassle report | +10 points |
| Multiple confirmations | Cumulative (capped at +30/day) |
| High-karma user report | Up to 1.5x multiplier |

### Factors That Decrease Confidence

| Factor | Penalty |
|--------|---------|
| Time decay | -2% per day (after 24h grace) |
| Conflicting reports | -10 points |
| Hazard report | -5 to -20 points |
| No recent intel | Gradual decay to minimum |

### Confidence Levels

```
HIGH     (80-100): Recent, verified, multiple confirmations
MEDIUM   (60-79):  Some recent intel, generally reliable
LOW      (40-59):  Limited recent data, use with caution
DEGRADED (20-39):  Very old or conflicting data
OFFLINE  (n/a):    Zone disabled due to safety concerns
```

### The Math

```typescript
// Daily decay (runs at 00:00 UTC)
newScore = currentScore * (1 - DECAY_RATE)  // DECAY_RATE = 0.02

// Intel boost
boost = BASE_BOOST * karmaMultiplier * (1 - currentConfidence/100)
// Diminishing returns: harder to boost already-high confidence

// Conflict penalty
if (hasConflictingReports) {
  score -= CONFLICT_PENALTY  // -10 points
}
```

---

## The Kill Switch

When a zone becomes unsafe, we **take it offline**.

### Trigger Conditions

| Condition | Action |
|-----------|--------|
| 2+ hazard reports in 24h | Zone OFFLINE for 7 days |
| 1 critical hazard report | Zone OFFLINE for 14 days |
| Admin flag | Immediate offline |

### What "Offline" Means

- Zone appears with red warning banner
- Intel submission disabled
- Zone excluded from recommendations
- Navigation shows alternative routes
- Clear message: "This zone is temporarily unavailable"

### Recovery

After the offline period:
1. Zone returns with DEGRADED confidence (50%)
2. Requires fresh verification to rebuild trust
3. Previous hazard reports archived (not deleted)

---

## Weather Integration

We use [Open-Meteo](https://open-meteo.com/) for weather data (free, no API key).

### Weather Modifiers

| Condition | Effect |
|-----------|--------|
| Rain (>50% probability) | -20% walkability, boost indoor zones |
| Thunderstorm | -30% walkability, -10% safety, strong indoor preference |
| Extreme heat (>35°C) | -15% walkability for outdoor zones |
| High humidity (>85%) | -10% comfort modifier |
| Good weather (clear, 20-28°C) | +10% outdoor zone boost |

### Indoor vs Outdoor Zones

Some textures are "weather-resistant":
- `modern-mall` ✅
- `transit-hub` ✅
- `night-market` ❌ (usually outdoor)
- `park` ❌
- `street-food` ❌

Weather impacts adjust recommendation rankings accordingly.

---

## Offline Mode

Unmapped OS works without internet. Here's how:

### City Packs

Each city has a downloadable pack containing:
- Zone definitions and textures
- Confidence snapshots (at download time)
- Basic POI data
- Pricing baselines
- Map tiles (optional)

### Offline Limitations

| Feature | Offline Status |
|---------|---------------|
| Browse zones | ✅ Works |
| View confidence | ⚠️ Snapshot only (marked as stale) |
| See prices | ✅ Works (cached) |
| Weather data | ❌ Unavailable |
| Submit intel | ⏳ Queued for sync |
| Get recommendations | ⚠️ Works (no weather/real-time factors) |

### Staleness Handling

Offline data shows clear warnings:
- "Data is X days old"
- Confidence automatically reduced for stale packs
- UI clearly indicates offline mode

---

## Contributing Intel

Help improve the system by submitting accurate intel.

### Intel Types

| Type | Karma Reward | Notes |
|------|--------------|-------|
| Price submission | +5 | Include item, price, location context |
| Quiet zone confirmation | +3 | Confirms area is calm |
| Crowd alert | +3 | Reports unusual crowding |
| Hassle report | +10 | Scams, overcharging, aggression |
| Construction alert | +8 | Roadwork, closures |
| Zone verification | +10 | Full zone accuracy check |
| Hazard report | +15 | Safety concerns (triggers review) |

### Best Practices

1. **Be specific**: "Coffee 45 THB at corner cafe" > "Coffee cheap here"
2. **Be recent**: Submit what you saw *today*, not last week
3. **Be honest**: Wrong intel hurts everyone
4. **Don't spam**: Rate limits exist (10 reports/hour)

### Karma System

Your karma affects your intel's weight:
- New users: 1.0x weight
- 100+ karma: 1.2x weight
- 500+ karma: 1.5x weight
- Trusted contributors: Additional verification bypass

Build karma by submitting accurate, verified intel over time.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UNMAPPED OS INTEL SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   OSM DATA  │    │ USER INTEL  │    │   WEATHER   │     │
│  │  (Baseline) │    │  (Ground)   │    │   (Live)    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              CONFIDENCE ENGINE                        │  │
│  │  • Time decay        • Intel boost                   │  │
│  │  • Conflict detect   • Anomaly flag                  │  │
│  │  • Kill switch       • Recovery logic                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              RECOMMENDATION RANKER                    │  │
│  │  Weights: Texture 30% | Confidence 25% | Time 15%    │  │
│  │           Weather 15% | Distance 15%                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    HUD / UI                           │  │
│  │  • Confidence bars   • Warning banners               │  │
│  │  • Freshness dots    • Offline indicators            │  │
│  │  • Explainable tips  • Intel forms                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Submit Intel
```
POST /api/intel/submit
Body: {
  zone_id: string,
  type: IntelType,
  data: object
}
```

### Get Zone Confidence
```
GET /api/zones/{zone_id}/confidence
Returns: {
  score: number,
  level: string,
  data_age_days: number,
  last_intel: string,
  is_offline: boolean
}
```

### Get Recommendations
```
POST /api/recommend
Body: {
  city: string,
  location: { lat, lng },
  preferences: { textures, time, budget }
}
Returns: RankedZone[]
```

---

## Changelog

- **v2.0.0**: Complete intelligence system rewrite
  - Added confidence scoring
  - Implemented kill switch
  - Weather integration
  - Recommendation ranker
  - Offline-first city packs

---

*Questions? See [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue.*
