# Unmapped OS - Quick Start Guide for New Features

**Strategy 6.0+ Features Walkthrough**

This guide demonstrates how to use all the new features added in Strategy 6.0+.

---

## 1. Direction-Aware Mode 🧭

**What it does:** Uses your device's compass to show which way to go to reach your target anchor.

**How to use:**
1. Open a city pack (Bangkok or Tokyo)
2. Tap on a zone to select it
3. Tap "Navigate to Anchor" 
4. You'll see a HUD panel in the top-left with:
   - Rotating arrow pointing to anchor
   - Your current heading (e.g., "HEADING: 245°")
   - Distance to target (e.g., "DISTANCE: 320m")

**Requirements:**
- Mobile device with compass/magnetometer
- iOS: Requires permission prompt acceptance
- Android: Works automatically if sensor available

**Fallback:**
- If compass unavailable, shows static arrow and distance only

**Code Example:**
```typescript
import { useDirectionAware } from '@/hooks/useDirectionAware';

const { heading, relativeBearing, distance, supported } = useDirectionAware({
  targetLat: anchor.lat,
  targetLon: anchor.lon,
  userLat: userPosition.lat,
  userLon: userPosition.lon,
});

// Rotate arrow using relativeBearing
<div style={{ transform: `rotate(${relativeBearing}deg)` }}>↑</div>
```

---

## 2. Safe Walk Score (High Vitality Corridors) 🛤️

**What it does:** Highlights the safest, most well-traveled walking paths through zones.

**How to use:**
1. Open map view
2. Toggle "SAFE CORRIDORS" button (top-right controls)
3. Green dashed lines appear showing recommended paths
4. Follow corridors for safest route (not turn-by-turn navigation)

**How corridors are computed:**
- Analyzes pedestrian-friendly streets (footways, pedestrian zones)
- Considers connectivity, lighting (via OSM tags), width
- Prioritizes well-traveled routes
- Scores vitality from 0-1 (displayed in pack metadata)

**Use cases:**
- Unfamiliar neighborhood at night
- Avoiding dark alleys
- Finding well-lit path to anchor
- Maximum safety without GPS tracking

**Code Example:**
```typescript
// In pack generation
const safeCorridors = await computeSafeCorridors(centroid, polygon);

// Corridors are GeoJSON LineStrings
{
  type: 'LineString',
  coordinates: [[lon1, lat1], [lon2, lat2], ...],
  vitality_score: 0.85
}

// Rendered as MapLibre line layer with green dashed style
```

---

## 3. Operative Memory 📊

**What it does:** Tracks your personal operative record locally on your device.

**Data tracked:**
- Zones visited (with timestamps)
- Anchors reached count
- Total distance traveled (km)
- Missions completed (exports to Google Maps)
- Last export timestamp

**How to use:**
1. Navigate to "Operative Record" page
2. View your stats:
   - `X zones visited`
   - `Y anchors reached`
   - `Z.ZZ km traveled`
   - `N missions completed`
3. Toggle preferences:
   - Shadow Copy Mode (read-only)
   - Server Sync (opt-in to cloud backup)

**Export/Import:**
```typescript
import { useOperativeMemory } from '@/hooks/useOperativeMemory';

const { memory, exportMemory, importMemory } = useOperativeMemory();

// Export to JSON
const json = exportMemory();
// Download or share

// Import from JSON
await importMemory(jsonString);
```

**Privacy:**
- **Default:** Stored locally in IndexedDB only
- **Optional:** Enable "Sync to Server" to backup (requires auth)
- **Shadow Copy Mode:** Disables server sync entirely

**Recording visits:**
```typescript
const { recordZoneVisit } = useOperativeMemory();

// When zone visited
await recordZoneVisit(zone.zone_id, zone.city, false);

// When anchor reached
await recordZoneVisit(zone.zone_id, zone.city, true);
```

---

## 4. Quick-Intel Tile Overlay 🎯

**What it does:** Shows zone-level intelligence markers for instant situational awareness.

**Marker Types:**
- 🟢 **CLEAN**: High trust, low hassle
- 🟠 **OVERPRICING**: Multiple overpricing reports
- 🟣 **HASSLE**: Aggressive touting or crowds
- ⚫ **OFFLINE**: Zone temporarily disabled

**How to use:**
1. Open map view
2. Toggle "INTEL OVERLAY" button (top-right)
3. Small colored markers appear within zones
4. Hover/tap marker to see count (e.g., "OVERPRICING: 3 reports")

**How markers are computed:**
- Aggregate comments and reports by zone
- Count by category (CLEAN, OVERPRICING, HASSLE, etc.)
- Place marker near zone centroid
- Update dynamically as new intel arrives

**Privacy:**
- Zone-level only (never links to specific shops)
- Aggregated counts prevent identification
- No personal data in markers

**Code Example:**
```typescript
interface IntelMarker {
  type: 'CLEAN' | 'OVERPRICING' | 'HASSLE' | 'OFFLINE';
  lat: number;
  lon: number;
  count: number; // Number of reports/comments
}

// Generated during pack creation
const intelMarkers = generateIntelMarkers(zone);

// Added to zone
zone.intel_markers = intelMarkers;
```

---

## 5. Mission Whisper 💬

**What it does:** Provides aggregated micro-advice for each zone based on recent intel.

**Example Whispers:**
- "COFFEE PRICES STABLE 42-48฿ // AVOID TOURIST-FACING CAFES"
- "CONSTRUCTION EAST EDGE — AVOID AFTER 21:00"
- "LOCAL MARKET HOURS 06:00-14:00 // BEST VALUE"
- "TRANSIT HUB CROWDED 17:00-19:00 // PLAN AHEAD"
- "RECENT REPORTS: AGGRESSIVE TOUTING NEAR ANCHOR"

**How to see whispers:**
1. Tap on a zone to select it
2. Whisper appears at bottom of map in yellow box
3. Also visible on zone cards in search results

**How whispers are generated:**
- Analyze comment tags (OVERPRICED, CROWDED, SAFE, etc.)
- Identify common patterns (e.g., multiple "CROWDED" at 17:00)
- Check external data (weather, transit schedules)
- Generate concise advice using mission lexicon
- Refreshed weekly or on pack update

**Code Example:**
```typescript
function generateMissionWhisper(zone: Zone): string {
  // Analyze comments
  const overpriced = zone.top_comments.filter(c => c.short_tag === 'OVERPRICED');
  
  if (overpriced.length >= 3) {
    const avgPrice = calculateAveragePrice(overpriced);
    return `OVERPRICING CONFIRMED // ${overpriced.length} REPORTS // AVG ${avgPrice}฿`;
  }
  
  // Check weather
  if (weather.rain_probability > 0.7) {
    return 'HEAVY RAIN EXPECTED // INDOOR ZONES RECOMMENDED';
  }
  
  // Default
  return 'STANDARD PRECAUTIONS // NO RECENT ALERTS';
}
```

---

## 6. Dynamic Texture Shifts 🌈

**What it does:** Adjusts zone appearance based on real-time conditions.

**Texture Modifiers:**
- **Weather Impact** (0-1): Rain/storms dim zones, suggest indoor alternatives
- **Recent Reports** (count): High report volume shifts color to orange/red warning
- **Updated At** (timestamp): TTL for ephemeral modifiers (48h default)

**Visual Effects:**
- Weather: Dimmed opacity, rain overlay (future)
- Reports: Color shift from neon to warning orange
- Crowds: Increased pulse amplitude

**How to see shifts:**
1. Open map during rain (or simulate via dev tools)
2. Zones with weather impact appear dimmed
3. Zones with recent hazard reports show orange tint
4. Hover/tap to see modifier details

**Data Sources:**
- Open-Meteo API for weather (rain, temp, wind)
- Real-time comment/report aggregation
- Time-of-day patterns (future: ML-based)

**Code Example:**
```typescript
interface TextureModifiers {
  weather_impact?: number; // 0-1
  recent_reports?: number; // count
  updated_at?: string; // ISO timestamp
}

// Apply modifiers to zone fill
let fillOpacity = 0.4;
if (zone.texture_modifiers?.weather_impact > 0.5) {
  fillOpacity *= 0.7; // Dim for rain
}

let color = zone.neon_color;
if (zone.texture_modifiers?.recent_reports > 3) {
  color = '#FF6600'; // Orange warning
}
```

---

## 7. Shadow Copy Mode 🕶️

**What it does:** Enables read-only mode for maximum privacy.

**When enabled:**
- ❌ Cannot submit comments
- ❌ Cannot submit reports
- ❌ Cannot submit prices
- ❌ Cannot verify other comments
- ❌ No user identifiers stored or transmitted
- ✅ Can download packs
- ✅ Can view map and zones
- ✅ Can search (offline)
- ✅ Can use Operative Memory (local only)

**How to enable:**
1. Go to Settings or Operative Record page
2. Toggle "Shadow Copy: READ-ONLY"
3. Confirm warning dialog
4. All write buttons show "SHADOW COPY: READ-ONLY" label

**Use cases:**
- Privacy-sensitive environments
- Surveillance concerns
- Research/observation without contributing
- Testing app without leaving trace

**Code Example:**
```typescript
import { useOps } from '@/contexts/OpsContext';

const { shadowCopy, toggleShadowCopy } = useOps();

// Check before write operation
if (shadowCopy.block_writes) {
  alert('SHADOW COPY MODE // WRITE OPERATIONS DISABLED');
  return;
}

// Proceed with API call
await submitComment(comment);
```

**UI Updates:**
```tsx
<button
  disabled={shadowCopy.enabled}
  className={shadowCopy.enabled ? 'opacity-50 cursor-not-allowed' : ''}
>
  {shadowCopy.enabled ? 'SHADOW COPY: READ-ONLY' : 'UPDATE INTEL'}
</button>
```

---

## 8. Device-to-Device Pack Sharing 📲

**What it does:** Share city packs with nearby operatives without internet.

**Share Methods:**

### A. QR Code (Small Packs)
1. Open pack you want to share
2. Tap "Share Pack" button
3. Select "SHARE" mode
4. Tap "GENERATE QR CODE"
5. Show QR to another operative
6. They scan and import instantly

**Limitations:**
- Works for packs < 2KB compressed
- QR code size limited to ~2900 bytes
- Larger packs use file export

### B. File Export (Large Packs)
1. Open pack
2. Tap "Share Pack"
3. Tap "EXPORT AS FILE"
4. File downloads as `{city}_pack_v{version}.json`
5. Transfer via:
   - AirDrop (iOS)
   - Nearby Share (Android)
   - Files app
   - USB cable
   - Bluetooth

### C. Server-Hosted Link (Future)
- Generate short token: `unmapped://pack/{city}/{token}`
- Server stores pack for 24h
- QR contains only URL
- Receiver downloads via API

**How to receive:**
1. Tap "Share Pack" button
2. Select "RECEIVE" mode
3. Tap "SCAN QR CODE" (if camera available)
   - OR paste pack JSON/data
4. Tap "IMPORT PACK"
5. Pack validates and saves to IndexedDB

**Security:**
- Validates pack structure on import
- Checks for required fields (city, zones, anchors)
- Rejects malformed/corrupted data
- No automatic script execution

**Code Example:**
```typescript
import { PackShareModal } from '@/components/PackShareModal';
import { compressToBase64 } from 'lz-string';

// Share pack
const compressed = compressToBase64(JSON.stringify(pack));
const qrData = `unmapped://pack/data/${compressed}`;

// Generate QR
const QRCode = await import('qrcode');
const dataUrl = await QRCode.toDataURL(qrData);

// Import pack
const importPack = async (data: string) => {
  const packData = JSON.parse(decompressFromBase64(data));
  await savePack(packData);
};
```

---

## Testing New Features

**1. Direction-Aware Mode**
```bash
# Open map on mobile device
# Select zone and anchor
# Walk around and watch arrow rotate
# Verify heading updates
```

**2. Safe Walk Score**
```bash
# Toggle "SAFE CORRIDORS"
# Verify green lines appear
# Check they connect anchor to zone edges
```

**3. Operative Memory**
```bash
# Visit multiple zones
# Check Operative Record page
# Verify zone visit count increases
# Export memory as JSON
# Clear and re-import
```

**4. Quick-Intel Overlay**
```bash
# Toggle "INTEL OVERLAY"
# Verify colored markers appear
# Tap marker to see tooltip
# Check correct colors (green, orange, purple, grey)
```

**5. Mission Whisper**
```bash
# Select zone
# Check bottom panel for whisper
# Verify it reflects recent comments/reports
```

**6. Dynamic Texture Shifts**
```bash
# Simulate weather in dev tools
# Verify zone opacity changes
# Submit multiple reports to one zone
# Verify color shifts to orange
```

**7. Shadow Copy Mode**
```bash
# Enable Shadow Copy in settings
# Verify write buttons disabled
# Try to submit comment → blocked
# Verify no user data transmitted
```

**8. Pack Sharing**
```bash
# Export Bangkok pack
# Verify .json file downloads
# Import on another device
# Verify pack loads correctly
```

---

## Troubleshooting

**Direction-Aware not working:**
- Check device has magnetometer
- On iOS, accept permission prompt
- Try recalibrating compass (wave device in figure-8)

**Safe Corridors not showing:**
- Ensure pack has `safe_corridors` field
- Re-generate pack with latest script
- Toggle button to refresh

**Operative Memory not persisting:**
- Check browser supports IndexedDB
- Ensure not in incognito mode
- Try exporting and re-importing

**Quick-Intel markers not appearing:**
- Ensure `intel_markers` in pack
- Toggle overlay off/on
- Check console for errors

**Mission Whisper blank:**
- Re-generate pack (whispers computed at pack-time)
- Check `mission_whisper` field in zone
- Submit comments to trigger new whispers

**Texture shifts not visible:**
- Check `texture_modifiers` in zone
- Verify weather API accessible
- Submit reports to trigger shifts

**Shadow Copy blocking all actions:**
- This is expected behavior
- Toggle off to enable writes
- Check `shadowCopy.enabled` in context

**Pack import failing:**
- Validate JSON structure
- Check compression format (base64)
- Ensure all required fields present

---

## Next Steps

1. **Read Full Documentation**: See `/FEATURES_COMPLETE.md` for comprehensive feature list
2. **Run Acceptance Tests**: See `/ACCEPTANCE_TESTS.md` for validation scenarios
3. **Configure Environment**: Set up Supabase and API keys
4. **Generate Fresh Packs**: Run `pnpm run packgen:all` with latest data
5. **Deploy**: See `/README.md` deployment section

---

## Support

**Documentation:**
- `/README.md` - Quick start and setup
- `/FEATURES_COMPLETE.md` - Complete feature reference
- `/ACCEPTANCE_TESTS.md` - Test scenarios
- `/PRD.md` - Product requirements

**Code Examples:**
- All hooks in `/apps/web/hooks/`
- Components in `/apps/web/components/`
- Pack generation in `/scripts/packgen/`

**Common Tasks:**
```bash
# Install dependencies
pnpm install

# Generate packs
pnpm run packgen:all

# Dev server
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

---

**End of Quick Start Guide**
