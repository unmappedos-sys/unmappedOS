# Unmapped OS - Product Requirements Document (PRD)

**Version**: 3.0 (Strategy 6.0++ with Intelligence Layer)  
**Date**: December 2025  
**Status**: Production-Ready with Advanced Intelligence Features

## 🎯 Latest Updates (v3.0)

### NEW: Intelligence Layer (Phase 2)
- **Dynamic Texture System**: Real-time zone adaptation (SILENCE → ANALOG → NEON → CHAOS)
- **Whisper Engine**: Contextual micro-intel with confidence scoring
- **Ghost Beacons**: Ephemeral POI discovery with haptic feedback
- **Safe Corridors**: Vitality-based pathfinding for night operations

### NEW: Memory & Personalization (Phase 5)
- **Operative Replay**: Local-only movement timeline with zone-level privacy
- **Texture Fingerprint**: Client-side preference learning and zone recommendations

### NEW: Scaling Infrastructure (Phase 7)
- **Redis Caching**: <50ms response times for critical queries
- **Edge APIs**: Global CDN deployment for zone lookups and whispers
- **DB Optimization**: Connection pooling and PostGIS spatial indexes

### Test Coverage
- Unit tests: Texture System, Ghost Beacons, Fingerprint
- E2E tests: Safe Corridors, Crisis Mode, Texture Fingerprint
- Integration tests: Activity logging, pack downloads

---

## Executive Summary

**Unmapped OS** is a field intelligence platform for urban operatives navigating unfamiliar cities. It provides offline city packs, algorithmic anchor-based navigation, crowdsourced structured comments with peer verification, advanced zone search, hazard reporting with auto-moderation, and privacy-focused snapshot GPS. The MVP targets Bangkok and Tokyo as seed cities with full search, comment verification, karma rewards, and offline-first sync capabilities.

---

## Problem Statement

Travelers and digital nomads face:
- **Navigation fragility**: GPS requires constant connectivity; Google Maps fails offline
- **Information asymmetry**: Pricing, hazards, and local intel not accessible or verifiable in real-time
- **Privacy concerns**: Always-on location tracking by commercial apps
- **Tourist traps**: Lack of crowd-verified, trust-scored local intelligence
- **Search limitations**: No offline-capable zone discovery with texture/time/price filtering
- **Moderation gaps**: User-generated content lacks peer verification and trust scoring

---

## Target Audience

**Primary Personas**:
1. **Digital Nomads** (25-40): Remote workers exploring new cities monthly
2. **Frequent Travelers** (30-55): Business travelers needing offline city intel
3. **Urban Explorers** (20-35): Adventurous tourists seeking authentic, verified experiences

**Key Needs**:
- Offline-first navigation with stable anchors
- Real-time, verified hazard/intel from trusted community
- Privacy-preserving snapshot GPS (no tracking)
- Advanced search with texture, time, and price filters
- Export to familiar tools (Google Maps)
- Peer verification system for trust scoring

---

## MVP Features (v1.0 - Strategy 6.0)

### Core Features

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| **City Packs (Black Box)** | Downloadable offline intelligence bundles with embedded search index and top comments | User downloads Bangkok/Tokyo pack <1MB; app renders map offline from IndexedDB; search works offline |
| **Anchor Navigation** | Algorithmic selection of stable POIs with priority/negative filtering | Anchor algorithm selects tourism/transit/historic nodes; scores by proximity+connectivity+tags; fallback to high-degree intersections; selection_reason documented |
| **Advanced Search** | Server-side + client-side search with ranking formula | Search API accepts q, texture, time, radius, price_max, max_hassle; returns scored results; offline search uses embedded pack index |
| **Structured Comments** | Field intelligence with 10 predefined tags and 240-char notes | SHORT_TAG dropdown (CONSTRUCTION, CROWD_SURGE, OVERPRICING, HASSLE, SAFETY_OBSERVED, GOOD_FOR_DAY, GOOD_FOR_NIGHT, CLEAN, TOILET_AVAILABLE, ACCESS_ISSUE); rate limit 1/zone/12h; banned patterns filtered |
| **Comment Verification** | GPS-verified peer review with trust scoring | Verification requires <500m from anchor; vote accurate/inaccurate; trust_score updated; karma +5; verified badge at trust>20; one vote per user per comment |
| **Karma & Rewards** | Gamified contribution system with logged history | +5 comment submit, +10 price verify, +20 hazard report (if zone disabled), +5 verification; karma_logs table tracks all; displayed in Operative Record |
| **Hazard Reporting + Kill Switch** | Crowdsourced reports with automated zone moderation | User submits report (OBSTRUCTION, SAFETY, CLOSED, SCAM, etc.); agg-check runs daily; 2+ distinct users in 24h → zone OFFLINE for 7 days; reporters get +20 karma |
| **Tactical Display** | Real-time map with neon zones, anchor icons, and HUD | Zones render as pulsing polygons; anchors as ring icons; anchor-lock animation <50m; Day/Night Ops themes; collapsible HUD; vibration patterns; StatusPanel shows intel |
| **Export to Maps + Clipboard** | One-tap export with cheat sheet copy | Click "EXPORT TO GOOGLE MAPS" opens google.com/maps with lat,lon; cheat sheet (prices, emergency numbers, phrases) copied to clipboard; activeTrip flag set |
| **Snapshot GPS** | Privacy-first location with dev simulation | Location requested only on user action; no continuous tracking; accuracy displayed; dev mode allows manual coords |
| **Active Trip** | 45-minute check-in timer with notifications | Export starts trip; timer counts down; notification at 45min; Trip Dashboard overlay persists |
| **Offline Queue & Sync** | Auto-sync comments/reports when online | Comments/reports queued in localStorage if offline; auto-sync on connection restore; retry up to 3 times; sync status displayed |
| **PWA** | Progressive Web App with full offline support | Service worker caches app shell + requested packs; installable on mobile/desktop; offline map renders from IndexedDB |
| **Cinematic UX** | Mission lexicon + TerminalLoader + themes | All UI uses Mission Lexicon terms; TerminalLoader shows progress; Day Ops (black-on-amber), Night Ops (green-on-black); Ghost Mode toggle; AA contrast |

### Data Sources (Open Only)

- **OpenStreetMap** (Overpass API): POIs, roads, boundaries for anchor selection
- **OpenTripMap**: Tourist attractions (fallback)
- **Wikidata**: Entity metadata (optional enrichment)
- **RestCountries**: Emergency numbers, currency info
- **Open-Meteo**: Weather data (future roadmap)

**Prohibited**: Scraping Google, Numbeo, Teleport, TripAdvisor, or any paid/proprietary APIs.

---

## User Flows

### 1. New User Onboarding
```
Landing → AUTHENTICATE IDENTITY (OAuth) → Boot Sequence Animation → 
Permission Modals (Location, Notifications) → City Selection → 
"ACQUIRE CITY BLACK BOX: BANGKOK" → TerminalLoader Progress → 
Pack Stored in IndexedDB → Tactical Display
```

### 2. Navigate to Anchor (Offline)
```
Open Tactical Display → Select Zone → View Anchor Info + Top Intel → 
"EXPORT TO GOOGLE MAPS" → Opens Maps + Copies Cheat Sheet → 
Navigate IRL → Return to App → "CALIBRATE FIELD POSITION" → 
Anchor Lock Animation (<50m) → "UPDATE INTEL" Modal → 
Select SHORT_TAG + Note → Submit → Karma +5
```

### 3. Search for Zone
```
Landing / Tactical Display → Search Box "SCAN SECTOR" → 
Type "temple" → Select Texture Filter "TEMPLES" → Select Time "DAY OPS" → 
Results Ranked by Score → Click Result → Navigate to /map/bangkok?zone=BKK_001 → 
Zone Details + Comments + Anchor
```

### 4. Verify Intel
```
Tactical Display → View Zone Intel → Click Comment → "VERIFY INTEL" → 
Grant GPS (check <500m from anchor) → Vote "ACCURATE" → 
Submit → Trust Score +10 → Verified Badge (if trust>20) → Karma +5
```

### 5. Report Hazard
```
Tactical Display → Observe Obstruction → "REPORT SIGNAL NOISE" → 
Category: "OBSTRUCTION" → Description: "Road construction" → Submit → 
Background: agg-check runs → If 2+ users report same zone in 24h → 
Zone Status OFFLINE for 7 days → Reporters Karma +20 → 
Map UI shows "ZONE STATUS: OFFLINE // USER REPORTS INDICATE OBSTRUCTION"
```

---

## Technical Architecture

### Frontend
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS with Day/Night Ops custom themes
- **State**: React Context (OpsContext) + Custom Hooks
- **Storage**: IndexedDB via idb for city packs, offline queue
- **Map**: Mapbox GL JS (primary with token) / MapLibre (fallback with open tiles)
- **PWA**: next-pwa or workbox for service worker and offline caching

### Backend (API Routes)
- **/api/search**: Server-side search with scoring formula
- **/api/comments**: POST structured intel with validation
- **/api/comments/list**: GET comments by zone, sorted by trust
- **/api/comments/verify**: POST verification vote with GPS check
- **/api/comments/flag**: POST moderation flags
- **/api/reports**: POST hazard reports
- **/api/agg-check**: Daily aggregation for kill-switch logic
- **/api/prices**: POST price verifications
- **/api/auth-sync**: Sync session cookies with Supabase auth
- **/api/packs/[city]**: Serve city pack JSON

### Database (Supabase PostgreSQL)
- **profiles**: user_id, email, karma, ghost_mode
- **zones**: zone_id, city, anchor details, hassle_score, price_median, texture_tags, search_vector, status
- **comments**: zone_id, user_hash, short_tag, note, price, trust_score, verified, moderated
- **comment_verifications**: comment_id, verifier_id, vote, verification_weight
- **comment_flags**: comment_id, reporter_id, reason
- **reports**: zone_id, user_id, category, severity, status
- **karma_logs**: user_id, delta, reason, related_id
- **cities**: city metadata with pack_version, pack_generated_at
- **zone_search_index** (materialized view): aggregated search data

### Shared Library (packages/lib)
- **anchor.ts**: Anchor selection algorithm with Overpass queries
- **overpass.ts**: Overpass API query templates and execution
- **scoring.ts**: Zone scoring functions (anchor quality, hassle, trust)
- **PWA**: Workbox service worker

### Backend
- **API**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage (future: city pack hosting)
- **Functions**: Supabase Edge Functions (aggregation)

### Data Pipeline
```
Overpass API → packgen script → city_pack.json → 
/public/data → Service Worker → IndexedDB → Map Render
```

### Database Schema (Simplified)

**users**: id, email, provider, karma, created_at  
**reports**: id, user_id, zone_id, category, metadata, created_at  
**prices**: id, user_id, zone_id, item, amount, currency, created_at  
**zones**: zone_id (pk), city, geometry, anchor, status, created_at  
**karma_logs**: id, user_id, delta, reason, created_at

---

## Acceptance Criteria (Test Scenarios)

### Functional Tests

1. **City Pack Download**
   - Given: User on city dossier page
   - When: Clicks "Download Bangkok Pack"
   - Then: Progress bar shows; IndexedDB stores pack; map renders offline

2. **Anchor Selection Algorithm**
   - Given: Zone polygon with centroid at (13.7563, 100.5018)
   - When: Algorithm queries Overpass within 50m-150m radii
   - Then: Selects node with tourism/transit tag; fallback to intersection

3. **Hazard Kill Switch**
   - Given: Zone BKK_001 status is ACTIVE
   - When: 2 distinct users report OBSTRUCTION in 24 hours
   - Then: Zone status updates to OFFLINE; UI shows grayed out

4. **Export to Google Maps**
   - Given: User clicks anchor "Democracy Monument"
   - When: Clicks "Export to Maps"
   - Then: Opens google.com/maps/search?api=1&query=13.7563,100.5018; clipboard contains cheat sheet

5. **Karma Increment**
   - Given: User karma is 50
   - When: Submits price verification for coffee (60฿)
   - Then: Karma increments to 60; shown in Operative Record

### Non-Functional Tests

- **Performance**: Map loads in <2s with 12 zones; offline pack size <5MB
- **Accessibility**: All buttons have ARIA labels; keyboard navigable
- **Security**: API routes validate inputs with Zod; no raw GPS history stored
- **Privacy**: Reports anonymized; user_id hashed; opt-in consent modal

---

## Data Governance & Compliance

### GDPR/CCPA Readiness

| Requirement | Implementation |
|-------------|----------------|
| **Data Minimization** | No GPS history; only zone_id hits with timestamps |
| **Consent** | Explicit opt-in modal for reports/prices |
| **Access Rights** | API endpoint `/api/user/data` returns all user data |
| **Deletion Rights** | API endpoint `/api/user/delete` removes all user records |
| **Retention** | Default 2 years; automated cleanup script |
| **Portability** | Export user data as JSON |

### Data Retention Policy

- **Reports**: 2 years from submission
- **Prices**: 2 years from submission
- **User Accounts**: Indefinite (until user deletion request)
- **Karma Logs**: Indefinite (anonymized after 2 years)

### Security Measures

- Input validation (Zod schemas)
- Rate limiting (Upstash Redis or Vercel rate limit)
- Supabase RLS (Row Level Security) policies
- HTTPS only (enforced by Vercel)
- No API keys in client code

---

## Monetization Hooks (Future)

### Premium Cheat Sheets ($2.99/city)
- Expanded cultural notes, scam warnings, local phrases
- Expert-curated vs. community-generated

### City Pack Subscriptions ($9.99/month)
- Access to 50+ cities
- Real-time hazard updates via WebSocket
- Priority support

### B2B Licensing ($499/month)
- White-label city packs for travel agencies
- API access for integrations
- Custom city pack generation

### Marketplace Commission (15%)
- Community-generated city packs
- Revenue share with pack creators

---

## Roadmap

### v1.0 (MVP) - Q1 2026
- ✅ Bangkok & Tokyo city packs
- ✅ Offline-first PWA
- ✅ Anchor algorithm
- ✅ Hazard reporting + karma
- ✅ Export to Google Maps

### v2.0 - Q2 2026
- iOS Live Activity integration (native module)
- Android persistent notifications (native module)
- Add Singapore, Saigon, Manila, Kuala Lumpur
- Real-time hazard aggregation (WebSocket)
- Premium cheat sheet paywall (Stripe)

### v3.0 - Q4 2026
- B2B API marketplace
- Community city pack builder (UI)
- Multi-language support (Thai, Japanese, Vietnamese)
- Wearable integrations (Apple Watch complications)

### v4.0 - Q1 2027
- AR anchor overlays (WebXR)
- Voice navigation ("200 meters to anchor")
- Social features (operative connections)

---

## Success Metrics (KPIs)

### Acquisition
- 10,000 MAU (Monthly Active Users) by end of Q1 2026
- 30% install-to-activation rate (download pack)

### Engagement
- 5 sessions per user per trip (avg)
- 60% D7 retention (Day 7 retention)
- 2 reports submitted per user per trip

### Monetization
- $5 ARPU (Average Revenue Per User) by Q4 2026
- 15% conversion to premium subscriptions

### Quality
- <2% zone disable rate (false positives)
- 4.5+ app store rating
- <1s map load time (p95)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Overpass Rate Limiting** | High | Exponential backoff; cached fallback anchors |
| **Low Crowdsource Participation** | Medium | Karma incentives; onboarding education |
| **False Hazard Reports** | High | Require 2+ distinct users; karma penalties for abuse |
| **Mapbox Token Exposure** | Low | Use public token with domain restrictions |
| **GDPR Compliance Failure** | High | Legal review; automated deletion scripts |

---

## Open Questions (Post-MVP)

1. How to incentivize pack creation for smaller cities?
2. Should we integrate paid data sources for premium tier?
3. Native app vs. PWA for Live Activity support?
4. Partnership opportunities with travel insurance companies?

---

## Appendix

### Glossary

- **Anchor**: Stable geographic POI used for navigation reference
- **Zone**: Geographic polygon representing urban texture (commercial, residential, etc.)
- **Cheat Sheet**: Quick reference card with prices, phrases, emergency numbers
- **City Pack**: Offline bundle of zones, anchors, prices, cheat sheets
- **Operative**: User persona; field agent navigating the city
- **Karma**: Gamified contribution score

### Related Documents

- Technical Spec: `/docs/TECHNICAL_SPEC.md` (future)
- API Documentation: `/docs/API.md` (future)
- Design System: `/docs/DESIGN_SYSTEM.md` (future)

---

**Document Owner**: Unmapped Dev  
**Last Updated**: December 12, 2025  
**Next Review**: March 1, 2026
