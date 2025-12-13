-- Unmapped OS Schema Extensions for Strategy 6.0
-- Add comments, search, and verification features

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geographic queries (optional but recommended)

-- =====================================================
-- PROFILES (extend users table functionality)
-- =====================================================

-- Add missing columns to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT FALSE;

-- =====================================================
-- EXTEND ZONES TABLE FOR SEARCH
-- =====================================================

-- Add search-related columns to zones
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

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_zones_search_vector ON zones USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_zones_search_tokens ON zones USING GIN(search_tokens);
CREATE INDEX IF NOT EXISTS idx_zones_texture_tags ON zones USING GIN(texture_tags);

-- Trigger to auto-update search_vector
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

-- =====================================================
-- COMMENTS / STRUCTURED INTEL
-- =====================================================

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id TEXT NOT NULL,
  city TEXT NOT NULL,
  user_hash TEXT, -- Nullable for anonymous
  short_tag TEXT NOT NULL CHECK (short_tag IN (
    'CONSTRUCTION', 'CROWD_SURGE', 'OVERPRICING', 'HASSLE',
    'SAFETY_OBSERVED', 'GOOD_FOR_DAY', 'GOOD_FOR_NIGHT',
    'CLEAN', 'TOILET_AVAILABLE', 'ACCESS_ISSUE'
  )),
  note TEXT NOT NULL CHECK (LENGTH(note) <= 240),
  price NUMERIC,
  photo_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  moderated BOOLEAN DEFAULT FALSE,
  trust_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_zone_id ON comments(zone_id);
CREATE INDEX IF NOT EXISTS idx_comments_city ON comments(city);
CREATE INDEX IF NOT EXISTS idx_comments_trust_score ON comments(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_moderated ON comments(moderated) WHERE moderated = FALSE;

-- RLS for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone (non-moderated)"
  ON comments FOR SELECT
  USING (moderated = FALSE);

CREATE POLICY "Anyone can insert comments"
  ON comments FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- COMMENT VERIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  verifier_id TEXT NOT NULL, -- User ID or hash
  vote TEXT NOT NULL CHECK (vote IN ('accurate', 'inaccurate')),
  verification_weight NUMERIC DEFAULT 1,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, verifier_id)
);

CREATE INDEX IF NOT EXISTS idx_verifications_comment_id ON comment_verifications(comment_id);

ALTER TABLE comment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verifications are viewable by everyone"
  ON comment_verifications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert verifications"
  ON comment_verifications FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- COMMENT FLAGS
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'offensive', 'misleading', 'other')),
  flagged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_comment_id ON comment_flags(comment_id);

ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can flag comments"
  ON comment_flags FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- CITIES TABLE
-- =====================================================

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

-- Insert default cities
INSERT INTO cities (name, country, display_name, enabled) VALUES
  ('bangkok', 'Thailand', 'Bangkok', TRUE),
  ('tokyo', 'Japan', 'Tokyo', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- UPDATED FUNCTIONS
-- =====================================================

-- Update increment_karma to support TEXT user_id for anonymous users
DROP FUNCTION IF EXISTS increment_karma(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION increment_karma(
  p_user_id TEXT,
  p_amount INTEGER,
  p_reason TEXT
) RETURNS VOID AS $$
BEGIN
  -- Insert karma log
  INSERT INTO karma_logs (user_id, delta, reason)
  VALUES (p_user_id::UUID, p_amount, p_reason);
  
  -- Update user karma (if valid UUID)
  BEGIN
    UPDATE users
    SET karma = karma + p_amount
    WHERE id = p_user_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- User might be anonymous or not UUID, skip
    NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate zone hassle score from comments
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

-- =====================================================
-- MATERIALIZED VIEW FOR SEARCH (OPTIONAL)
-- =====================================================

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

-- Function to refresh search index (call periodically)
CREATE OR REPLACE FUNCTION refresh_search_index() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY zone_search_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE comments IS 'Structured field intelligence from operatives';
COMMENT ON TABLE comment_verifications IS 'Peer verification votes for comment accuracy';
COMMENT ON TABLE comment_flags IS 'Moderation flags for inappropriate comments';
COMMENT ON TABLE cities IS 'Available cities with pack metadata';
