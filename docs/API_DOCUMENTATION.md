# API Documentation - Unmapped OS v3.0

## Base URL

```
Development: http://localhost:3000/api
Production: https://unmappedos.com/api
```

## Authentication

All authenticated endpoints require a valid Supabase JWT token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

## Rate Limiting

- **Comments**: 10 per hour per user
- **Reports**: 5 per hour per user
- **Search**: 100 per hour per IP
- **Whispers**: 60 per hour per zone

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640000000
```

---

## Zones API

### Get Zone by ID

```http
GET /api/zones/:zoneId
```

**Response:**
```json
{
  "zone_id": "BKK_001",
  "name": "Khao San Road",
  "city": "bangkok",
  "texture_type": "NEON",
  "base_price_usd": 25.50,
  "status": "ACTIVE",
  "geom": {...},
  "anchors": [
    {
      "anchor_id": "ANC_001",
      "name": "Buddy Lodge",
      "lat": 13.7589,
      "lng": 100.4978,
      "anchor_type": "HOTEL"
    }
  ]
}
```

### Get Zones Near Location

```http
GET /api/zones/nearby?lat=13.7563&lng=100.5018&radius=1000
```

**Query Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Search radius in meters (default: 1000)
- `limit` (optional): Max results (default: 10)

**Response:**
```json
{
  "zones": [
    {
      "zone_id": "BKK_001",
      "name": "Khao San Road",
      "texture_type": "NEON",
      "distance_meters": 245.8
    }
  ]
}
```

### Search Zones

```http
GET /api/zones/search?q=temple&texture=SILENCE&time=day&price_max=20
```

**Query Parameters:**
- `q` (optional): Search query
- `texture` (optional): Texture filter (SILENCE, ANALOG, NEON, CHAOS)
- `time` (optional): Time filter (day, night)
- `price_max` (optional): Maximum price in USD
- `city` (optional): City filter
- `limit` (optional): Max results (default: 20)

**Response:**
```json
{
  "results": [
    {
      "zone_id": "BKK_002",
      "name": "Wat Pho",
      "texture_type": "SILENCE",
      "score": 0.92,
      "match_reason": "Query match + texture preference"
    }
  ],
  "count": 15
}
```

---

## Comments API

### Get Comments for Zone

```http
GET /api/comments?zone_id=BKK_001&limit=10
```

**Query Parameters:**
- `zone_id` (required): Zone ID
- `limit` (optional): Max results (default: 10)
- `verified_only` (optional): Only show verified comments (default: false)

**Response:**
```json
{
  "comments": [
    {
      "comment_id": "c1",
      "zone_id": "BKK_001",
      "user_id": "u1",
      "short_tag": "GOOD_FOR_NIGHT",
      "note": "Great atmosphere after 8pm",
      "trust_score": 25,
      "verified": true,
      "created_at": "2025-12-01T20:30:00Z"
    }
  ]
}
```

### Submit Comment

```http
POST /api/comments
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "zone_id": "BKK_001",
  "short_tag": "GOOD_FOR_NIGHT",
  "note": "Great atmosphere after 8pm",
  "lat": 13.7589,
  "lng": 100.4978
}
```

**Response:**
```json
{
  "comment_id": "c1",
  "karma_earned": 5,
  "message": "Comment submitted successfully"
}
```

**Rate Limit:** 1 comment per zone per 12 hours per user

### Verify Comment

```http
POST /api/comments/:commentId/verify
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "verdict": "accurate",
  "lat": 13.7589,
  "lng": 100.4978
}
```

**Requirements:**
- Must be within 500m of zone anchor
- One verification per comment per user
- Verdict: "accurate" or "inaccurate"

**Response:**
```json
{
  "verified": true,
  "karma_earned": 5,
  "trust_score": 26
}
```

---

## Hazard Reports API

### Submit Hazard Report

```http
POST /api/reports
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "zone_id": "BKK_001",
  "hazard_type": "SAFETY",
  "description": "Recent theft reports in area",
  "severity": "high",
  "lat": 13.7589,
  "lng": 100.4978
}
```

**Hazard Types:**
- `OBSTRUCTION`: Physical blockage
- `SAFETY`: Security concern
- `CLOSED`: Venue/area closed
- `SCAM`: Fraudulent activity
- `CONSTRUCTION`: Building work
- `CROWD_SURGE`: Dangerous crowding

**Severity Levels:**
- `low`: Minor inconvenience
- `medium`: Significant issue
- `high`: Dangerous/urgent

**Response:**
```json
{
  "report_id": "r1",
  "karma_earned": 20,
  "zone_status": "OFFLINE",
  "message": "Report submitted. Zone temporarily disabled."
}
```

**Auto-Moderation:**
- 2+ distinct reports within 24h → Zone set to OFFLINE for 7 days
- Reporters earn +20 karma if zone disabled

---

## Intelligence Layer APIs

### Get Whispers for Zone

```http
GET /api/whispers?zone_id=BKK_001&hour=14
```

**Query Parameters:**
- `zone_id` (required): Zone ID
- `hour` (optional): Hour for time-based whispers (0-23)

**Response:**
```json
{
  "whispers": [
    {
      "type": "intel",
      "content": "GOLDEN HOUR // OPTIMAL VISUAL CONDITIONS",
      "confidence": 0.95,
      "expires_at": "2025-12-01T15:00:00Z"
    },
    {
      "type": "price",
      "content": "BASE RATE $25.50 // VARIANCE ±15%",
      "confidence": 0.88,
      "expires_at": "2025-12-01T16:30:00Z"
    }
  ]
}
```

**Edge API:**
```http
GET /api/edge/whispers?zoneId=BKK_001&hour=14
```
Deployed globally on Vercel Edge Runtime for <50ms responses.

### Get Dynamic Texture for Zone

```http
GET /api/texture?zone_id=BKK_001&hour=22&day=5
```

**Query Parameters:**
- `zone_id` (required): Zone ID
- `hour` (optional): Current hour (0-23)
- `day` (optional): Day of week (0=Sunday, 6=Saturday)

**Response:**
```json
{
  "base_texture": "ANALOG",
  "current_texture": "NEON",
  "shift_magnitude": 1,
  "vitality_score": 7.5,
  "time_modifier": -0.2,
  "incident_modifier": 0.3,
  "ui_config": {
    "color": "#fbbf24",
    "icon": "🌆",
    "description": "Urban energy peaks"
  }
}
```

### Get Ghost Beacons for Zone

```http
GET /api/beacons?zone_id=BKK_001&lat=13.7589&lng=100.4978
```

**Query Parameters:**
- `zone_id` (required): Zone ID
- `lat` (optional): User latitude (for proximity)
- `lng` (optional): User longitude (for proximity)

**Response:**
```json
{
  "beacons": [
    {
      "id": "beacon_1",
      "type": "local_gem",
      "lat": 13.7592,
      "lng": 100.4980,
      "interest_score": 8,
      "distance_meters": 35,
      "direction": "NE",
      "description": "Hidden rooftop bar",
      "triggered": false,
      "expires_at": "2025-12-02T20:30:00Z"
    }
  ]
}
```

**Beacon Types:**
- `local_gem`: Hidden spots (interest 7-10)
- `historic`: Cultural sites (interest 6-9)
- `viewpoint`: Scenic locations (interest 6-10)
- `transit_hub`: Transport hubs (interest 4-7)
- `mystery`: Unknown discoveries (interest 5-10)

### Calculate Safe Corridor

```http
POST /api/corridors/calculate
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "origin": {"lat": 13.7563, "lng": 100.5018},
  "destination": {"lat": 13.7589, "lng": 100.4978},
  "hour": 22,
  "prefer_vitality": 6,
  "avoid_textures": ["CHAOS"]
}
```

**Response:**
```json
{
  "primary_route": {
    "waypoints": [[100.5018, 13.7563], [100.4978, 13.7589]],
    "vitality_score": 7.2,
    "safety_rating": "high",
    "estimated_minutes": 15,
    "warnings": []
  },
  "alternative_routes": [...],
  "overall_safety": "high",
  "night_mode_active": true
}
```

---

## Personalization APIs

### Get Texture Fingerprint

```http
GET /api/fingerprint
Authorization: Bearer <token>
```

**Response:**
```json
{
  "texture_preferences": {
    "SILENCE": 0.75,
    "ANALOG": 0.85,
    "NEON": 0.45,
    "CHAOS": 0.20
  },
  "time_preferences": {
    "morning": 0.65,
    "afternoon": 0.80,
    "evening": 0.90,
    "night": 0.30
  },
  "travel_style": "local",
  "computed_at": "2025-12-01T20:30:00Z"
}
```

### Get Zone Recommendations

```http
GET /api/recommendations?city=bangkok&limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "recommendations": [
    {
      "zone_id": "BKK_003",
      "name": "Lumpini Park",
      "score": 0.92,
      "reason": "Matches your SILENCE preference"
    }
  ]
}
```

### Get Operative Replay

```http
GET /api/replay?session_id=session_1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session_id": "session_1",
  "started_at": "2025-12-01T10:00:00Z",
  "ended_at": "2025-12-01T18:30:00Z",
  "events": [
    {
      "event_type": "zone_entry",
      "zone_id": "BKK_001",
      "zone_name": "Khao San Road",
      "timestamp": "2025-12-01T10:15:00Z"
    }
  ],
  "total_distance_km": 8.5,
  "zones_visited": 5
}
```

---

## Gamification APIs

### Get Karma Balance

```http
GET /api/karma
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user_id": "u1",
  "total_karma": 125,
  "level": "Field Agent",
  "next_level_at": 200
}
```

### Get Karma Logs

```http
GET /api/karma/logs?limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "logs": [
    {
      "log_id": "kl1",
      "action": "comment_submit",
      "points": 5,
      "created_at": "2025-12-01T20:30:00Z"
    }
  ]
}
```

### Get Badges

```http
GET /api/badges
Authorization: Bearer <token>
```

**Response:**
```json
{
  "earned_badges": [
    {
      "badge_id": "first_comment",
      "name": "First Intel Drop",
      "description": "Submitted your first comment",
      "icon_url": "/badges/first_comment.png",
      "earned_at": "2025-12-01T10:00:00Z"
    }
  ],
  "available_badges": [...]
}
```

---

## Edge APIs (Global CDN)

### Zone Lookup (Edge)

```http
GET /api/edge/zone-lookup?lat=13.7563&lng=100.5018
```

**Deployed**: Vercel Edge Runtime (global)  
**Response Time**: <50ms  
**Cache**: 5 minutes

### Health Check (Edge)

```http
GET /api/edge/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T20:30:00Z",
  "edge_region": "sin1",
  "edge_city": "Singapore",
  "latency_ms": 12
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

**Common Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INVALID_INPUT` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `SERVER_ERROR` | 500 | Internal server error |
| `LOCATION_REQUIRED` | 403 | User location verification failed |

---

## Webhooks (Future)

Coming soon:
- Zone status changes
- New comments on followed zones
- Karma milestone achievements
- Crisis mode activations
