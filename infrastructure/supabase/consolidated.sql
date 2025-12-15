-- =============================================================================
-- UNMAPPED OS - CONSOLIDATED SUPABASE SCHEMA
-- =============================================================================
-- Purpose
-- - Single SQL script that applies the current schema + all migrations + seeds.
-- - Designed to be re-runnable (best-effort idempotent).
--
-- How to run (Supabase)
-- - Paste into Supabase SQL Editor and run.
--
-- Notes
-- - This includes structural/schema objects and the small seed datasets present
--   in the repo (cities, badges, quests).
-- - Performance indexes from 005 were adapted to non-CONCURRENTLY variants for
--   compatibility in environments that auto-wrap statements.
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================================================
-- BASE SCHEMA (from infrastructure/supabase/schema.sql, with safe fixes)
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  karma INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'OBSTRUCTION',
    'CROWD_SURGE',
    'CLOSED',
    'DATA_ANOMALY',
    'AGGRESSIVE_TOUTING',
    'CONFUSING_TRANSIT',
    'OVERPRICING'
  )),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'meal_cheap',
    'meal_mid',
    'coffee',
    'beer',
    'water_bottle',
    'transit_single',
    'accommodation_budget',
    'accommodation_mid'
  )),
  amount NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  location GEOMETRY(Point, 4326),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
  zone_id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  geometry JSONB NOT NULL,
  centroid JSONB NOT NULL,
  texture_type TEXT NOT NULL,
  anchor JSONB NOT NULL,
  neon_color TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'OFFLINE', 'CAUTION')),
  status_reason TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Karma logs table
CREATE TABLE IF NOT EXISTS karma_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (safe)
CREATE INDEX IF NOT EXISTS idx_reports_zone_city ON reports(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

CREATE INDEX IF NOT EXISTS idx_prices_zone_city ON prices(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_prices_created_at ON prices(created_at DESC);

-- NOTE: The repo's legacy schema referenced prices(item). We avoid that and
-- create a best-effort index depending on available column(s).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'item') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_item ON prices(item)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'category') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_category ON prices(category)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'item_type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_item_type ON prices(item_type)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_zones_city ON zones(city);
CREATE INDEX IF NOT EXISTS idx_zones_status ON zones(status);

CREATE INDEX IF NOT EXISTS idx_karma_logs_user_id ON karma_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_logs_created_at ON karma_logs(created_at DESC);

-- RLS enablement
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop+create for idempotency)
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Anyone can create user" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

DROP POLICY IF EXISTS "Anyone can submit reports" ON reports;
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Public can view reports (anonymized)" ON reports;

DROP POLICY IF EXISTS "Anyone can submit prices" ON prices;
DROP POLICY IF EXISTS "Users can view own prices" ON prices;
DROP POLICY IF EXISTS "Public can view prices (anonymized)" ON prices;

DROP POLICY IF EXISTS "Public can view zones" ON zones;
DROP POLICY IF EXISTS "Users can view own karma logs" ON karma_logs;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Anyone can create user"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Anyone can submit reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Public can view reports (anonymized)"
  ON reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit prices"
  ON prices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own prices"
  ON prices FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Public can view prices (anonymized)"
  ON prices FOR SELECT
  USING (true);

CREATE POLICY "Public can view zones"
  ON zones FOR SELECT
  USING (true);

CREATE POLICY "Users can view own karma logs"
  ON karma_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_zones_updated_at ON zones;
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION check_zone_hazards()
RETURNS void AS $$
DECLARE
  zone_record RECORD;
  report_count INTEGER;
BEGIN
  FOR zone_record IN SELECT DISTINCT zone_id, city FROM reports WHERE created_at > NOW() - INTERVAL '24 hours'
  LOOP
    SELECT COUNT(DISTINCT user_id) INTO report_count
    FROM reports
    WHERE zone_id = zone_record.zone_id
      AND city = zone_record.city
      AND created_at > NOW() - INTERVAL '24 hours';

    IF report_count >= 2 THEN
      UPDATE zones
      SET status = 'OFFLINE'
      WHERE zone_id = zone_record.zone_id;

      RAISE NOTICE 'Zone % marked OFFLINE due to % reports', zone_record.zone_id, report_count;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_karma(
  user_id_param UUID,
  delta INTEGER,
  reason TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET karma = karma + delta
  WHERE id = user_id_param;

  INSERT INTO karma_logs (user_id, delta, reason)
  VALUES (user_id_param, delta, reason);

  RAISE NOTICE 'User % karma changed by % (reason: %)', user_id_param, delta, reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SCHEMA EXTENSIONS (from infrastructure/supabase/schema_extensions.sql)
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT FALSE;

ALTER TABLE zones ADD COLUMN IF NOT EXISTS anchor_name TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS anchor_coords POINT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS anchor_score NUMERIC DEFAULT 0;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS anchor_selection_reason TEXT;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS hassle_score INTEGER DEFAULT 0;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS price_median NUMERIC DEFAULT 0;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS local_ratio NUMERIC DEFAULT 0.5;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS texture_tags TEXT[];
ALTER TABLE zones ADD COLUMN IF NOT EXISTS good_for_day BOOLEAN DEFAULT TRUE;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS good_for_night BOOLEAN DEFAULT TRUE;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS search_tokens TEXT[];
ALTER TABLE zones ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE INDEX IF NOT EXISTS idx_zones_search_vector ON zones USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_zones_search_tokens ON zones USING GIN(search_tokens);
CREATE INDEX IF NOT EXISTS idx_zones_texture_tags ON zones USING GIN(texture_tags);

CREATE OR REPLACE FUNCTION zones_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.zone_id, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.anchor_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.texture_tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS zones_search_vector_trigger ON zones;
CREATE TRIGGER zones_search_vector_trigger
  BEFORE INSERT OR UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION zones_search_vector_update();

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  user_hash TEXT,
  short_tag TEXT,
  note TEXT,
  price NUMERIC,
  photo_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  moderated BOOLEAN DEFAULT FALSE,
  trust_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_zone_id ON comments(zone_id);
CREATE INDEX IF NOT EXISTS idx_comments_city ON comments(city);
CREATE INDEX IF NOT EXISTS idx_comments_trust_score ON comments(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_moderated ON comments(moderated) WHERE moderated = FALSE;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments are viewable by everyone (non-moderated)" ON comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;

CREATE POLICY "Comments are viewable by everyone (non-moderated)"
  ON comments FOR SELECT
  USING (moderated = FALSE);

CREATE POLICY "Anyone can insert comments"
  ON comments FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS comment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  verifier_id TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('accurate', 'inaccurate')),
  verification_weight NUMERIC DEFAULT 1,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, verifier_id)
);

CREATE INDEX IF NOT EXISTS idx_verifications_comment_id ON comment_verifications(comment_id);

ALTER TABLE comment_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verifications are viewable by everyone" ON comment_verifications;
DROP POLICY IF EXISTS "Anyone can insert verifications" ON comment_verifications;

CREATE POLICY "Verifications are viewable by everyone"
  ON comment_verifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert verifications"
  ON comment_verifications FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'misleading', 'other')),
  flagged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_comment_id ON comment_flags(comment_id);

ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can flag comments" ON comment_flags;
CREATE POLICY "Anyone can flag comments"
  ON comment_flags FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL,
  display_name TEXT NOT NULL,
  pack_version TEXT,
  pack_generated_at TIMESTAMPTZ,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cities (name, country, display_name, enabled) VALUES
  ('bangkok', 'Thailand', 'Bangkok', TRUE),
  ('tokyo', 'Japan', 'Tokyo', TRUE)
ON CONFLICT (name) DO NOTHING;

-- increment_karma overload (text user id)
-- Keep the canonical UUID signature defined earlier.
CREATE OR REPLACE FUNCTION increment_karma(
  p_user_id TEXT,
  p_amount INTEGER,
  p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  PERFORM increment_karma(p_user_id::UUID, p_amount, p_reason);
EXCEPTION WHEN OTHERS THEN
  -- If casting fails or user doesn't exist, no-op.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_zone_hassle(p_zone_id TEXT) RETURNS NUMERIC AS $$
DECLARE
  v_hassle NUMERIC;
BEGIN
  SELECT AVG(
    CASE short_tag
      WHEN 'HASSLE' THEN 8
      WHEN 'OVERPRICING' THEN 6
      WHEN 'CROWD_SURGE' THEN 7
      WHEN 'CONSTRUCTION' THEN 5
      WHEN 'SAFETY_OBSERVED' THEN -3
      WHEN 'CLEAN' THEN -2
      ELSE 0
    END
  )
  INTO v_hassle
  FROM comments
  WHERE zone_id = p_zone_id
    AND moderated = FALSE
    AND created_at > NOW() - INTERVAL '30 days';

  RETURN COALESCE(GREATEST(0, LEAST(10, v_hassle)), 0);
END;
$$ LANGUAGE plpgsql;

CREATE MATERIALIZED VIEW IF NOT EXISTS zone_search_index AS
SELECT
  z.zone_id,
  z.city,
  z.anchor_name,
  z.anchor_score,
  z.hassle_score,
  z.price_median,
  z.local_ratio,
  z.texture_tags,
  z.good_for_day,
  z.good_for_night,
  z.search_vector,
  z.status,
  COUNT(DISTINCT c.id) as comment_count,
  AVG(c.trust_score) as avg_trust_score,
  MAX(c.created_at) as last_comment_at
FROM zones z
LEFT JOIN comments c ON c.zone_id = z.zone_id AND c.moderated = FALSE
WHERE z.status = 'ACTIVE'
GROUP BY z.zone_id, z.city, z.anchor_name, z.anchor_score, z.hassle_score,
         z.price_median, z.local_ratio, z.texture_tags, z.good_for_day,
         z.good_for_night, z.search_vector, z.status;

CREATE INDEX IF NOT EXISTS idx_zone_search_index_vector ON zone_search_index USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_zone_search_index_city ON zone_search_index(city);

CREATE OR REPLACE FUNCTION refresh_search_index() RETURNS VOID AS $$
BEGIN
  -- Avoid CONCURRENTLY inside a function (runs inside a transaction).
  REFRESH MATERIALIZED VIEW zone_search_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MIGRATION 001 (gamification tables)
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operative';
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_intel INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ensure karma_logs has quest_id/metadata
ALTER TABLE karma_logs ADD COLUMN IF NOT EXISTS quest_id TEXT;
ALTER TABLE karma_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_karma_logs_quest_id ON karma_logs(quest_id);

CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  progress JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id, status);

-- Expand comments to support migration 001 shape too
ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment_text TEXT;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Expand reports/prices tables to support migration 001 shapes
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE prices ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS price_value DECIMAL(10,2);
ALTER TABLE prices ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- RLS for gamification tables
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;
DROP POLICY IF EXISTS "Users can view own karma" ON karma_logs;
DROP POLICY IF EXISTS "Users can view own quests" ON user_quests;
DROP POLICY IF EXISTS "Service role can view audit" ON audit_logs;
DROP POLICY IF EXISTS "Service role full access activity" ON activity_logs;
DROP POLICY IF EXISTS "Service role full access karma" ON karma_logs;
DROP POLICY IF EXISTS "Service role full access quests" ON user_quests;
DROP POLICY IF EXISTS "Service role full access audit" ON audit_logs;

CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own karma" ON karma_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quests" ON user_quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can view audit" ON audit_logs
  FOR SELECT USING (true);

CREATE POLICY "Service role full access activity" ON activity_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access karma" ON karma_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access quests" ON user_quests
  FOR ALL USING (true);

CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (true);

-- =============================================================================
-- MIGRATION 002 (missing links + spy features)
-- =============================================================================

ALTER TABLE zones ADD COLUMN IF NOT EXISTS clearance_level INT DEFAULT 1
  CHECK (clearance_level >= 1 AND clearance_level <= 5);

ALTER TABLE reports ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verification_count INT DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS clearance_level INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level_calc INT;

ALTER TABLE comments ADD COLUMN IF NOT EXISTS flash_intel BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS verification_count INT DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS dead_drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drop_id TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  retrieved_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_drops_drop_id ON dead_drops(drop_id);
CREATE INDEX IF NOT EXISTS idx_dead_drops_expires_at ON dead_drops(expires_at);
CREATE INDEX IF NOT EXISTS idx_dead_drops_sender_id ON dead_drops(sender_id);

ALTER TABLE dead_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create dead drops" ON dead_drops;
DROP POLICY IF EXISTS "Anyone can view non-expired dead drops" ON dead_drops;

CREATE POLICY "Anyone can create dead drops"
  ON dead_drops FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view non-expired dead drops"
  ON dead_drops FOR SELECT
  USING (expires_at > NOW());

CREATE OR REPLACE FUNCTION cleanup_expired_flash_intel()
RETURNS TABLE(burned_count BIGINT) AS $$
BEGIN
  WITH deleted AS (
    DELETE FROM comments
    WHERE flash_intel = TRUE
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) FROM deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_assign_zone_clearance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.texture_type = 'deep_analog' THEN
    NEW.clearance_level := 5;
  ELSIF NEW.texture_type = 'silence' THEN
    NEW.clearance_level := 3;
  ELSE
    NEW.clearance_level := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assign_zone_clearance_before_insert ON zones;
CREATE TRIGGER assign_zone_clearance_before_insert
  BEFORE INSERT ON zones
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_zone_clearance();

CREATE INDEX IF NOT EXISTS idx_comments_flash_intel ON comments(flash_intel, expires_at)
  WHERE flash_intel = TRUE;
CREATE INDEX IF NOT EXISTS idx_comments_verification_count ON comments(verification_count);
CREATE INDEX IF NOT EXISTS idx_zones_clearance_level ON zones(clearance_level);

-- =============================================================================
-- MIGRATION 003 (safety + security)
-- =============================================================================

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

CREATE TABLE IF NOT EXISTS zone_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  texture_type TEXT NOT NULL,
  centroid JSONB NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'PENDING',
  verification_count INT DEFAULT 0,
  rejection_count INT DEFAULT 0,
  zone_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_zone_suggestions_user_id ON zone_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_suggestions_status ON zone_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_zone_suggestions_city ON zone_suggestions(city);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_suggestion_verifications_unique
  ON zone_suggestion_verifications(suggestion_id, verifier_id);

CREATE TABLE IF NOT EXISTS suspicious_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_created_at ON suspicious_activity(created_at DESC);

CREATE TABLE IF NOT EXISTS location_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  challenge_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_location_challenges_challenge_id ON location_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_location_challenges_user_id ON location_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_location_challenges_expires_at ON location_challenges(expires_at);

CREATE TABLE IF NOT EXISTS zone_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL REFERENCES zones(zone_id),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_method TEXT NOT NULL DEFAULT 'PROOF_OF_WORK'
);

CREATE INDEX IF NOT EXISTS idx_zone_visits_user_id ON zone_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_visits_zone_id ON zone_visits(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_visits_visited_at ON zone_visits(visited_at DESC);

CREATE TABLE IF NOT EXISTS mode_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('SPY', 'CIVILIAN')),
  trigger_method TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mode_changes_user_id ON mode_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_mode_changes_timestamp ON mode_changes(timestamp DESC);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_downloads_unique
  ON pack_downloads(user_id, city);

ALTER TABLE zones ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_independent BOOLEAN DEFAULT true;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACCEPTED';

ALTER TABLE safety_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_suggestion_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view safety checks" ON safety_checks;
CREATE POLICY "Public can view safety checks"
  ON safety_checks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can submit zone suggestions" ON zone_suggestions;
DROP POLICY IF EXISTS "Users can view zone suggestions" ON zone_suggestions;
DROP POLICY IF EXISTS "Users can verify suggestions" ON zone_suggestion_verifications;

CREATE POLICY "Users can submit zone suggestions"
  ON zone_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view zone suggestions"
  ON zone_suggestions FOR SELECT
  USING (true);

CREATE POLICY "Users can verify suggestions"
  ON zone_suggestion_verifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own suspicious activity" ON suspicious_activity;
CREATE POLICY "Users can view own suspicious activity"
  ON suspicious_activity FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create challenges" ON location_challenges;
DROP POLICY IF EXISTS "Users can view own challenges" ON location_challenges;

CREATE POLICY "Users can create challenges"
  ON location_challenges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own challenges"
  ON location_challenges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own visits" ON zone_visits;
CREATE POLICY "Users can view own visits"
  ON zone_visits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can log mode changes" ON mode_changes;
CREATE POLICY "Users can log mode changes"
  ON mode_changes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own packs" ON pack_downloads;
CREATE POLICY "Users can manage own packs"
  ON pack_downloads FOR ALL
  USING (auth.uid() = user_id);

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

-- =============================================================================
-- MIGRATION 004 (strategy 6 enhancements + seeds)
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint JSONB DEFAULT '{
  "texture_preferences": {},
  "time_preferences": {},
  "activity_patterns": {},
  "computed_at": null
}'::jsonb;

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_mode TEXT DEFAULT 'STANDARD';
ALTER TABLE users ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vitality INTEGER DEFAULT 100;

ALTER TABLE prices ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS zone_median_at_submission NUMERIC(10,2);
ALTER TABLE prices ADD COLUMN IF NOT EXISTS delta_percentage NUMERIC(5,2);

DO $$
BEGIN
  ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;
  ALTER TABLE reports ADD CONSTRAINT reports_category_check
    CHECK (category IN (
      'OBSTRUCTION',
      'HASSLE',
      'OVERPRICING',
      'CROWD_SURGE',
      'CLOSED',
      'DATA_ANOMALY',
      'AGGRESSIVE_TOUTING',
      'CONFUSING_TRANSIT',
      'SAFETY_CONCERN'
    ));
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL DEFAULT 'daily',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  karma_reward INTEGER NOT NULL DEFAULT 10,
  badge_reward TEXT,
  xp_reward INTEGER DEFAULT 0,
  required_level INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  category TEXT DEFAULT 'general',
  unlock_criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

CREATE TABLE IF NOT EXISTS replay_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  city TEXT NOT NULL,
  total_distance_km NUMERIC(10,3) DEFAULT 0,
  zones_visited INTEGER DEFAULT 0,
  anchors_reached INTEGER DEFAULT 0,
  zone_entries JSONB DEFAULT '[]'::jsonb,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, session_date, city)
);

CREATE INDEX IF NOT EXISTS idx_replay_summaries_user_id ON replay_summaries(user_id, session_date DESC);

CREATE TABLE IF NOT EXISTS ghost_beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  beacon_type TEXT NOT NULL DEFAULT 'interest',
  osm_tags JSONB DEFAULT '{}'::jsonb,
  discovered_count INTEGER DEFAULT 0,
  first_discovered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghost_beacons_zone ON ghost_beacons(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_ghost_beacons_type ON ghost_beacons(beacon_type);

CREATE TABLE IF NOT EXISTS whisper_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  whisper_text TEXT NOT NULL,
  whisper_type TEXT NOT NULL DEFAULT 'intel',
  confidence NUMERIC(3,2) DEFAULT 0.8,
  data_sources JSONB DEFAULT '[]'::jsonb,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whisper_cache_zone ON whisper_cache(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_whisper_cache_valid ON whisper_cache(valid_until);

CREATE TABLE IF NOT EXISTS safe_corridors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  geometry JSONB NOT NULL,
  vitality_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  lighting_score NUMERIC(3,2) DEFAULT 0.5,
  foot_traffic_score NUMERIC(3,2) DEFAULT 0.5,
  time_of_day TEXT DEFAULT 'all',
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, city, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_safe_corridors_zone ON safe_corridors(zone_id, city);

CREATE TABLE IF NOT EXISTS crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  location_coarse JSONB,
  city TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_events_user ON crisis_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_events_unresolved ON crisis_events(resolved) WHERE resolved = false;

CREATE OR REPLACE FUNCTION purge_old_data() RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '2 years';
  DELETE FROM prices WHERE created_at < NOW() - INTERVAL '1 year';
  DELETE FROM whisper_cache WHERE valid_until < NOW();
  DELETE FROM replay_summaries WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_zone_auto_offline() RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
  v_distinct_devices INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(DISTINCT device_fingerprint)
  INTO v_report_count, v_distinct_devices
  FROM reports
  WHERE
    zone_id = NEW.zone_id
    AND city = NEW.city
    AND created_at > NOW() - INTERVAL '24 hours'
    AND category IN ('OBSTRUCTION', 'HASSLE', 'SAFETY_CONCERN', 'CLOSED');

  IF v_distinct_devices >= 2 THEN
    UPDATE zones
    SET
      status = 'OFFLINE',
      status_reason = 'AUTO_OFFLINE: Multiple independent reports',
      status_updated_at = NOW()
    WHERE zone_id = NEW.zone_id AND city = NEW.city;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_zone_auto_offline ON reports;
CREATE TRIGGER trigger_zone_auto_offline
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_zone_auto_offline();

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE replay_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE whisper_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_corridors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view quests" ON quests;
DROP POLICY IF EXISTS "Public can view badges" ON badges;
DROP POLICY IF EXISTS "Public can view ghost beacons" ON ghost_beacons;
DROP POLICY IF EXISTS "Public can view whisper cache" ON whisper_cache;
DROP POLICY IF EXISTS "Public can view safe corridors" ON safe_corridors;
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view own replay" ON replay_summaries;
DROP POLICY IF EXISTS "Users can view own crisis events" ON crisis_events;
DROP POLICY IF EXISTS "Users can insert crisis events" ON crisis_events;
DROP POLICY IF EXISTS "Users can insert replay summaries" ON replay_summaries;

CREATE POLICY "Public can view quests" ON quests FOR SELECT USING (active = true);
CREATE POLICY "Public can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public can view ghost beacons" ON ghost_beacons FOR SELECT USING (true);
CREATE POLICY "Public can view whisper cache" ON whisper_cache FOR SELECT USING (valid_until > NOW());
CREATE POLICY "Public can view safe corridors" ON safe_corridors FOR SELECT USING (true);

CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own replay" ON replay_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own crisis events" ON crisis_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert crisis events" ON crisis_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert replay summaries" ON replay_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

INSERT INTO badges (id, name, description, icon, rarity, category) VALUES
  ('first_intel', 'First Intel', 'Submitted your first intel report', '🎯', 'common', 'intel'),
  ('first_anchor', 'Anchor Lock', 'Reached your first zone anchor', '⚓', 'common', 'exploration'),
  ('price_patrol', 'Price Patrol', 'Verified 5 prices in a single day', '💰', 'uncommon', 'contribution'),
  ('streak_5', 'Dedicated Operative', 'Maintained a 5-day activity streak', '🔥', 'uncommon', 'engagement'),
  ('streak_30', 'Field Veteran', 'Maintained a 30-day activity streak', '⭐', 'rare', 'engagement'),
  ('zone_explorer_10', 'Zone Explorer', 'Visited 10 different zones', '🗺️', 'uncommon', 'exploration'),
  ('zone_explorer_50', 'Urban Navigator', 'Visited 50 different zones', '🧭', 'rare', 'exploration'),
  ('crisis_survivor', 'Crisis Survivor', 'Successfully resolved a crisis event', '🛡️', 'rare', 'safety'),
  ('ghost_hunter', 'Ghost Hunter', 'Discovered 10 ghost beacons', '👻', 'uncommon', 'discovery'),
  ('night_owl', 'Night Owl', 'Completed 10 operations after midnight', '🦉', 'uncommon', 'timing'),
  ('early_bird', 'Early Bird', 'Completed 10 operations before 7 AM', '🐦', 'uncommon', 'timing'),
  ('karma_100', 'Rising Operative', 'Accumulated 100 karma points', '📈', 'common', 'karma'),
  ('karma_1000', 'Trusted Agent', 'Accumulated 1000 karma points', '🏆', 'rare', 'karma'),
  ('level_5', 'Field Agent', 'Reached level 5', '🎖️', 'uncommon', 'progression'),
  ('level_10', 'Senior Operative', 'Reached level 10', '🎗️', 'rare', 'progression')
ON CONFLICT (id) DO NOTHING;

INSERT INTO quests (id, name, description, quest_type, criteria, karma_reward, badge_reward) VALUES
  ('daily_price_2', 'Price Check', 'Verify 2 prices today', 'daily',
   '{"action": "price_submitted", "count": 2}', 20, NULL),
  ('daily_anchor_1', 'Anchor Run', 'Reach 1 anchor before noon', 'daily',
   '{"action": "anchor_reached", "count": 1, "before_hour": 12}', 15, NULL),
  ('daily_zone_3', 'Zone Patrol', 'Visit 3 different zones', 'daily',
   '{"action": "zone_enter", "count": 3, "unique": true}', 25, NULL),
  ('weekly_distance_10', 'Field Marathon', 'Travel 10km inside zones this week', 'weekly',
   '{"metric": "distance_km", "value": 10}', 100, NULL),
  ('weekly_reports_5', 'Intel Gatherer', 'Submit 5 reports this week', 'weekly',
   '{"action": "report_submitted", "count": 5}', 75, NULL),
  ('achievement_first_intel', 'First Steps', 'Submit your first intel report', 'achievement',
   '{"action": "report_submitted", "count": 1, "lifetime": true}', 50, 'first_intel'),
  ('achievement_first_anchor', 'Lock On', 'Reach your first zone anchor', 'achievement',
   '{"action": "anchor_reached", "count": 1, "lifetime": true}', 50, 'first_anchor')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATION 006 (intelligence schema)
-- =============================================================================

CREATE TABLE IF NOT EXISTS zone_confidence (
    zone_id TEXT PRIMARY KEY,
    score DECIMAL(5,2) NOT NULL DEFAULT 50,
    level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (level IN ('HIGH', 'MEDIUM', 'LOW', 'DEGRADED', 'UNKNOWN')),
    state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE', 'DEGRADED', 'OFFLINE', 'UNKNOWN')),
    last_verified_at TIMESTAMPTZ,
    last_intel_at TIMESTAMPTZ,
    verification_count INTEGER NOT NULL DEFAULT 0,
    intel_count_24h INTEGER NOT NULL DEFAULT 0,
    conflict_count INTEGER NOT NULL DEFAULT 0,
    hazard_active BOOLEAN NOT NULL DEFAULT FALSE,
    hazard_expires_at TIMESTAMPTZ,
    anomaly_detected BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zone_intel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intel_type TEXT NOT NULL CHECK (intel_type IN (
        'PRICE_SUBMISSION',
        'HASSLE_REPORT',
        'CONSTRUCTION',
        'CROWD_SURGE',
        'QUIET_CONFIRMED',
        'HAZARD_REPORT',
        'VERIFICATION'
    )),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    trust_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    location GEOGRAPHY(POINT, 4326),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zone_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL,
    item TEXT NOT NULL CHECK (item IN ('coffee', 'beer', 'meal_street', 'meal_restaurant', 'transport')),
    average_price DECIMAL(10,2) NOT NULL,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    tourist_average DECIMAL(10,2),
    local_average DECIMAL(10,2),
    report_count INTEGER NOT NULL DEFAULT 0,
    last_report_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(zone_id, item)
);

CREATE TABLE IF NOT EXISTS zone_hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL,
    hazard_type TEXT NOT NULL CHECK (hazard_type IN ('SCAM', 'CONSTRUCTION', 'UNSAFE', 'CLOSED', 'CROWD', 'NATURAL_DISASTER', 'CIVIL_UNREST', 'OTHER')),
    severity TEXT NOT NULL CHECK (severity IN ('ADVISORY', 'WARNING', 'DANGER')),
    description TEXT,
    report_count INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zone_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('PRICE_SPIKE', 'REPORT_SURGE', 'CONFIDENCE_DROP', 'CONFLICT_DETECTED')),
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    auto_resolved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_zone_intel_zone_id ON zone_intel(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_intel_user_id ON zone_intel(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_intel_type ON zone_intel(intel_type);
CREATE INDEX IF NOT EXISTS idx_zone_intel_created_at ON zone_intel(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_intel_zone_type_recent ON zone_intel(zone_id, intel_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zone_confidence_state ON zone_confidence(state);
CREATE INDEX IF NOT EXISTS idx_zone_confidence_hazard ON zone_confidence(hazard_active) WHERE hazard_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_zone_hazards_active ON zone_hazards(zone_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_zone_anomalies_unresolved ON zone_anomalies(zone_id) WHERE resolved_at IS NULL;

CREATE OR REPLACE FUNCTION update_zone_price(
    p_zone_id TEXT,
    p_item TEXT,
    p_price DECIMAL,
    p_is_tourist BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
DECLARE
    v_count INTEGER;
    v_avg DECIMAL;
BEGIN
    SELECT report_count, average_price INTO v_count, v_avg
    FROM zone_prices
    WHERE zone_id = p_zone_id AND item = p_item;

    IF v_count IS NULL THEN
        INSERT INTO zone_prices (zone_id, item, average_price, min_price, max_price, report_count, last_report_at)
        VALUES (p_zone_id, p_item, p_price, p_price, p_price, 1, NOW());
    ELSE
        UPDATE zone_prices
        SET average_price = ((average_price * report_count) + p_price) / (report_count + 1),
            min_price = LEAST(min_price, p_price),
            max_price = GREATEST(max_price, p_price),
            report_count = report_count + 1,
            last_report_at = NOW(),
            tourist_average = CASE WHEN p_is_tourist THEN
                COALESCE(((tourist_average * report_count) + p_price) / (report_count + 1), p_price)
                ELSE tourist_average END,
            local_average = CASE WHEN NOT p_is_tourist THEN
                COALESCE(((local_average * report_count) + p_price) / (report_count + 1), p_price)
                ELSE local_average END,
            updated_at = NOW()
        WHERE zone_id = p_zone_id AND item = p_item;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_zone_anomalies(p_zone_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_anomaly_detected BOOLEAN := FALSE;
    v_report_count INTEGER;
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_report_count
    FROM zone_intel
    WHERE zone_id = p_zone_id
      AND created_at > NOW() - INTERVAL '1 hour';

    IF v_report_count > 10 THEN
        INSERT INTO zone_anomalies (zone_id, anomaly_type, severity, data)
        VALUES (p_zone_id, 'REPORT_SURGE', 'MEDIUM',
            jsonb_build_object('report_count', v_report_count, 'window', '1h'));
        v_anomaly_detected := TRUE;
    END IF;

    SELECT COUNT(*) INTO v_conflict_count
    FROM (
        SELECT DISTINCT intel_type
        FROM zone_intel
        WHERE zone_id = p_zone_id
          AND created_at > NOW() - INTERVAL '6 hours'
          AND intel_type IN ('QUIET_CONFIRMED', 'CROWD_SURGE')
    ) conflicts;

    IF v_conflict_count > 1 THEN
        INSERT INTO zone_anomalies (zone_id, anomaly_type, severity, data)
        VALUES (p_zone_id, 'CONFLICT_DETECTED', 'LOW',
            jsonb_build_object('types', ARRAY['QUIET_CONFIRMED', 'CROWD_SURGE']));
        v_anomaly_detected := TRUE;
    END IF;

    IF v_anomaly_detected THEN
        UPDATE zone_confidence
        SET anomaly_detected = TRUE,
            anomaly_reason = 'AUTO_DETECTED',
            updated_at = NOW()
        WHERE zone_id = p_zone_id;
    END IF;

    RETURN v_anomaly_detected;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION aggregate_hazard_reports(p_zone_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_hazard_count INTEGER;
    v_threshold INTEGER := 2;
    v_kill_switch_triggered BOOLEAN := FALSE;
BEGIN
    SELECT COUNT(*) INTO v_hazard_count
    FROM zone_intel
    WHERE zone_id = p_zone_id
      AND intel_type = 'HAZARD_REPORT'
      AND created_at > NOW() - INTERVAL '24 hours';

    IF v_hazard_count >= v_threshold THEN
        UPDATE zone_confidence
        SET hazard_active = TRUE,
            hazard_expires_at = NOW() + INTERVAL '7 days',
            state = 'OFFLINE',
            score = GREATEST(20, score - 30),
            updated_at = NOW()
        WHERE zone_id = p_zone_id;

        INSERT INTO zone_hazards (zone_id, hazard_type, severity, description, report_count, expires_at)
        VALUES (p_zone_id, 'UNSAFE', 'WARNING',
            'Auto-triggered by multiple hazard reports',
            v_hazard_count,
            NOW() + INTERVAL '7 days');

        v_kill_switch_triggered := TRUE;
    END IF;

    RETURN v_kill_switch_triggered;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE zone_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zone_confidence_read ON zone_confidence;
DROP POLICY IF EXISTS zone_prices_read ON zone_prices;
DROP POLICY IF EXISTS zone_hazards_read ON zone_hazards;
DROP POLICY IF EXISTS zone_confidence_write ON zone_confidence;
DROP POLICY IF EXISTS zone_prices_write ON zone_prices;
DROP POLICY IF EXISTS zone_intel_read ON zone_intel;
DROP POLICY IF EXISTS zone_intel_insert ON zone_intel;

CREATE POLICY zone_confidence_read ON zone_confidence FOR SELECT USING (true);
CREATE POLICY zone_prices_read ON zone_prices FOR SELECT USING (true);
CREATE POLICY zone_hazards_read ON zone_hazards FOR SELECT USING (true);

CREATE POLICY zone_confidence_write ON zone_confidence FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY zone_prices_write ON zone_prices FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY zone_intel_read ON zone_intel FOR SELECT USING (true);
CREATE POLICY zone_intel_insert ON zone_intel FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION trigger_anomaly_detection()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM detect_zone_anomalies(NEW.zone_id);
    PERFORM aggregate_hazard_reports(NEW.zone_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_intel_insert ON zone_intel;
CREATE TRIGGER after_intel_insert
    AFTER INSERT ON zone_intel
    FOR EACH ROW
    EXECUTE FUNCTION trigger_anomaly_detection();

-- =============================================================================
-- PERFORMANCE INDEXES (adapted from migrations/005_performance_indexes.sql)
-- =============================================================================

-- These are safe non-CONCURRENTLY versions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'city') THEN
    CREATE INDEX IF NOT EXISTS idx_users_city_karma
      ON users(city, karma DESC NULLS LAST)
      WHERE city IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_karma_desc ON users(karma DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_level_desc ON users(level DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_streak_desc ON users(streak DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type_created ON activity_logs(action_type, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'zone_id') THEN
    CREATE INDEX IF NOT EXISTS idx_activity_zone_created
      ON activity_logs(zone_id, created_at DESC)
      WHERE zone_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prices' AND column_name = 'category') THEN
    CREATE INDEX IF NOT EXISTS idx_prices_zone_category_created
      ON prices(zone_id, category, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_prices_city_category
      ON prices(city, category, created_at DESC);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prices_created_desc ON prices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_zone_status_created ON reports(zone_id, status, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_reports_pending
      ON reports(status, created_at DESC)
      WHERE status = 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quests') THEN
    CREATE INDEX IF NOT EXISTS idx_quests_active
      ON quests(active, quest_type)
      WHERE active = true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_zone_created ON comments(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_karma_logs_user_created ON karma_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zones_city_status ON zones(city, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whisper_cache') THEN
    CREATE INDEX IF NOT EXISTS idx_whisper_cache_zone_valid
      ON whisper_cache(zone_id, valid_until DESC)
      ;
  END IF;
END $$;

-- =============================================================================
-- FIX RLS (from infrastructure/supabase/fix_rls.sql)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own data" ON users;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create user" ON users;
CREATE POLICY "Anyone can create user"
  ON users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true);

-- =============================================================================
-- RECONCILIATION / "ENSURE PRESENT" SECTION
-- (Adds columns referenced by functions/indexes across the repo.)
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE prices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =============================================================================
-- QUICK VERIFICATION QUERIES (optional)
-- =============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;
-- SELECT COUNT(*) AS cities_seeded FROM cities;
-- SELECT COUNT(*) AS badges_seeded FROM badges;
-- SELECT COUNT(*) AS quests_seeded FROM quests;
