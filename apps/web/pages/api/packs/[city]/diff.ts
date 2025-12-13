/**
 * Pack Diff API - Lightweight incremental pack updates
 * Returns only zone status changes and critical hazards since timestamp
 * Solves: Offline users with stale data after regaining connectivity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ZoneStatusChange {
  zone_id: string;
  old_status: string;
  new_status: string;
  status_reason?: string;
  updated_at: string;
}

interface HighPriorityHazard {
  id: string;
  zone_id: string;
  category: string;
  severity: number;
  created_at: string;
  metadata: any;
}

interface DiffResponse {
  city: string;
  since: string;
  now: string;
  status_changes: ZoneStatusChange[];
  new_hazards: HighPriorityHazard[];
  kill_switches: string[]; // Zone IDs marked OFFLINE
  diff_size_bytes: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, since } = req.query;

  if (typeof city !== 'string') {
    return res.status(400).json({ error: 'Invalid city parameter' });
  }

  if (!since || typeof since !== 'string') {
    return res.status(400).json({ error: 'Missing "since" timestamp parameter' });
  }

  // Validate timestamp
  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp format. Use ISO 8601.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // 1. Get zone status changes
    const { data: statusChanges, error: statusError } = await supabase
      .from('zones')
      .select('zone_id, status, status_reason, updated_at')
      .eq('city', city)
      .gte('updated_at', since)
      .order('updated_at', { ascending: false });

    if (statusError) {
      console.error('Status fetch error:', statusError);
      return res.status(500).json({ error: 'Failed to fetch status changes' });
    }

    // 2. Get high-priority hazards (recent reports with high severity)
    const { data: newHazards, error: hazardsError } = await supabase
      .from('reports')
      .select('id, zone_id, category, metadata, created_at')
      .eq('city', city)
      .gte('created_at', since)
      .in('category', ['OBSTRUCTION', 'CLOSED', 'AGGRESSIVE_TOUTING'])
      .order('created_at', { ascending: false })
      .limit(50); // Cap at 50 most recent

    if (hazardsError) {
      console.error('Hazards fetch error:', hazardsError);
      return res.status(500).json({ error: 'Failed to fetch hazards' });
    }

    // 3. Extract "kill switches" - zones now marked OFFLINE
    const killSwitches = (statusChanges || [])
      .filter((z: any) => z.status === 'OFFLINE')
      .map((z: any) => z.zone_id);

    // 4. Build diff response
    const diffResponse: DiffResponse = {
      city,
      since,
      now,
      status_changes: (statusChanges || []).map((z: any) => ({
        zone_id: z.zone_id,
        old_status: 'ACTIVE', // Simplified - in production, track previous state
        new_status: z.status,
        status_reason: z.status_reason,
        updated_at: z.updated_at,
      })),
      new_hazards: (newHazards || []).map((h: any) => ({
        id: h.id,
        zone_id: h.zone_id,
        category: h.category,
        severity: h.category === 'CLOSED' ? 10 : h.category === 'OBSTRUCTION' ? 8 : 5,
        created_at: h.created_at,
        metadata: h.metadata,
      })),
      kill_switches: killSwitches,
      diff_size_bytes: 0, // Will be calculated
    };

    // Calculate diff size
    const jsonString = JSON.stringify(diffResponse);
    diffResponse.diff_size_bytes = Buffer.byteLength(jsonString, 'utf8');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Diff-Size', String(diffResponse.diff_size_bytes));
    res.setHeader('X-Since', since);
    res.setHeader('X-Now', now);
    
    return res.status(200).json(diffResponse);
  } catch (error) {
    console.error('Diff API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
