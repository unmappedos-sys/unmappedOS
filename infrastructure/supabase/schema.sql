-- Unmapped OS Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  category TEXT NOT NULL CHECK (category IN (
    'OBSTRUCTION',
    'CROWD_SURGE',
    'CLOSED',
    'DATA_ANOMALY',
    'AGGRESSIVE_TOUTING',
    'CONFUSING_TRANSIT',
    'OVERPRICING'
  )),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'meal_cheap',
    'meal_mid',
    'coffee',
    'beer',
    'water_bottle',
    'transit_single',
    'accommodation_budget',
    'accommodation_mid'
  )),
  amount NUMERIC(10,2) NOT NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_zone_city ON reports(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

CREATE INDEX IF NOT EXISTS idx_prices_zone_city ON prices(zone_id, city);
CREATE INDEX IF NOT EXISTS idx_prices_created_at ON prices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_item ON prices(item);

CREATE INDEX IF NOT EXISTS idx_zones_city ON zones(city);
CREATE INDEX IF NOT EXISTS idx_zones_status ON zones(status);

CREATE INDEX IF NOT EXISTS idx_karma_logs_user_id ON karma_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_karma_logs_created_at ON karma_logs(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE karma_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Users can read their own data, anyone can insert (for registration)
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Anyone can create user"
  ON users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Reports: Anyone can insert (anonymous allowed), users can view own
CREATE POLICY "Anyone can submit reports"
  ON reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Public can view reports (anonymized)"
  ON reports FOR SELECT
  USING (true);

-- Prices: Anyone can insert, users can view own
CREATE POLICY "Anyone can submit prices"
  ON prices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own prices"
  ON prices FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Public can view prices (anonymized)"
  ON prices FOR SELECT
  USING (true);

-- Zones: Public read, service role write
CREATE POLICY "Public can view zones"
  ON zones FOR SELECT
  USING (true);

-- Karma logs: Users can view own logs
CREATE POLICY "Users can view own karma logs"
  ON karma_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for zones
CREATE TRIGGER update_zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to aggregate reports and mark zones offline
CREATE OR REPLACE FUNCTION check_zone_hazards()
RETURNS void AS $$
DECLARE
  zone_record RECORD;
  report_count INTEGER;
BEGIN
  -- Check each zone for reports in last 24 hours
  FOR zone_record IN SELECT DISTINCT zone_id, city FROM reports WHERE created_at > NOW() - INTERVAL '24 hours'
  LOOP
    -- Count distinct users reporting this zone
    SELECT COUNT(DISTINCT user_id) INTO report_count
    FROM reports
    WHERE zone_id = zone_record.zone_id
      AND city = zone_record.city
      AND created_at > NOW() - INTERVAL '24 hours';

    -- If 2+ distinct users reported, mark zone OFFLINE
    IF report_count >= 2 THEN
      UPDATE zones
      SET status = 'OFFLINE'
      WHERE zone_id = zone_record.zone_id;
      
      RAISE NOTICE 'Zone % marked OFFLINE due to % reports', zone_record.zone_id, report_count;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment user karma
CREATE OR REPLACE FUNCTION increment_karma(
  user_id_param UUID,
  delta INTEGER,
  reason TEXT
)
RETURNS void AS $$
BEGIN
  -- Update user karma
  UPDATE users
  SET karma = karma + delta
  WHERE id = user_id_param;
  
  -- Log karma change
  INSERT INTO karma_logs (user_id, delta, reason)
  VALUES (user_id_param, delta, reason);
  
  RAISE NOTICE 'User % karma changed by % (reason: %)', user_id_param, delta, reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment metadata
COMMENT ON TABLE users IS 'Operative accounts with karma scores';
COMMENT ON TABLE reports IS 'Crowdsourced hazard and issue reports';
COMMENT ON TABLE prices IS 'Crowdsourced price verification data';
COMMENT ON TABLE zones IS 'City zone geometries and anchor points';
COMMENT ON TABLE karma_logs IS 'Audit log of karma changes';
