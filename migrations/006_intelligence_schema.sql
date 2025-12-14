-- ============================================================================
-- UNMAPPED OS - Intelligence Schema Extensions
-- Zone Confidence, Intel Submissions, Anomaly Detection
-- ============================================================================

-- Zone Confidence State
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

-- Zone Intel Submissions
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
    data JSONB NOT NULL DEFAULT '{}',
    trust_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    location GEOGRAPHY(POINT, 4326),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Zone Price Aggregates
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

-- Zone Hazard Log
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

-- Zone Anomaly Log
CREATE TABLE IF NOT EXISTS zone_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('PRICE_SPIKE', 'REPORT_SURGE', 'CONFIDENCE_DROP', 'CONFLICT_DETECTED')),
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
    data JSONB NOT NULL DEFAULT '{}',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    auto_resolved BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_zone_intel_zone_id ON zone_intel(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_intel_user_id ON zone_intel(user_id);
CREATE INDEX IF NOT EXISTS idx_zone_intel_type ON zone_intel(intel_type);
CREATE INDEX IF NOT EXISTS idx_zone_intel_created_at ON zone_intel(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_intel_zone_type_recent ON zone_intel(zone_id, intel_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zone_confidence_state ON zone_confidence(state);
CREATE INDEX IF NOT EXISTS idx_zone_confidence_hazard ON zone_confidence(hazard_active) WHERE hazard_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_zone_hazards_active ON zone_hazards(zone_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_zone_anomalies_unresolved ON zone_anomalies(zone_id) WHERE resolved_at IS NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Increment user karma
CREATE OR REPLACE FUNCTION increment_karma(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET karma = COALESCE(karma, 0) + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Update zone price aggregate
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
    -- Get current stats
    SELECT report_count, average_price INTO v_count, v_avg
    FROM zone_prices
    WHERE zone_id = p_zone_id AND item = p_item;
    
    IF v_count IS NULL THEN
        -- First report
        INSERT INTO zone_prices (zone_id, item, average_price, min_price, max_price, report_count, last_report_at)
        VALUES (p_zone_id, p_item, p_price, p_price, p_price, 1, NOW());
    ELSE
        -- Update running average
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

-- Apply daily confidence decay
CREATE OR REPLACE FUNCTION apply_confidence_decay()
RETURNS INTEGER AS $$
DECLARE
    decay_rate DECIMAL := 0.02;
    decay_floor DECIMAL := 20;
    grace_hours INTEGER := 24;
    affected_rows INTEGER;
BEGIN
    UPDATE zone_confidence
    SET score = GREATEST(
            decay_floor,
            score - (score * decay_rate * 
                EXTRACT(EPOCH FROM (NOW() - COALESCE(last_intel_at, created_at))) / 86400
            )
        ),
        level = CASE
            WHEN score >= 80 THEN 'HIGH'
            WHEN score >= 60 THEN 'MEDIUM'
            WHEN score >= 40 THEN 'LOW'
            WHEN score >= 20 THEN 'DEGRADED'
            ELSE 'UNKNOWN'
        END,
        intel_count_24h = 0,
        updated_at = NOW()
    WHERE last_intel_at < NOW() - INTERVAL '24 hours'
       OR last_intel_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Also expire old hazards
    UPDATE zone_confidence
    SET hazard_active = FALSE,
        hazard_expires_at = NULL,
        state = 'ACTIVE'
    WHERE hazard_active = TRUE
      AND hazard_expires_at < NOW();
    
    UPDATE zone_hazards
    SET active = FALSE,
        resolved_at = NOW()
    WHERE active = TRUE
      AND expires_at < NOW();
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Detect and log anomalies
CREATE OR REPLACE FUNCTION detect_zone_anomalies(p_zone_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_anomaly_detected BOOLEAN := FALSE;
    v_report_count INTEGER;
    v_conflict_count INTEGER;
BEGIN
    -- Check for report surge (>10 reports in 1 hour)
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
    
    -- Check for conflicts (quiet + crowd in 6h)
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
    
    -- Update zone confidence anomaly flag
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

-- Aggregate hazard reports and trigger kill switch
CREATE OR REPLACE FUNCTION aggregate_hazard_reports(p_zone_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_hazard_count INTEGER;
    v_threshold INTEGER := 2;
    v_kill_switch_triggered BOOLEAN := FALSE;
BEGIN
    -- Count hazard reports in 24h
    SELECT COUNT(*) INTO v_hazard_count
    FROM zone_intel
    WHERE zone_id = p_zone_id
      AND intel_type = 'HAZARD_REPORT'
      AND created_at > NOW() - INTERVAL '24 hours';
    
    IF v_hazard_count >= v_threshold THEN
        -- Trigger kill switch
        UPDATE zone_confidence
        SET hazard_active = TRUE,
            hazard_expires_at = NOW() + INTERVAL '7 days',
            state = 'OFFLINE',
            score = GREATEST(20, score - 30),
            updated_at = NOW()
        WHERE zone_id = p_zone_id;
        
        -- Log the hazard
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

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE zone_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_anomalies ENABLE ROW LEVEL SECURITY;

-- Anyone can read zone data
CREATE POLICY "zone_confidence_read" ON zone_confidence FOR SELECT USING (true);
CREATE POLICY "zone_prices_read" ON zone_prices FOR SELECT USING (true);
CREATE POLICY "zone_hazards_read" ON zone_hazards FOR SELECT USING (true);

-- Only service role can write
CREATE POLICY "zone_confidence_write" ON zone_confidence FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "zone_prices_write" ON zone_prices FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Users can read all intel, write their own
CREATE POLICY "zone_intel_read" ON zone_intel FOR SELECT USING (true);
CREATE POLICY "zone_intel_insert" ON zone_intel FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-detect anomalies after intel insert
CREATE OR REPLACE FUNCTION trigger_anomaly_detection()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM detect_zone_anomalies(NEW.zone_id);
    PERFORM aggregate_hazard_reports(NEW.zone_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_intel_insert
    AFTER INSERT ON zone_intel
    FOR EACH ROW
    EXECUTE FUNCTION trigger_anomaly_detection();
