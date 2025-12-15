-- =============================================================================
-- UNMAPPED OS - OPTIONAL INDEXES (NON-CONCURRENT)
-- =============================================================================
-- Purpose
-- - Run AFTER you have applied infrastructure/supabase/consolidated.sql
-- - Uses plain CREATE INDEX so it CAN run inside a transaction.
--   (This makes it suitable for the Supabase SQL editor / dashboard runner.)
--
-- IMPORTANT
-- - Plain CREATE INDEX may take stronger locks than CREATE INDEX CONCURRENTLY.
-- - Run during low traffic.
-- - If you have a large production database, prefer concurrently_indexes.sql
--   from a non-transactional client (psql).
--
-- SCHEMA COMPATIBILITY
-- - This script is written to be safe across schema variants.
-- - It conditionally creates indexes depending on whether tables/columns exist
--   (e.g. prices.category vs prices.item_type).
-- =============================================================================

DO $$
BEGIN
  -- Users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='city')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='karma') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_city_karma ON users(city, karma DESC NULLS LAST) WHERE city IS NOT NULL';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='karma') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_karma_desc ON users(karma DESC NULLS LAST)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='level') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_level_desc ON users(level DESC NULLS LAST)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='streak') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_streak_desc ON users(streak DESC NULLS LAST)';
    END IF;
  END IF;

  -- Activity logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity_logs(user_id, created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='action_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activity_logs' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_type_created ON activity_logs(action_type, created_at DESC)';
    END IF;
  END IF;

  -- Audit logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='actor_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id, created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='action') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)';
    END IF;
  END IF;

  -- Prices (supports both consolidated.sql and migration-001 shapes)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prices') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_created_desc ON prices(created_at DESC)';
    END IF;

    -- category variant
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='category')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_zone_category_created ON prices(zone_id, category, created_at DESC)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='city')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='category')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_city_category ON prices(city, category, created_at DESC)';
    END IF;

    -- item_type variant
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='item_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_zone_item_type_created ON prices(zone_id, item_type, created_at DESC)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='city')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='item_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_city_item_type ON prices(city, item_type, created_at DESC)';
    END IF;

    -- reported_at variant (time-window/median queries)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='reported_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_reported_desc ON prices(reported_at DESC)';

      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='zone_id')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prices' AND column_name='category') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_prices_zone_category_reported ON prices(zone_id, category, reported_at DESC)';
      END IF;
    END IF;
  END IF;

  -- Reports
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reports') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='status')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reports_zone_status_created ON reports(zone_id, status, created_at DESC)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='status')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reports_pending ON reports(status, created_at DESC) WHERE status = ''pending''';
    END IF;
  END IF;

  -- Quests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quests' AND column_name='active')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quests' AND column_name='quest_type') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_quests_active ON quests(active, quest_type) WHERE active = true';
    END IF;
  END IF;

  -- User quests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_quests') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_quests' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_quests' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id, status)';
    END IF;
  END IF;

  -- User badges
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_badges') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_badges' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_badges' AND column_name='unlocked_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, unlocked_at DESC)';
    END IF;
  END IF;

  -- Replay summaries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='replay_summaries') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='replay_summaries' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='replay_summaries' AND column_name='session_date') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_replay_summaries_user_id ON replay_summaries(user_id, session_date DESC)';
    END IF;
  END IF;

  -- Ghost beacons
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ghost_beacons') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ghost_beacons' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ghost_beacons' AND column_name='city') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ghost_beacons_zone ON ghost_beacons(zone_id, city)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ghost_beacons' AND column_name='beacon_type') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_ghost_beacons_type ON ghost_beacons(beacon_type)';
    END IF;
  END IF;

  -- Comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='comments' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='comments' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_comments_zone_created ON comments(zone_id, created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='comments' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='comments' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC)';
    END IF;
  END IF;

  -- Karma logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='karma_logs') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='karma_logs' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='karma_logs' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_karma_logs_user_created ON karma_logs(user_id, created_at DESC)';
    END IF;
  END IF;

  -- Zones
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zones') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='city')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zones' AND column_name='status') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zones_city_status ON zones(city, status)';
    END IF;
  END IF;

  -- Intelligence schema (migration 006)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_intel') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_intel' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_intel_created_at ON zone_intel(created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_intel' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_intel' AND column_name='intel_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_intel' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_intel_zone_type_recent ON zone_intel(zone_id, intel_type, created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_intel' AND column_name='user_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_intel_user_id ON zone_intel(user_id)';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_confidence') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_confidence' AND column_name='state') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_confidence_state ON zone_confidence(state)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_confidence' AND column_name='hazard_active') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_confidence_hazard ON zone_confidence(hazard_active) WHERE hazard_active = TRUE';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_hazards') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_hazards' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_hazards' AND column_name='active') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_hazards_active ON zone_hazards(zone_id, active) WHERE active = TRUE';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_anomalies') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_anomalies' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_anomalies' AND column_name='resolved_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_anomalies_unresolved ON zone_anomalies(zone_id) WHERE resolved_at IS NULL';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_prices') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_prices' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='zone_prices' AND column_name='updated_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_zone_prices_zone_updated ON zone_prices(zone_id, updated_at DESC)';
    END IF;
  END IF;

  -- Crisis events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crisis_events') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crisis_events' AND column_name='user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crisis_events' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crisis_events_user ON crisis_events(user_id, created_at DESC)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='crisis_events' AND column_name='resolved') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_crisis_events_unresolved ON crisis_events(resolved) WHERE resolved = false';
    END IF;
  END IF;

  -- Whisper cache
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whisper_cache') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whisper_cache' AND column_name='zone_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whisper_cache' AND column_name='valid_until') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_whisper_cache_zone_valid ON whisper_cache(zone_id, valid_until DESC)';
    END IF;
  END IF;

  -- Optional: refresh planner stats after index creation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN EXECUTE 'ANALYZE users'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='activity_logs') THEN EXECUTE 'ANALYZE activity_logs'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN EXECUTE 'ANALYZE audit_logs'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prices') THEN EXECUTE 'ANALYZE prices'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reports') THEN EXECUTE 'ANALYZE reports'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comments') THEN EXECUTE 'ANALYZE comments'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='karma_logs') THEN EXECUTE 'ANALYZE karma_logs'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_quests') THEN EXECUTE 'ANALYZE user_quests'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_badges') THEN EXECUTE 'ANALYZE user_badges'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='replay_summaries') THEN EXECUTE 'ANALYZE replay_summaries'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whisper_cache') THEN EXECUTE 'ANALYZE whisper_cache'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_confidence') THEN EXECUTE 'ANALYZE zone_confidence'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_intel') THEN EXECUTE 'ANALYZE zone_intel'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_prices') THEN EXECUTE 'ANALYZE zone_prices'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_hazards') THEN EXECUTE 'ANALYZE zone_hazards'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='zone_anomalies') THEN EXECUTE 'ANALYZE zone_anomalies'; END IF;
END $$;
