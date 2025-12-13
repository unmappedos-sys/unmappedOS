# Unmapped OS v3.0

**The Unmapped Operating System — Field intelligence for urban operatives.**

A Next.js TypeScript PWA providing offline-first city intelligence packs, tactical map visualization, anchor-based navigation, hazard reporting, crowdsourced structured comments with verification, and advanced zone search. Built for operatives navigating unfamiliar urban terrain.

## ⚡ Latest: Strategy 6.0++ Complete

### 🆕 Intelligence Layer (v3.0)
- **Dynamic Texture System**: Real-time zone adaptation (SILENCE → ANALOG → NEON → CHAOS) based on time, incidents, and crowd density
- **Ghost Beacons**: Ephemeral POI discovery with haptic feedback, 24-hour expiration, and proximity triggers
- **Whisper Engine**: Contextual micro-intel with confidence scoring and template-based generation
- **Safe Corridors**: Vitality-based pathfinding with night mode warnings and alternative routes

### 🧠 Memory & Personalization
- **Operative Replay**: Local-only movement timeline with zone-level privacy (IndexedDB storage)
- **Texture Fingerprint**: Client-side preference learning with travel style classification (explorer/local/nightcrawler/daytripper/balanced)
- **Zone Recommendations**: Personalized suggestions based on fingerprint affinity scores

### 🚀 Scaling & Performance
- **Redis Caching**: <50ms response times for critical queries (Upstash integration)
- **Edge APIs**: Global CDN deployment for zone lookups and whispers (Vercel Edge Runtime)
- **DB Optimization**: Connection pooling, PostGIS spatial indexes, and query retry logic

### 🛡️ Safety & Resilience
- **Crisis Mode**: Shake gesture detection, emergency contacts, offline safe phrases
- **Shadow Mode**: Read-only privacy mode with coordinate coarsening and anonymous IDs
- **Safe Return Path**: Vitality-based extraction routes for dangerous situations

## 🎯 Core Features

### Foundation (Strategy 6.0)
- **Offline City Packs**: Download Bangkok & Tokyo intelligence packs (<1MB) for offline use
- **Anchor-Based Navigation**: Algorithmic selection of stable geographic anchors using OpenStreetMap data
- **Tactical Display**: Real-time map with neon zone overlays and anchor visualization
- **Snapshot GPS**: Privacy-focused location tracking (snapshot only, no continuous tracking)
- **PWA**: Full Progressive Web App with service worker and offline capability
- **Advanced Search**: Server-side search with ranking algorithm (texture, anchor quality, hassle, price, freshness)
- **Structured Comments**: Field intelligence system with 10 predefined tags and 240-char notes
- **Comment Verification**: GPS-verified peer review system with trust scoring
- **Karma System**: Reward operatives for verified intel (+5 comments, +10 price verification, +20 hazard reports)
- **Hazard Reporting**: Crowdsourced reports with automated zone kill-switch (2+ reports = 7-day offline)
- **Export to Maps**: One-tap export to Google Maps with cheat sheet clipboard copy
- **Active Trip**: 45-minute check-in timer with notifications for exported routes

### Advanced Features (Strategy 6.0++)
- **Gamification**: Karma, badges (common → legendary), streak system, leaderboards
- **Price Delta Engine**: Real-time overpricing detection with zone median comparison
- **Operative Modes**: Auto-switching modes (FAST_OPS, DEEP_OPS, SAFE_OPS, CRISIS, STANDARD)
- **Device-to-Device Pack Sharing**: QR code and file export for peer-to-peer transfer

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) **OR** npm (comes with Node.js)
- Supabase account (free tier) - optional for local dev

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/unmapped-os.git
cd unmapped-os

# Install pnpm if you don't have it (optional but faster)
npm install -g pnpm

# Install dependencies (choose one)
pnpm install
# OR
npm install

# Copy environment template
cp .env.example .env

# Generate city packs
pnpm run packgen:all
# OR
npm run packgen:all

# Start development server
pnpm dev
# OR
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Environment Setup

1. **Mapbox (Optional but Recommended)**
   - Get free token: https://account.mapbox.com/auth/signup/
   - Add to `.env`: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here`
   - Fallback: MapLibre vector tiles used if token not provided

2. **Supabase (Required for Auth & Crowdsourcing)**
   - Create project: https://supabase.com/dashboard
   - Get URL and keys from Settings > API
   - **📖 See [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) for complete auth setup**
   - Run migration: `pnpm run seed:db`

3. **NextAuth (Deprecated - Using Supabase Auth)**
   - Generate secret: `openssl rand -base64 32`
   - Add to `.env`: `NEXTAUTH_SECRET=your_secret_here`

### Running Tests

```bash
# Unit tests (Jest)
pnpm test

# With coverage
pnpm test:coverage

# Integration tests (Playwright)
pnpm test:integration
```

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm start` - Start production server
- `pnpm lint` - Lint code
- `pnpm format` - Format code with Prettier
- `pnpm packgen:bangkok` - Generate Bangkok city pack
- `pnpm packgen:tokyo` - Generate Tokyo city pack
- `pnpm packgen:all` - Generate all city packs
- `pnpm seed:db` - Seed Supabase database
- `pnpm seed:all` - Generate packs and seed database

## 📁 Project Structure

```
unmapped-os/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── pages/              # Next.js pages (landing, map, operative)
│       ├── components/         # React components
│       ├── lib/                # App-specific utilities
│       ├── styles/             # Global styles
│       └── public/             # Static assets
├── packages/
│   └── lib/                    # Shared library
│       └── src/
│           ├── anchor.ts       # Anchor selection algorithm
│           ├── overpass.ts     # Overpass API queries
│           ├── scoring.ts      # Zone scoring logic
│           └── types.ts        # Shared TypeScript types
├── scripts/
│   ├── packgen/                # City pack generation
│   │   ├── generate_pack.ts   # Main pack generator
│   │   └── generate_all.ts    # Batch generator
│   └── seed/                   # Database seeding
│       └── seed_database.ts   # Supabase seed script
├── infrastructure/
│   ├── supabase/               # Supabase schema
│   │   └── schema.sql         # Database schema
│   └── github/                 # GitHub Actions
│       └── workflows/
│           ├── ci.yml          # CI pipeline
│           └── packgen_cron.yml # Weekly pack regeneration
├── tests/
│   ├── unit/                   # Jest unit tests
│   └── integration/            # Playwright E2E tests
├── data/
│   ├── packs/                  # Generated city packs
│   │   ├── bangkok_pack.json
│   │   └── tokyo_pack.json
│   └── seed/                   # Seed data (zones, prices)
└── i18n/
    └── en.json                 # Mission lexicon strings
```

## 🧭 Architecture

### Anchor Selection Algorithm

The core navigation system selects stable geographic anchors using OpenStreetMap data:

1. **Zone Analysis**: Compute centroid of zone polygon
2. **Radius Expansion**: Query nodes/ways at 50m, 100m, 150m radii
3. **Priority Filtering**: Prioritize tourism, transit, historic landmarks
4. **Negative Filtering**: Exclude waste disposal, parking, industrial
5. **Scoring**: Proximity + connectivity + tag richness
6. **Fallback**: High-degree street intersections if no POI found

See [packages/lib/src/anchor.ts](packages/lib/src/anchor.ts) for implementation.

### City Pack Schema

```json
{
  "city": "bangkok",
  "generated_at": "2025-12-12T10:00:00Z",
  "version": 1,
  "zones": [{
    "zone_id": "BKK_001",
    "polygon": { "type": "Polygon", "coordinates": [[...]] },
    "centroid": { "lat": 13.7563, "lon": 100.5018 },
    "texture_type": "COMMERCIAL_DENSE",
    "neon_color": "#FF00FF",
    "anchor_candidates": [...],
    "selected_anchor": {
      "id": "node/123456",
      "lat": 13.7563,
      "lon": 100.5018,
      "name": "Democracy Monument",
      "tags": { "tourism": "monument" }
    },
    "price_medians": {
      "coffee": 60,
      "beer": 80,
      "taxi_airport": 350
    },
    "cheat_sheet": {
      "taxi_phrase": "ไปสนามบิน",
      "price_estimates": "Coffee 60฿ | Beer 80฿",
      "emergency_numbers": {
        "police": "191",
        "ambulance": "1669",
        "embassy": "+66-2-205-4000"
      }
    },
    "status": "ACTIVE"
  }],
  "meta": { "source": "packgen v1", "seed_count": 12 }
}
```

### Data Flow

```
User Request → Next.js API Route → Supabase → Response
                    ↓
              Service Worker → IndexedDB (Offline)
                    ↓
              Map Component → Render Zones & Anchors
```

## 🔒 Privacy & Security

- **No GPS History**: Only snapshot positions on user action
- **Anonymous Reports**: User IDs hashed for hazard reports
- **Opt-in Crowdsourcing**: Explicit consent for price submissions
- **Data Retention**: 2-year default with deletion API
- **GDPR/CCPA Ready**: Documented compliance paths

## 🌐 Data Sources (Open Data Only)

- **OpenStreetMap** (Overpass API): POIs, roads, boundaries
- **OpenTripMap**: Tourist attractions, cultural sites
- **Wikidata**: Entity enrichment
- **RestCountries**: Emergency numbers, currency
- **Open-Meteo**: Weather data (future)

**Note**: No scraping of Google, Numbeo, Teleport, or other paid sources.

## 🎨 Mission Lexicon

All UI copy uses field operative terminology:

- `AUTHENTICATE IDENTITY` (login)
- `CALIBRATE FIELD POSITION` (location permission)
- `DOWNLOADING BANGKOK_PACK.JSON` (pack download)
- `ANCHOR POINT REACHED` (arrived at anchor)
- `REPORT SIGNAL NOISE` (submit hazard)
- `OPERATIVE RECORD` (user profile)
- `ZONE STATUS: OFFLINE` (disabled zone)

See [i18n/en.json](i18n/en.json) for full lexicon.

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Manual

```bash
pnpm build
pnpm start
```

## 🧪 Acceptance Tests

Manual verification checklist:

1. ✅ Download Bangkok pack → Progress bar with mission copy
2. ✅ Open map offline → Zones render from IndexedDB
3. ✅ Click zone → Anchor info displayed
4. ✅ Export to Google Maps → Opens in new tab
5. ✅ Clipboard contains cheat sheet → Verify paste
6. ✅ Submit price verification → Karma increments
7. ✅ Submit 2 hazard reports (different users) → Zone goes OFFLINE
8. ✅ Toggle Day/Night ops → Theme switches
9. ✅ Simulate GPS → Zone entry vibration

## 🗺️ Roadmap

### v1.0 (Current MVP)
- ✅ Bangkok & Tokyo city packs
- ✅ Offline-first PWA
- ✅ Anchor algorithm
- ✅ Hazard reporting with karma
- ✅ Export to Google Maps

### v2.0 (Q2 2026)
- iOS Live Activity integration (native module)
- Android persistent notifications (native module)
- More cities (Singapore, Saigon, Manila)
- Real-time hazard aggregation (WebSocket)
- Premium cheat sheets (monetization)

### v3.0 (Q4 2026)
- B2B licensing for travel companies
- API marketplace for city data
- Community-generated city packs
- Multi-language support (Thai, Japanese)

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-city`)
3. Commit changes (`git commit -m 'Add Singapore pack'`)
4. Push to branch (`git push origin feature/new-city`)
5. Open Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- OpenStreetMap contributors for geographic data
- Mapbox/MapLibre for mapping infrastructure
- Supabase for backend services
- Next.js team for excellent framework

## 📧 Contact

- Website: https://unmappedos.com
- Issues: https://github.com/yourusername/unmapped-os/issues
- Email: operative@unmappedos.com

---

**Built with ❤️ for urban operatives worldwide.**

## Assumptions & Compromises

1. **Overpass Rate Limiting**: Uses exponential backoff; falls back to bundled sample anchors if API unavailable
2. **MapLibre Fallback**: Animated shaders disabled without Mapbox token; static polygons used
3. **Live Activity Stubs**: Native iOS/Android modules documented but not implemented (requires native development)
4. **SQLite Dev Mode**: Local SQLite fallback if Supabase not configured (limited functionality)
5. **Ambient Light Sensor**: Simulated with manual toggle on desktop (browser API limited)
6. **Vibration API**: Fallback to visual flash if not supported
7. **Price Data**: Seeded from static CSV; requires crowdsourcing to improve
8. **Zone Polygons**: Pre-defined seed zones for Bangkok/Tokyo; future versions will auto-generate from Overpass
9. **Hazard Aggregation**: Runs on-demand; future versions will use scheduled edge functions
10. **Internationalization**: English only in MVP; framework supports multi-language
