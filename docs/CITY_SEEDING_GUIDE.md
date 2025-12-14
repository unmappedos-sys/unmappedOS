# City Seeding System - Complete Guide

> **Version**: 1.0  
> **Last Updated**: December 2024  
> **System**: Unmapped OS Data Pipeline

## Overview

The City Seeding System is a deterministic, repeatable, auditable pipeline for generating city data packs for Unmapped OS. It replaces manual ad-hoc seeding with a systematic approach that ensures:

- **Real structural data** from OpenStreetMap
- **Believable behavioral baselines** derived from OSM patterns
- **Immediate usefulness** on day one
- **Honest freshness & confidence indicators**
- **Zero illegal scraping**
- **Zero fake real-time claims**

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CITY SEEDING PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ OSM Overpass │───►│ Zone Grid    │───►│ Anchor       │          │
│  │ API          │    │ Generator    │    │ Selection    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ POI Extract  │    │ Texture      │    │ Behavioral   │          │
│  │              │    │ Classifier   │    │ Baselines    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         └───────────────────┴───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│                    ┌──────────────┐                                 │
│                    │ Manual Seeds │◄──── Human-curated data        │
│                    └──────────────┘       (prices, emergency, etc.) │
│                             │                                       │
│                             ▼                                       │
│                    ┌──────────────┐                                 │
│                    │ City Pack    │                                 │
│                    │ Generator    │                                 │
│                    └──────────────┘                                 │
│                             │                                       │
│                             ▼                                       │
│    ┌────────────────────────┴────────────────────────┐             │
│    │                                                  │             │
│    ▼                                                  ▼             │
│ ┌──────────────┐                              ┌──────────────┐     │
│ │ Validation   │                              │ Confidence   │     │
│ │ & QA         │                              │ Engine       │     │
│ └──────────────┘                              └──────────────┘     │
│         │                                            │              │
│         └────────────────────┬───────────────────────┘              │
│                              ▼                                      │
│                     ┌──────────────┐                               │
│                     │ city_pack.json│◄──── Versioned, checksummed  │
│                     └──────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. City Pack Schema (`schema_v1.ts`)

Defines the canonical structure for all city packs:

```typescript
interface CityPackV1 {
  schema_version: string;
  meta: PackMeta;
  airport_intel: AirportIntel;
  zones: Zone[];
  anchors: Anchor[];
  price_baselines: PriceBaselines;
  safe_corridors: SafeCorridor[];
  cultural_facts: string[];
}
```

**Key Features:**
- Versioned schema for backward compatibility
- SHA-256 checksum for integrity verification
- Confidence scores at entity and pack level
- Freshness timestamps throughout

### 2. OSM Ingestion (`osm_ingest_v2.ts`)

Extracts structural data from OpenStreetMap via Overpass API:

```bash
# Run for a single city
npx ts-node scripts/packgen/osm_ingest_v2.ts bangkok

# Run for all configured cities
npx ts-node scripts/packgen/osm_ingest_v2.ts --all
```

**Configured Cities:**
- Bangkok, Tokyo, Singapore, Hong Kong, Seoul
- Bali, Kuala Lumpur, Hanoi, Ho Chi Minh City, Taipei

**Extraction includes:**
- Points of Interest (POIs) with categories
- Street network and intersections
- Zone grid generation
- Texture classification (SILENCE → CHAOS spectrum)

### 3. Anchor Selection (`anchor_selector.ts`)

Deterministic algorithm for selecting ONE anchor per zone:

**Priority Order:**
1. Artwork (public art) - 100
2. Fountain - 95
3. Memorial - 90
4. Plaza - 85
5. Temple/Shrine - 80
6. Statue - 75
7. Landmark - 70
8. Intersection (fallback) - 50
9. Station entrance (fallback) - 40
10. Park entrance (fallback) - 30

**Avoidance:**
- Access=private
- Tourism=information
- Construction sites
- Names containing "toilet", "parking", "ATM"

### 4. Behavioral Baselines (`baseline_behavior.ts`)

Computes expected behavioral patterns from OSM data:

- **Quiet Hours**: Times when zone activity is low
- **Vitality Hours**: Peak activity periods
- **Safety Windows**: Recommended exploration times
- **Crowd Patterns**: Expected density by hour

### 5. Manual Seeds (`data/manual-seeds/`)

Human-curated data that cannot be derived from OSM:

```json
{
  "emergency": {
    "police": "191",
    "ambulance": "1669",
    "fire": "199"
  },
  "airports": [...],
  "price_baselines": {
    "coffee": { "min": 35, "max": 150, "typical": 60 }
  },
  "cultural_facts": {...}
}
```

**STRICT LIMITS:**
- 10-20 data points per city maximum
- Ranges only, never single prices
- Human-verifiable information only
- No scraped data

### 6. Weather Modifiers (`weather_modifier.ts`)

Integrates Open-Meteo API for runtime weather impact:

```typescript
const impact = await getWeatherImpactForCity('bangkok');
// Returns: outdoor_viability, walking_penalty, safety_factor, warnings, tips
```

### 7. Confidence Engine (`confidence_engine_v2.ts`)

Manages data freshness and confidence:

**Confidence Decay:**
- OSM Structural: 0.01% per day
- OSM Derived: 0.1% per day
- Manual Seeds: 0.2% per day
- User Intel: 1% per day

**Verification Boost:**
- Each verification increases confidence
- Diminishing returns after multiple verifications
- Never exceeds initial confidence

### 8. Kill Switch (`kill_switch.ts`)

Automatic and manual controls for data safety:

**Kill Triggers:**
- ≥2 hazard reports → OFFLINE for 7 days
- ≥3 price anomalies → OFFLINE until verified
- Data staleness > 180 days → OFFLINE
- Manual admin kill → Immediate OFFLINE

### 9. Validation Tools (`validate_pack.ts`)

Comprehensive validation before release:

```bash
# Validate single pack
npx ts-node scripts/packgen/validate_pack.ts data/city-packs/bangkok_pack.json

# Validate all packs
npx ts-node scripts/packgen/validate_pack.ts --all data/city-packs/
```

**Validation Layers:**
1. Schema validation
2. Semantic validation
3. Cross-reference validation
4. Coverage validation

## Usage

### Generate a City Pack

```bash
# 1. Ingest OSM data
npx ts-node scripts/packgen/osm_ingest_v2.ts bangkok

# 2. Select anchors
npx ts-node scripts/packgen/anchor_selector.ts bangkok

# 3. Compute baselines
npx ts-node scripts/packgen/baseline_behavior.ts bangkok

# 4. Generate pack (combines all)
npx ts-node scripts/packgen/generate_pack.ts bangkok

# 5. Validate
npx ts-node scripts/packgen/validate_pack.ts data/city-packs/bangkok_pack.json
```

### Add a New City

1. **Add city config to `osm_ingest_v2.ts`:**
```typescript
new_city: {
  bbox: { north: ..., south: ..., east: ..., west: ... },
  timezone: 'Asia/...',
  currency: 'XXX',
  default_locale: 'xx',
  zone_radius_m: 500,
},
```

2. **Create manual seed file `data/manual-seeds/new_city.json`:**
```json
{
  "_meta": { "city_slug": "new_city", ... },
  "emergency": { ... },
  "airports": [ ... ],
  "price_baselines": { ... },
  "cultural_facts": { ... }
}
```

3. **Add weather config to `weather_modifier.ts`:**
```typescript
new_city: {
  latitude: ...,
  longitude: ...,
  timezone: 'Asia/...',
},
```

4. **Generate and validate the pack**

## Data Sources

| Data Type | Source | Freshness | Notes |
|-----------|--------|-----------|-------|
| Zone boundaries | OSM (computed) | Months | Based on bbox grid |
| POIs | OSM Overpass | Months | Slow-moving truth |
| Street network | OSM Overpass | Months | Very stable |
| Texture scores | OSM (computed) | Months | Algorithm-derived |
| Price baselines | Manual seeds | Quarterly review | Human-verified ranges |
| Emergency numbers | Manual seeds | Yearly review | Rarely change |
| Weather | Open-Meteo API | Real-time | 1-hour cache |
| User intel | User submissions | Varies | Requires verification |

## Confidence Model

### Initial Confidence by Source

| Source | Initial | Daily Decay | Minimum |
|--------|---------|-------------|---------|
| OSM Structural | 95% | 0.01% | 70% |
| OSM Derived | 80% | 0.1% | 50% |
| Manual Seed | 85% | 0.2% | 40% |
| User Intel | 60% | 1% | 20% |
| API Weather | 90% | Expires 1hr | 0% |

### Freshness Status

| Status | Max Age | Min Confidence |
|--------|---------|----------------|
| FRESH | 7 days | 80% |
| RECENT | 30 days | 60% |
| AGING | 90 days | 40% |
| STALE | 180 days | 20% |
| EXPIRED | >180 days | <20% |

## File Structure

```
scripts/packgen/
├── schema_v1.ts           # City Pack schema definition
├── osm_ingest_v2.ts       # OSM data extraction
├── anchor_selector.ts     # Anchor selection algorithm
├── baseline_behavior.ts   # Behavioral pattern computation
├── manual_seed_loader.ts  # Manual seed loading/validation
├── weather_modifier.ts    # Weather API integration
├── confidence_engine_v2.ts # Confidence/freshness management
├── kill_switch.ts         # Safety controls
├── validate_pack.ts       # Validation & QA tools
└── generate_pack.ts       # Pack generation orchestrator

data/
├── city-packs/            # Generated pack files
│   ├── bangkok_pack.json
│   ├── tokyo_pack.json
│   └── ...
└── manual-seeds/          # Human-curated seed data
    ├── bangkok.json
    ├── tokyo.json
    └── ...
```

## Testing

```bash
# Run unit tests
npm test -- --grep="city seeding"

# Run validation on all packs
npm run validate:packs

# Generate test report
npm run test:coverage
```

## Principles

### What We DO:
- ✅ Extract structural truth from OSM
- ✅ Compute behavioral patterns algorithmically
- ✅ Show confidence and freshness honestly
- ✅ Kill stale/dangerous data automatically
- ✅ Maintain full audit trails

### What We DON'T:
- ❌ Scrape real-time business data
- ❌ Claim data is fresher than it is
- ❌ Show potentially dangerous stale data
- ❌ Make up prices or crowd levels
- ❌ Use proprietary data sources

## Troubleshooting

### OSM API Timeout
```
Error: Overpass API timeout
```
- Reduce bbox size in city config
- Add delay between requests
- Try during off-peak hours

### Validation Errors
```
ERROR: Zone missing bounds
```
- Check osm_ingest output
- Verify city config bbox
- Ensure POIs exist in area

### Confidence Too Low
```
WARNING: Pack confidence below 60%
```
- Regenerate with fresh OSM data
- Add user verifications
- Check for anomaly flags

## Contributing

1. All changes must pass validation
2. New cities require manual seed review
3. Schema changes require version bump
4. Document all data source changes

---

*"When in doubt, go OFFLINE. A zone showing outdated data is DANGEROUS. Better to show nothing than show lies."*
