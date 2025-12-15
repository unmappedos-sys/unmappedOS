-- =============================================================================
-- UNMAPPED OS - OPTIONAL CONCURRENT INDEXES
-- =============================================================================
-- Purpose
-- - Run AFTER you have applied infrastructure/supabase/consolidated.sql
-- - Uses CREATE INDEX CONCURRENTLY to minimize locking.
--
-- IMPORTANT
-- - These statements MUST NOT run inside a transaction.
-- - Do NOT paste into environments that auto-wrap everything in BEGIN/COMMIT.
--
-- Suggested ways to run:
-- - psql:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f concurrently_indexes.sql
-- - Windows PowerShell:
--     $env:DATABASE_URL = "<paste Supabase connection string>"
--     psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f concurrently_indexes.sql
-- - Supabase CLI (if it runs non-transactional): supabase db query --file concurrently_indexes.sql
--
-- If you see: "CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
-- you are running it in a transactional runner.
-- =============================================================================

-- Users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_city_karma
  ON users(city, karma DESC NULLS LAST)
  WHERE city IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_karma_desc
  ON users(karma DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_level_desc
  ON users(level DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_streak_desc
  ON users(streak DESC NULLS LAST);

-- Activity logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_created
  ON activity_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_type_created
  ON activity_logs(action_type, created_at DESC);

-- Audit logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_id
  ON audit_logs(actor_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

-- Prices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_zone_category_created
  ON prices(zone_id, category, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_city_category
  ON prices(city, category, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_created_desc
  ON prices(created_at DESC);

-- Prices (migration-001 compatible columns)
-- NOTE: consolidated.sql expands prices with item_type/price_value; many APIs use item_type.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_zone_item_type_created
  ON prices(zone_id, item_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_city_item_type
  ON prices(city, item_type, created_at DESC);

-- Prices (legacy time column)
-- NOTE: Some code paths filter by reported_at (30d median windows).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_reported_desc
  ON prices(reported_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_zone_category_reported
  ON prices(zone_id, category, reported_at DESC);

-- Reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_zone_status_created
  ON reports(zone_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_pending
  ON reports(status, created_at DESC)
  WHERE status = 'pending';

-- Quests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_active
  ON quests(active, quest_type)
  WHERE active = true;

-- User quests
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_quests_user_id
  ON user_quests(user_id, status);

-- User badges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_user
  ON user_badges(user_id, unlocked_at DESC);

-- Replay summaries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_replay_summaries_user_id
  ON replay_summaries(user_id, session_date DESC);

-- Ghost beacons
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ghost_beacons_zone
  ON ghost_beacons(zone_id, city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ghost_beacons_type
  ON ghost_beacons(beacon_type);

-- Comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_zone_created
  ON comments(zone_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created
  ON comments(user_id, created_at DESC);

-- Karma logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_karma_logs_user_created
  ON karma_logs(user_id, created_at DESC);

-- Zones
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zones_city_status
  ON zones(city, status);

-- Intelligence schema (migration 006)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_intel_created_at
  ON zone_intel(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_intel_zone_type_recent
  ON zone_intel(zone_id, intel_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_intel_user_id
  ON zone_intel(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_confidence_state
  ON zone_confidence(state);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_confidence_hazard
  ON zone_confidence(hazard_active)
  WHERE hazard_active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_hazards_active
  ON zone_hazards(zone_id, active)
  WHERE active = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_anomalies_unresolved
  ON zone_anomalies(zone_id)
  WHERE resolved_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zone_prices_zone_updated
  ON zone_prices(zone_id, updated_at DESC);

-- Crisis events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_events_user
  ON crisis_events(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_events_unresolved
  ON crisis_events(resolved)
  WHERE resolved = false;

-- Whisper cache
-- NOTE: We intentionally avoid partial predicates like "valid_until > NOW()" here.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whisper_cache_zone_valid
  ON whisper_cache(zone_id, valid_until DESC);

-- Optional: refresh planner stats after index creation
ANALYZE users;
ANALYZE activity_logs;
ANALYZE audit_logs;
ANALYZE prices;
ANALYZE reports;
ANALYZE comments;
ANALYZE karma_logs;
ANALYZE user_quests;
ANALYZE user_badges;
ANALYZE replay_summaries;
ANALYZE whisper_cache;
ANALYZE zone_confidence;
ANALYZE zone_intel;
ANALYZE zone_prices;
ANALYZE zone_hazards;
ANALYZE zone_anomalies;
