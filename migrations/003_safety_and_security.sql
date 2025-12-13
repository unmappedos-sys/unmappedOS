-- Migration: Safety & Security Features
-- Implements: Dark Alley, Honeypot Protection, Trust Web, GDPR Compliance, Civilian Mode

-- 1. SAFETY_CHECKS TABLE (Dark Alley Algorithm)
CREATE TABLE IF NOT EXISTS safety_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  check_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_daylight BOOLEAN NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SAFE', 'CAUTION', 'UNVERIFIED')),
  user_warned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_checks_zone_id ON safety_checks(zone_id);
CREATE INDEX IF NOT EXISTS idx_safety_checks_check_time ON safety_checks(check_time DESC);

COMMENT ON TABLE safety_checks IS 'Time-gated zone safety checks (prevents Dark Alley risk)';

-- 2. ZONE_SUGGESTIONS TABLE (Honeypot Protection)
CREATE TABLE IF NOT EXISTS zone_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  texture_type TEXT NOT NULL CHECK (texture_type IN ('neon', 'silence', 'deep_analog', 'public')),
  centroid JSONB NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verification_count INT DEFAULT 0,
  rejection_count INT DEFAULT 0,
  zone_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zone_suggestions_user_id ON zone_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_suggestions_status ON zone_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_zone_suggestions_city ON zone_suggestions(city);

COMMENT ON TABLE zone_suggestions IS 'User-suggested zones requiring crowd verification';

-- 3. ZONE_SUGGESTION_VERIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS zone_suggestion_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggestion_id UUID NOT NULL REFERENCES zone_suggestions(id) ON DELETE CASCADE,
  verifier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  reason TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_suggestion_verifications_suggestion_id 
  ON zone_suggestion_verifications(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_zone_suggestion_verifications_verifier_id 
  ON zone_suggestion_verifications(verifier_id);

-- Prevent duplicate verifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_suggestion_verifications_unique 
  ON zone_suggestion_verifications(suggestion_id, verifier_id);

-- 4. SUSPICIOUS_ACTIVITY TABLE (Trust Web)
CREATE TABLE IF NOT EXISTS suspicious_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created_at ON suspicious_activity(created_at DESC);

COMMENT ON TABLE suspicious_activity IS 'Tracks anomalous user behavior for trust scoring';

-- 5. LOCATION_CHALLENGES TABLE (GDPR Proof-of-Work)
CREATE TABLE IF NOT EXISTS location_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  challenge_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_location_challenges_challenge_id ON location_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_location_challenges_user_id ON location_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_location_challenges_expires_at ON location_challenges(expires_at);

COMMENT ON TABLE location_challenges IS 'GDPR-compliant location proof-of-work challenges';

-- 6. ZONE_VISITS TABLE (GDPR-Compliant Visit Log)
CREATE TABLE IF NOT EXISTS zone_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_method TEXT NOT NULL DEFAULT 'PROOF_OF_WORK'
  -- NO GPS COORDINATES STORED (GDPR compliant)
);

CREATE INDEX IF NOT EXISTS idx_zone_visits_user_id ON zone_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_visits_zone_id ON zone_visits(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_visits_visited_at ON zone_visits(visited_at DESC);

COMMENT ON TABLE zone_visits IS 'GDPR-safe zone visit log (no GPS coordinates)';

-- 7. MODE_CHANGES TABLE (Civilian Mode Tracking)
CREATE TABLE IF NOT EXISTS mode_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('SPY', 'CIVILIAN')),
  trigger_method TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_changes_user_id ON mode_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_changes_timestamp ON mode_changes(timestamp DESC);

-- 8. PACK_DOWNLOADS TABLE (Storage Management)
CREATE TABLE IF NOT EXISTS pack_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  size_bytes BIGINT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_downloads_user_id ON pack_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_downloads_last_accessed ON pack_downloads(last_accessed_at);

-- Prevent duplicate downloads
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_downloads_unique 
  ON pack_downloads(user_id, city);

COMMENT ON TABLE pack_downloads IS 'Tracks user pack downloads for auto-cleanup';

-- 9. ENHANCE ZONES TABLE (Add lighting metadata)
ALTER TABLE zones ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN zones.metadata IS 'Stores OSM tags (lit=yes) and custom zone metadata';

-- 10. ENHANCE REPORTS TABLE (Add status field for flagged reports)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACCEPTED' 
  CHECK (status IN ('ACCEPTED', 'FLAGGED', 'REJECTED'));

COMMENT ON COLUMN reports.status IS 'Report status after anomaly detection';

-- 11. RLS POLICIES
ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_suggestion_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_downloads ENABLE ROW LEVEL SECURITY;

-- Public can view safety checks
CREATE POLICY "Public can view safety checks"
  ON safety_checks FOR SELECT
  USING (true);

-- Users can submit zone suggestions (if Level 3+)
CREATE POLICY "Users can submit zone suggestions"
  ON zone_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view zone suggestions"
  ON zone_suggestions FOR SELECT
  USING (true);

-- Users can verify suggestions
CREATE POLICY "Users can verify suggestions"
  ON zone_suggestion_verifications FOR INSERT
  WITH CHECK (true);

-- Users can view own suspicious activity
CREATE POLICY "Users can view own suspicious activity"
  ON suspicious_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create location challenges
CREATE POLICY "Users can create challenges"
  ON location_challenges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own challenges"
  ON location_challenges FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view own zone visits
CREATE POLICY "Users can view own visits"
  ON zone_visits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can log mode changes
CREATE POLICY "Users can log mode changes"
  ON mode_changes FOR INSERT
  WITH CHECK (true);

-- Users can manage own pack downloads
CREATE POLICY "Users can manage own packs"
  ON pack_downloads FOR ALL
  USING (auth.uid() = user_id);

-- 12. HELPER FUNCTIONS

-- Function: Increment user suspicious flags
CREATE OR REPLACE FUNCTION increment_user_flags(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{suspicious_flags}',
    to_jsonb(COALESCE((metadata->>'suspicious_flags')::int, 0) + 1)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Find nearby zone suggestions (for duplicate detection)
CREATE OR REPLACE FUNCTION find_nearby_suggestions(
  p_lat FLOAT,
  p_lon FLOAT,
  p_radius_km FLOAT
)
RETURNS TABLE(id UUID, distance_km FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zs.id,
    6371 * acos(
      cos(radians(p_lat)) * cos(radians((zs.centroid->>'lat')::float)) *
      cos(radians((zs.centroid->>'lon')::float) - radians(p_lon)) +
      sin(radians(p_lat)) * sin(radians((zs.centroid->>'lat')::float))
    ) AS distance_km
  FROM zone_suggestions zs
  WHERE status = 'PENDING'
  HAVING distance_km < p_radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function: Find nearby reports (for competitor sabotage detection)
CREATE OR REPLACE FUNCTION find_nearby_reports(
  p_zone_id TEXT,
  p_user_id UUID,
  p_days INT,
  p_radius_km FLOAT
)
RETURNS TABLE(id UUID, zone_id TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.zone_id,
    r.created_at
  FROM reports r
  WHERE r.user_id = p_user_id
    AND r.created_at > NOW() - (p_days || ' days')::INTERVAL
    AND r.zone_id != p_zone_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-cleanup expired location challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS TABLE(cleaned_count BIGINT) AS $$
BEGIN
  WITH deleted AS (
    DELETE FROM location_challenges
    WHERE status = 'PENDING'
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) FROM deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. CRON JOB FUNCTIONS (Add to vercel.json)
-- These should be called periodically:
-- - cleanup_expired_challenges() - Hourly
-- - Auto-cleanup old pack downloads (via pack management API)
