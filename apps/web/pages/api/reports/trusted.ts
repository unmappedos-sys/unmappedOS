/**
 * Trust Web & Anomaly Detection API
 * Prevents "Competitor Sabotage" and data poisoning attacks
 * 
 * Risk: Coffee shop owner reports competitor as "Closed" or "High Hassle"
 * Solution: Trust scoring + anomaly detection
 * 
 * Trust Weights:
 * - New users (Level 1): 0.1
 * - Veterans (Level 5+): 1.0
 * 
 * Anomaly Detection:
 * - If 1 user reports hazard but 10 others don't within same hour = SUSPICIOUS
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TrustScore {
  user_id: string;
  trust_weight: number;
  level: number;
  karma: number;
  report_accuracy: number; // Percentage of reports confirmed by others
  suspicious_flags: number;
}

/**
 * Calculate user's trust weight based on karma and history
 */
async function calculateTrustWeight(userId: string): Promise<number> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: user } = await supabase
    .from('users')
    .select('karma, metadata')
    .eq('id', userId)
    .single();

  if (!user) return 0.1;

  const level = Math.floor(user.karma / 200) + 1;
  
  // Base trust weight from level
  let trustWeight = 0.1 + (level * 0.15); // 0.1 at L1, 1.0 at L6+
  trustWeight = Math.min(trustWeight, 1.0);

  // Penalize for suspicious flags
  const suspiciousFlags = user.metadata?.suspicious_flags || 0;
  if (suspiciousFlags > 0) {
    trustWeight *= Math.max(0.1, 1 - (suspiciousFlags * 0.2));
  }

  return trustWeight;
}

/**
 * Detect anomalies in reports
 * Returns true if report is suspicious
 */
async function detectAnomaly(
  zoneId: string,
  category: string,
  userId: string,
  timestamp: string
): Promise<{ suspicious: boolean; reason?: string }> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check: How many other users reported similar issues in same zone in last hour?
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recentReports } = await supabase
    .from('reports')
    .select('id, user_id, category')
    .eq('zone_id', zoneId)
    .gte('created_at', oneHourAgo);

  if (!recentReports) {
    return { suspicious: false };
  }

  // Count distinct users who visited zone but DIDN'T report this issue
  const reportingUsers = recentReports
    .filter((r) => r.category === category)
    .map((r) => r.user_id);

  const nonReportingUsers = recentReports
    .filter((r) => r.category !== category && r.user_id !== userId)
    .map((r) => r.user_id);

  const uniqueNonReporting = new Set(nonReportingUsers).size;

  // If 10+ users visited zone without reporting this issue, flag as suspicious
  if (uniqueNonReporting >= 10 && reportingUsers.length === 0) {
    return {
      suspicious: true,
      reason: 'ANOMALY_DETECTED: 10+ users in zone did not report this issue',
    };
  }

  // Check: Is this user reporting the SAME zone repeatedly?
  const { data: userReports } = await supabase
    .from('reports')
    .select('id, zone_id')
    .eq('user_id', userId)
    .eq('zone_id', zoneId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

  if (userReports && userReports.length > 5) {
    return {
      suspicious: true,
      reason: 'SPAM_DETECTED: User reported same zone 5+ times in 7 days',
    };
  }

  // Check: Is user reporting competitors (same category, nearby locations)?
  // This requires additional business logic - simplified here
  const { data: nearbyReports } = await supabase
    .rpc('find_nearby_reports', {
      p_zone_id: zoneId,
      p_user_id: userId,
      p_days: 7,
      p_radius_km: 0.5,
    })
    .limit(10);

  if (nearbyReports && nearbyReports.length > 3) {
    return {
      suspicious: true,
      reason: 'PATTERN_DETECTED: Multiple reports in competing businesses nearby',
    };
  }

  return { suspicious: false };
}

/**
 * Submit a report with trust scoring and anomaly detection
 */
async function submitTrustedReport(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, zone_id, city, category, metadata } = req.body;

  if (!user_id || !zone_id || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Calculate user trust weight
  const trustWeight = await calculateTrustWeight(user_id);

  // Detect anomalies
  const anomaly = await detectAnomaly(zone_id, category, user_id, new Date().toISOString());

  let reportStatus = 'ACCEPTED';
  let karmaAwarded = 10;

  if (anomaly.suspicious) {
    reportStatus = 'FLAGGED';
    karmaAwarded = 0; // No karma for suspicious reports
    
    // Log suspicious activity
    await supabase.from('suspicious_activity').insert({
      user_id,
      activity_type: 'SUSPICIOUS_REPORT',
      reason: anomaly.reason,
      metadata: { zone_id, category },
      created_at: new Date().toISOString(),
    });

    // Increment suspicious flags
    await supabase.rpc('increment_user_flags', {
      p_user_id: user_id,
    });
  }

  // Insert report with trust score
  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert({
      user_id,
      zone_id,
      city,
      category,
      metadata: {
        ...metadata,
        trust_weight: trustWeight,
        anomaly_flagged: anomaly.suspicious,
        anomaly_reason: anomaly.reason,
      },
      trust_score: trustWeight * 100,
      status: reportStatus,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Report insert error:', insertError);
    return res.status(500).json({ error: 'Failed to submit report' });
  }

  // Award karma only if not flagged
  if (karmaAwarded > 0) {
    await supabase.rpc('increment_karma', {
      p_user_id: user_id,
      p_amount: karmaAwarded,
      p_reason: 'report_submitted',
    });
  }

  return res.status(201).json({
    success: true,
    report_id: report.id,
    status: reportStatus,
    trust_weight: trustWeight.toFixed(2),
    karma_awarded: karmaAwarded,
    message: anomaly.suspicious
      ? 'REPORT FLAGGED // UNDER REVIEW'
      : 'REPORT ACCEPTED // TRUST VERIFIED',
    warning: anomaly.suspicious ? anomaly.reason : undefined,
  });
}

/**
 * Get user's trust score
 */
async function getTrustScore(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user } = await supabase
    .from('users')
    .select('karma, metadata')
    .eq('id', user_id)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const level = Math.floor(user.karma / 200) + 1;
  const trustWeight = await calculateTrustWeight(user_id);

  // Calculate report accuracy
  const { data: reports } = await supabase
    .from('reports')
    .select('id, verification_count')
    .eq('user_id', user_id)
    .limit(100);

  const totalReports = reports?.length || 0;
  const verifiedReports = reports?.filter((r) => r.verification_count >= 2).length || 0;
  const accuracy = totalReports > 0 ? (verifiedReports / totalReports) * 100 : 0;

  const trustScore: TrustScore = {
    user_id,
    trust_weight: parseFloat(trustWeight.toFixed(2)),
    level,
    karma: user.karma,
    report_accuracy: parseFloat(accuracy.toFixed(1)),
    suspicious_flags: user.metadata?.suspicious_flags || 0,
  };

  return res.status(200).json(trustScore);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return submitTrustedReport(req, res);
  } else if (req.method === 'GET') {
    return getTrustScore(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
