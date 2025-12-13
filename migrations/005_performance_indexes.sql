-- Migration: Performance Indexes for Scale
-- Run this after initial schema setup
--
-- DEPENDENCIES:
-- - 001_gamification_tables.sql (users, karma_logs, user_quests, user_badges)
-- - 002_missing_links_and_spy_features.sql (prices, comments, reports)
-- - 004_strategy_6_enhancements.sql (quests, activity_logs)
--
-- NOTE: Some indexes may already exist from previous migrations.
-- This is safe - PostgreSQL will skip duplicate index creation.

-- ============================================
-- LEADERBOARD INDEXES
-- ============================================
-- Global karma leaderboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_karma_desc 
  ON users(karma DESC NULLS LAST);

-- City-specific karma leaderboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_city_karma 
  ON users(city, karma DESC NULLS LAST) 
  WHERE city IS NOT NULL;

-- Level leaderboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_level_desc 
  ON users(level DESC NULLS LAST);

-- Streak leaderboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_streak_desc 
  ON users(streak DESC NULLS LAST);

-- ============================================
-- ACTIVITY LOG INDEXES
-- ============================================
-- User activity feed (most recent first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_user_created 
  ON activity_logs(user_id, created_at DESC);

-- Action type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_type_created 
  ON activity_logs(action_type, created_at DESC);

-- Zone activity aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_zone_created 
  ON activity_logs(zone_id, created_at DESC) 
  WHERE zone_id IS NOT NULL;

-- ============================================
-- PRICE INDEXES
-- ============================================
-- Zone price history (for median calculation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_zone_category_created 
  ON prices(zone_id, category, created_at DESC);

-- Recent prices for aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_created_desc 
  ON prices(created_at DESC);

-- City price overview
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prices_city_category 
  ON prices(city, category, created_at DESC);

-- ============================================
-- REPORT INDEXES
-- ============================================
-- Zone report aggregation (for auto-offline logic)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_zone_status_created 
  ON reports(zone_id, status, created_at DESC);

-- Pending reports for moderation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_pending 
  ON reports(status, created_at DESC) 
  WHERE status = 'pending';

-- ============================================
-- QUEST/BADGE INDEXES
-- ============================================
-- Note: idx_user_quests_user_id already exists in 001_gamification_tables.sql
-- This migration only adds additional quest-related indexes

-- Active quests (requires migration 004_strategy_6_enhancements.sql)
-- Skip if quests table doesn't exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quests') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_active 
      ON quests(active, quest_type) 
      WHERE active = true;
  END IF;
END $$;

-- User badges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_user 
  ON user_badges(user_id, unlocked_at DESC);

-- ============================================
-- COMMENT INDEXES
-- ============================================
-- Zone comments (most recent first)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_zone_created 
  ON comments(zone_id, created_at DESC);

-- User comment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created 
  ON comments(user_id, created_at DESC);

-- ============================================
-- KARMA LOG INDEXES
-- ============================================
-- User karma history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_karma_logs_user_created 
  ON karma_logs(user_id, created_at DESC);

-- ============================================
-- ZONE INDEXES
-- ============================================
-- City zone lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zones_city_status 
  ON zones(city, status);

-- Geo queries (if using PostGIS)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_zones_geo 
--   ON zones USING GIST (polygon);

-- ============================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================
-- Active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
  ON users(last_active DESC) 
  WHERE last_active > NOW() - INTERVAL '30 days';

-- High karma users (for featured operatives)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_high_karma 
  ON users(karma DESC) 
  WHERE karma >= 1000;

-- ============================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================
-- Whisper engine query optimization (requires migration 004)
-- Note: Column is valid_until, not expires_at
-- Skip if whisper_cache table doesn't exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whisper_cache') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whisper_cache_zone_valid 
      ON whisper_cache(zone_id, valid_until DESC) 
      WHERE valid_until > NOW();
  END IF;
END $$;

-- ============================================
-- ANALYZE TABLES
-- ============================================
ANALYZE users;
ANALYZE activity_logs;
ANALYZE prices;
ANALYZE reports;
ANALYZE comments;
ANALYZE karma_logs;
ANALYZE user_quests;
ANALYZE user_badges;

-- ============================================
-- NOTES
-- ============================================
-- 1. All indexes use CONCURRENTLY to avoid locking tables
-- 2. Run during low-traffic periods
-- 3. Monitor index usage: SELECT * FROM pg_stat_user_indexes;
-- 4. Remove unused indexes after 30 days of monitoring
-- 5. Consider partitioning activity_logs by month if > 10M rows
