# Unmapped OS Security Model

**Version**: 2.0  
**Last Updated**: December 2025

---

## Overview

Unmapped OS implements multiple layers of security and privacy protection for field operatives. This document outlines the complete security architecture, threat model, and mitigation strategies.

---

## Authentication & Authorization

### Supabase Auth Integration

- **Provider**: Supabase Auth with magic link email + optional OAuth
- **Session Management**: JWT tokens with 1-hour access token, 7-day refresh token
- **Server-Side Validation**: All protected API routes validate session via `createPagesServerClient`
- **Client-Side**: `useAuth` hook provides session state and user info

### API Security

```typescript
// Protected API pattern
const supabase = createPagesServerClient({ req, res });
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Row Level Security (RLS)

All Supabase tables implement RLS policies:

- **users**: Users can only read/update their own profile
- **reports**: Users can insert; read public; update/delete only own
- **prices**: Users can insert; read public
- **activity_logs**: Users can only access their own logs

---

## Privacy Protections

### Snapshot GPS (No Continuous Tracking)

- Location is requested **only on explicit user action**
- No background location tracking
- Location cached only in memory, not persisted
- Accuracy indicator shown to user

### Shadow Copy Mode

When enabled:
- All write operations are blocked
- Anonymous ID used instead of user ID
- Location data coarsened to ~1km precision
- Local features only (replay, fingerprint)

```typescript
// Shadow mode allowed actions
const ALLOWED = ['view_map', 'view_zones', 'view_prices', 'download_pack', 'crisis_mode'];
```

### Data Retention Policies

| Data Type | Retention Period | Purge Method |
|-----------|------------------|--------------|
| Activity Logs | 2 years | Automated cron |
| Prices | 1 year | Automated cron |
| Whisper Cache | Immediate on expiry | Automated cron |
| Replay Data | Local only (user controlled) | Manual deletion |
| Audit Logs | Never | Compliance requirement |

### Coordinate Coarsening

For privacy-sensitive contexts:
```typescript
function coarsenCoordinates(lat, lon, precision = 2) {
  return {
    lat: parseFloat(lat.toFixed(precision)), // ~1km
    lon: parseFloat(lon.toFixed(precision)),
  };
}
```

---

## Logging & Monitoring

### Structured Logging (pino)

All logs include:
- Request ID (correlation)
- User ID (redacted in logs)
- Timestamp
- Service name
- Log level

### Redaction Rules

Sensitive fields are automatically redacted:

```typescript
const redactedPaths = [
  'password',
  'token',
  'authorization',
  'cookie',
  'email',
  'lat',
  'lon',
  'coordinates',
  'location',
];
```

### Audit Trail

All security-relevant events logged:
- Login/logout
- Password changes
- Permission changes
- Data exports
- API access patterns

---

## Input Validation

### Zod Schema Validation

All API inputs validated with zod:

```typescript
const priceSubmissionSchema = z.object({
  zone_id: z.string().min(1).max(50),
  item: z.string().min(1).max(100),
  amount: z.number().positive().max(100000),
  currency: z.string().length(3),
});
```

### Validation Categories

- **Auth schemas**: Login, signup, password reset
- **Report schemas**: Hazard reports, verifications
- **Price schemas**: Submissions, queries
- **Location schemas**: Coordinates with bounds checking
- **Profile schemas**: Updates with sanitization

### Error Handling

Validation errors return structured responses:
```json
{
  "error": "Validation failed",
  "details": [{ "field": "amount", "message": "Must be positive" }]
}
```

---

## Rate Limiting

### API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Public APIs | 100 req | 1 minute |
| Protected APIs | 200 req | 1 minute |
| Auth endpoints | 10 req | 1 minute |
| Price submission | 60 req | 1 hour |
| Report submission | 30 req | 1 hour |

### Implementation

Rate limiting via Supabase Edge Functions or Next.js middleware with Redis/KV store.

---

## Crisis Mode Security

### Activation Methods

1. **Shake Gesture**: 3+ rapid accelerometer events > 15m/s²
2. **Safe Phrase**: Pre-configured phrase matching
3. **Manual Toggle**: Quick access button

### Crisis Mode Protections

- Minimal UI footprint (appears as normal app)
- No sensitive data displayed
- Emergency contacts pre-loaded
- Safe phrases displayed in local language
- Quick exit to innocuous screen

### Safe Phrase Database

City-specific phrases for de-escalation:
- Bangkok: Thai phrases (ไม่เป็นไร, ขอโทษครับ/ค่ะ)
- Tokyo: Japanese phrases
- Generic: English fallbacks

---

## Data Protection

### Encryption

- **Transit**: TLS 1.3 for all API calls
- **At Rest**: Supabase manages encryption
- **Local Storage**: IndexedDB (browser-managed)

### Device Fingerprinting

User fingerprint stored as JSONB:
```typescript
interface TextureFingerprint {
  texture_preferences: Record<string, number>;
  time_preferences: Record<string, number>;
  activity_patterns: Record<string, any>;
  computed_at: string | null;
}
```

Fingerprint is:
- Stored server-side only if user opts in
- Used for personalization, not tracking
- Deletable on request

### IndexedDB Security

Local-only data in IndexedDB:
- Operative Replay sessions
- Downloaded city packs
- Offline queue
- User preferences

---

## Threat Model

### Threats & Mitigations

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Session hijacking | High | HTTPS only, httpOnly cookies, short token expiry |
| SQL injection | Critical | Parameterized queries via Supabase client |
| XSS | High | Content Security Policy, input sanitization |
| CSRF | Medium | SameSite cookies, token validation |
| Location tracking | High | Snapshot GPS, no background tracking |
| Data breach | Critical | RLS policies, encryption at rest |
| Device theft | High | No sensitive data cached locally |
| Social engineering | Medium | Crisis mode, safe phrases |

### Security Headers

```typescript
// next.config.js
headers: [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]
```

---

## Compliance

### GDPR Considerations

- Data minimization (only collect what's needed)
- Right to erasure (account deletion)
- Data portability (export feature)
- Consent management

### Audit Requirements

- All data access logged
- Retention policies automated
- Security events monitored
- Regular vulnerability scanning

---

## Security Checklist

### Development

- [ ] All inputs validated with zod
- [ ] RLS policies on all tables
- [ ] Sensitive fields redacted in logs
- [ ] No credentials in code or logs
- [ ] Error messages don't leak info

### Deployment

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Monitoring active
- [ ] Backups tested

### Operations

- [ ] Dependencies updated regularly
- [ ] Security audit scheduled
- [ ] Incident response plan documented
- [ ] Access logs reviewed

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security@unmapped.app (or maintainers)
3. Include reproduction steps
4. Allow 90 days for fix before disclosure

---

*This document is part of the Unmapped OS Strategy 6.0++ security framework.*
