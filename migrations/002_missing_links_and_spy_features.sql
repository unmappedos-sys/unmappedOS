-- Migration: The 3 Missing Links + Spy-Craft Features
-- Adds: clearance levels, consensus verification, flash intel, dead drops

-- 1. ZONES TABLE ENHANCEMENTS (Clearance Levels)
ALTER TABLE zones ADD COLUMN IF NOT EXISTS clearance_level INT DEFAULT 1 
  CHECK (clearance_level >= 1 AND clearance_level <= 5);

COMMENT ON COLUMN zones.clearance_level IS 'Security clearance required to access zone (1=Rookie, 5=Field Agent)';

-- 2. REPORTS TABLE ENHANCEMENTS (Consensus Algorithm)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS verification_count INT DEFAULT 0;

COMMENT ON COLUMN reports.trust_score IS 'Algorithmic trust score based on verifications';
COMMENT ON COLUMN reports.verification_count IS 'Count of distinct Level 2+ users who verified this';

-- 3. USERS TABLE ENHANCEMENTS (Clearance Level Calculation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clearance_level INT GENERATED ALWAYS AS (
  CASE 
    WHEN karma >= 1000 THEN 5  -- Field Agent
    WHEN karma >= 500 THEN 3   -- Operative
    ELSE 1                      -- Rookie
  END
) STORED;

ALTER TABLE users ADD COLUMN IF NOT EXISTS level INT GENERATED ALWAYS AS (
  FLOOR(karma / 200) + 1
) STORED;

COMMENT ON COLUMN users.clearance_level IS 'Auto-calculated security clearance (1-5)';
COMMENT ON COLUMN users.level IS 'User level based on karma (1 level per 200 karma)';

-- 4. COMMENTS TABLE ENHANCEMENTS (Burn After Reading + Consensus)
ALTER TABLE comments ADD COLUMN IF NOT EXISTS flash_intel BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS verification_count INT DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

COMMENT ON COLUMN comments.flash_intel IS 'If true, this is ephemeral intel that expires';
COMMENT ON COLUMN comments.expires_at IS 'Timestamp when flash intel should be deleted';
COMMENT ON COLUMN comments.verification_count IS 'Number of distinct verifiers (triggers auto-verify at 3)';
COMMENT ON COLUMN comments.verified_at IS 'Timestamp when consensus verification was achieved';

-- 5. DEAD DROPS TABLE (P2P Offline Sharing)
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

COMMENT ON TABLE dead_drops IS 'P2P offline intel sharing via QR codes';

-- 6. RLS POLICIES FOR NEW TABLES
ALTER TABLE dead_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create dead drops"
  ON dead_drops FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view non-expired dead drops"
  ON dead_drops FOR SELECT
  USING (expires_at > NOW());

-- 7. FUNCTION: Auto-delete expired flash intel (for cron job)
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

-- 8. FUNCTION: Calculate zone clearance based on texture type
CREATE OR REPLACE FUNCTION auto_assign_zone_clearance()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign clearance based on zone type
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

CREATE TRIGGER assign_zone_clearance_before_insert
  BEFORE INSERT ON zones
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_zone_clearance();

-- 9. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_comments_flash_intel ON comments(flash_intel, expires_at) 
  WHERE flash_intel = TRUE;

CREATE INDEX IF NOT EXISTS idx_comments_verification_count ON comments(verification_count);

CREATE INDEX IF NOT EXISTS idx_zones_clearance_level ON zones(clearance_level);

CREATE INDEX IF NOT EXISTS idx_users_clearance_level ON users(clearance_level);

-- 10. Update existing zones to assign clearance levels
UPDATE zones SET clearance_level = 
  CASE 
    WHEN texture_type = 'deep_analog' THEN 5
    WHEN texture_type = 'silence' THEN 3
    ELSE 1
  END
WHERE clearance_level IS NULL OR clearance_level = 1;
