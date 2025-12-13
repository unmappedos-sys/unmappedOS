-- Migration: 001_gamification_tables.sql
-- Description: Add gamification fields to users and create activity/audit logging tables
-- Created: 2025-12-12

-- Add gamification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operative';
ALTER TABLE users ADD COLUMN IF NOT EXISTS karma INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_intel INTEGER DEFAULT 0;

-- Create index on role for permission checks
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- Activity logs table (user-visible actions)
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

-- Audit logs table (immutable, admin-level events)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT NOT NULL, -- Can be user_id or 'SYSTEM'
  action TEXT NOT NULL,
  resource JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit logs are append-only, immutable
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Karma logs table (tracks all karma changes)
CREATE TABLE IF NOT EXISTS karma_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  quest_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_karma_logs_user_id ON karma_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_karma_logs_quest_id ON karma_logs(quest_id);

-- Quests tracking table
CREATE TABLE IF NOT EXISTS user_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'failed'
  progress JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON user_quests(user_id, status);

-- Comments table enhancements (if not exists)
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_zone_id ON comments(zone_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Reports table (hazards, offline zones)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'hazard', 'offline', 'price_anomaly'
  description TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'resolved', 'dismissed'
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reports_zone_id ON reports(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'coffee', 'meal', 'transport', 'accommodation'
  price_value DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prices_zone_id ON prices(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_user_id ON prices(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_created_at ON prices(created_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own activity logs
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own karma logs
CREATE POLICY "Users can view own karma" ON karma_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own quests
CREATE POLICY "Users can view own quests" ON user_quests
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can read audit logs
CREATE POLICY "Service role can view audit" ON audit_logs
  FOR SELECT USING (true);

-- Service role bypass for all operations
CREATE POLICY "Service role full access activity" ON activity_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access karma" ON karma_logs
  FOR ALL USING (true);

CREATE POLICY "Service role full access quests" ON user_quests
  FOR ALL USING (true);

CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (true);

-- Comments RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Reports RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reports" ON reports
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Prices RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prices" ON prices
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create prices" ON prices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for streak management
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET
    last_active = NEW.created_at,
    streak = CASE
      WHEN (NEW.created_at - last_active) < INTERVAL '48 hours' THEN streak + 1
      WHEN (NEW.created_at - last_active) >= INTERVAL '48 hours' THEN 1
      ELSE streak
    END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update streak on activity
CREATE TRIGGER update_streak_on_activity
  AFTER INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak();

-- Function to award karma (atomic)
CREATE OR REPLACE FUNCTION award_karma(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_quest_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Insert karma log
  INSERT INTO karma_logs (user_id, delta, reason, quest_id)
  VALUES (p_user_id, p_delta, p_reason, p_quest_id);

  -- Update user karma and potentially level
  UPDATE users
  SET
    karma = karma + p_delta,
    level = GREATEST(1, FLOOR(SQRT((karma + p_delta) / 100.0)) + 1),
    total_intel = total_intel + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE activity_logs IS 'User-visible activity log for Operative Record';
COMMENT ON TABLE audit_logs IS 'Immutable system audit log for compliance and security';
COMMENT ON TABLE karma_logs IS 'Track all karma changes with reasons';
COMMENT ON TABLE user_quests IS 'Track user quest progress';
