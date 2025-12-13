-- Migration: 004_strategy_6_enhancements.sql
-- Description: Strategy 6.0+ database schema enhancements
-- Created: 2025-12-13

-- =============================================================================
-- USER PROFILE ENHANCEMENTS
-- =============================================================================

-- Add fingerprint field for texture/behavior tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS fingerprint JSONB DEFAULT '{
  "texture_preferences": {},
  "time_preferences": {},
  "activity_patterns": {},
  "computed_at": null
}'::jsonb;

-- Add operative mode tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_mode TEXT DEFAULT 'STANDARD' 
  CHECK (current_mode IN ('FAST_OPS', 'DEEP_OPS', 'SAFE_OPS', 'CRISIS', 'STANDARD'));

-- Add shadow copy mode flag (privacy mode)
ALTER TABLE users ADD COLUMN IF NOT EXISTS shadow_mode BOOLEAN DEFAULT false;

-- Add vitality tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS vitality INTEGER DEFAULT 100 
  CHECK (vitality >= 0 AND vitality <= 100);

-- =============================================================================
-- PRICES TABLE ENHANCEMENTS
-- =============================================================================

-- Add verification fields
ALTER TABLE prices ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0;
ALTER TABLE prices ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Add price delta tracking
ALTER TABLE prices ADD COLUMN IF NOT EXISTS zone_median_at_submission NUMERIC(10,2);
ALTER TABLE prices ADD COLUMN IF NOT EXISTS delta_percentage NUMERIC(5,2);

-- =============================================================================
-- REPORTS TABLE ENHANCEMENTS  
-- =============================================================================

-- Ensure HASSLE category exists
DO $$ 
BEGIN
  -- Update check constraint to include HASSLE
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

-- Add independent verification tracking (for auto-offline)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_independent BOOLEAN DEFAULT true;

-- =============================================================================
-- QUESTS TABLE (if not exists from previous migration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL DEFAULT 'daily' 
    CHECK (quest_type IN ('daily', 'weekly', 'achievement', 'special')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  karma_reward INTEGER NOT NULL DEFAULT 10,
  badge_reward TEXT,
  xp_reward INTEGER DEFAULT 0,
  required_level INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- BADGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common'
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  category TEXT DEFAULT 'general',
  unlock_criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- USER BADGES JUNCTION TABLE
-- =============================================================================

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

-- =============================================================================
-- OPERATIVE REPLAY TABLE (server-synced summaries only)
-- =============================================================================

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

-- =============================================================================
-- GHOST BEACONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ghost_beacons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  beacon_type TEXT NOT NULL DEFAULT 'interest'
    CHECK (beacon_type IN ('interest', 'hidden_gem', 'local_favorite', 'historic', 'viewpoint')),
  osm_tags JSONB DEFAULT '{}'::jsonb,
  discovered_count INTEGER DEFAULT 0,
  first_discovered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ghost_beacons_zone ON ghost_beacons(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_ghost_beacons_type ON ghost_beacons(beacon_type);

-- =============================================================================
-- WHISPER CACHE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS whisper_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  whisper_text TEXT NOT NULL,
  whisper_type TEXT NOT NULL DEFAULT 'intel'
    CHECK (whisper_type IN ('intel', 'price', 'safety', 'timing', 'local')),
  confidence NUMERIC(3,2) DEFAULT 0.8,
  data_sources JSONB DEFAULT '[]'::jsonb,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whisper_cache_zone ON whisper_cache(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_whisper_cache_valid ON whisper_cache(valid_until);

-- =============================================================================
-- SAFE CORRIDORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS safe_corridors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  geometry JSONB NOT NULL,
  vitality_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  lighting_score NUMERIC(3,2) DEFAULT 0.5,
  foot_traffic_score NUMERIC(3,2) DEFAULT 0.5,
  time_of_day TEXT DEFAULT 'all'
    CHECK (time_of_day IN ('all', 'day', 'night', 'morning', 'evening')),
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, city, time_of_day)
);

CREATE INDEX IF NOT EXISTS idx_safe_corridors_zone ON safe_corridors(zone_id, city);

-- =============================================================================
-- CRISIS EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL
    CHECK (trigger_type IN ('manual', 'shake', 'low_battery', 'sos_button', 'auto')),
  location_coarse JSONB, -- Coarse location only for privacy
  city TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crisis_events_user ON crisis_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crisis_events_unresolved ON crisis_events(resolved) WHERE resolved = false;

-- =============================================================================
-- DATA RETENTION POLICIES (Postgres pg_cron compatible)
-- =============================================================================

-- Create a function to purge old raw data
CREATE OR REPLACE FUNCTION purge_old_data() RETURNS void AS $$
BEGIN
  -- Delete activity logs older than 2 years (keep aggregates)
  DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Delete raw price submissions older than 1 year (keep aggregates)
  DELETE FROM prices WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Delete whisper cache older than validity
  DELETE FROM whisper_cache WHERE valid_until < NOW();
  
  -- Delete old replay summaries (keep 1 year)
  DELETE FROM replay_summaries WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Keep audit logs for 3+ years (compliance)
  -- Do not delete audit_logs automatically
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- KARMA AWARD FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION award_karma(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_quest_id TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_new_karma INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Update user karma
  UPDATE users 
  SET 
    karma = karma + p_delta,
    last_active = NOW()
  WHERE id = p_user_id
  RETURNING karma INTO v_new_karma;
  
  -- Calculate new level (simple formula: level = floor(sqrt(karma / 100)) + 1)
  v_new_level := GREATEST(1, FLOOR(SQRT(GREATEST(0, v_new_karma) / 100.0)) + 1);
  
  -- Update level if changed
  UPDATE users SET level = v_new_level WHERE id = p_user_id AND level != v_new_level;
  
  -- Log karma change
  INSERT INTO karma_logs (user_id, delta, reason, quest_id)
  VALUES (p_user_id, p_delta, p_reason, p_quest_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STREAK UPDATE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_last_active DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
BEGIN
  SELECT last_active::DATE, streak INTO v_last_active, v_current_streak
  FROM users WHERE id = p_user_id;
  
  IF v_last_active IS NULL OR v_last_active < v_today - INTERVAL '1 day' THEN
    -- Streak broken, reset to 1
    UPDATE users SET streak = 1, last_active = NOW() WHERE id = p_user_id;
    RETURN 1;
  ELSIF v_last_active = v_today - INTERVAL '1 day' THEN
    -- Continue streak
    UPDATE users SET streak = streak + 1, last_active = NOW() WHERE id = p_user_id
    RETURNING streak INTO v_current_streak;
    RETURN v_current_streak;
  ELSE
    -- Same day, no change
    UPDATE users SET last_active = NOW() WHERE id = p_user_id;
    RETURN v_current_streak;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUTO-OFFLINE ZONE FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_zone_auto_offline() RETURNS TRIGGER AS $$
DECLARE
  v_report_count INTEGER;
  v_distinct_devices INTEGER;
BEGIN
  -- Count reports for this zone in last 24 hours
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
  
  -- Auto-offline if >= 2 independent reports
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

-- Create trigger for auto-offline
DROP TRIGGER IF EXISTS trigger_zone_auto_offline ON reports;
CREATE TRIGGER trigger_zone_auto_offline
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION check_zone_auto_offline();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE replay_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE whisper_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_corridors ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can view quests" ON quests FOR SELECT USING (active = true);
CREATE POLICY "Public can view badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Public can view ghost beacons" ON ghost_beacons FOR SELECT USING (true);
CREATE POLICY "Public can view whisper cache" ON whisper_cache FOR SELECT USING (valid_until > NOW());
CREATE POLICY "Public can view safe corridors" ON safe_corridors FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own replay" ON replay_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own crisis events" ON crisis_events FOR SELECT USING (auth.uid() = user_id);

-- Insert policies (service role for most, users for some)
CREATE POLICY "Users can insert crisis events" ON crisis_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can insert replay summaries" ON replay_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SEED INITIAL BADGES
-- =============================================================================

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

-- =============================================================================
-- SEED INITIAL QUESTS
-- =============================================================================

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
