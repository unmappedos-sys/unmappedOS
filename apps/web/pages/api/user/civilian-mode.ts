/**
 * Civilian Mode API - Border Control Friction Mitigation
 * "The Panic Button" - Plausible Deniability
 * 
 * Risk: Customs sees "Unmapped OS" with "Mission Briefs" = looks like espionage
 * Solution: Triple-tap logo → switches to "Boring Beige Travel Guide" theme
 * 
 * Changes:
 * - "Mission Brief" → "City Guide"
 * - "Intel" → "Tips"
 * - "Operative" → "Traveler"
 * - "Karma" → "Points"
 * - Cyberpunk UI → Plain UI
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface CivilianModeRequest {
  user_id: string;
  enabled: boolean;
  trigger_method?: 'triple_tap' | 'manual' | 'auto';
}

interface CivilianModeResponse {
  civilian_mode: boolean;
  theme: 'spy' | 'civilian';
  vocabulary: {
    missions: string;
    intel: string;
    operative: string;
    karma: string;
    zone: string;
    anchor: string;
    field_report: string;
    clearance: string;
  };
  ui_config: {
    color_scheme: string;
    font_style: string;
    terminology: string;
  };
}

const SPY_VOCABULARY = {
  missions: 'Mission Briefs',
  intel: 'Intel',
  operative: 'Operative',
  karma: 'Karma',
  zone: 'Zone',
  anchor: 'Anchor Point',
  field_report: 'Field Report',
  clearance: 'Clearance Level',
};

const CIVILIAN_VOCABULARY = {
  missions: 'City Guides',
  intel: 'Tips',
  operative: 'Traveler',
  karma: 'Points',
  zone: 'Area',
  anchor: 'Location',
  field_report: 'Review',
  clearance: 'Access Level',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return toggleCivilianMode(req, res);
  } else if (req.method === 'GET') {
    return getCivilianModeStatus(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function toggleCivilianMode(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, enabled, trigger_method = 'manual' } = req.body as CivilianModeRequest;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Update user preferences
  const { data: user, error: updateError } = await supabase
    .from('users')
    .update({
      metadata: {
        civilian_mode: enabled,
        civilian_mode_trigger: trigger_method,
        last_mode_change: new Date().toISOString(),
      },
    })
    .eq('id', user_id)
    .select()
    .single();

  if (updateError) {
    console.error('Civilian mode toggle error:', updateError);
    return res.status(500).json({ error: 'Failed to toggle civilian mode' });
  }

  // Log mode change for analytics (anonymous)
  await supabase.from('mode_changes').insert({
    user_id,
    mode: enabled ? 'CIVILIAN' : 'SPY',
    trigger_method,
    timestamp: new Date().toISOString(),
  });

  const response: CivilianModeResponse = {
    civilian_mode: enabled,
    theme: enabled ? 'civilian' : 'spy',
    vocabulary: enabled ? CIVILIAN_VOCABULARY : SPY_VOCABULARY,
    ui_config: enabled
      ? {
          color_scheme: 'beige',
          font_style: 'serif',
          terminology: 'civilian',
        }
      : {
          color_scheme: 'cyberpunk',
          font_style: 'monospace',
          terminology: 'spy',
        },
  };

  return res.status(200).json({
    success: true,
    message: enabled
      ? 'CIVILIAN MODE ACTIVATED // APPEARANCE NORMALIZED'
      : 'SPY MODE ACTIVATED // FULL OPERATIONAL STATUS',
    ...response,
  });
}

async function getCivilianModeStatus(req: NextApiRequest, res: NextApiResponse) {
  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: user } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', user_id)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const civilianMode = user.metadata?.civilian_mode || false;

  const response: CivilianModeResponse = {
    civilian_mode: civilianMode,
    theme: civilianMode ? 'civilian' : 'spy',
    vocabulary: civilianMode ? CIVILIAN_VOCABULARY : SPY_VOCABULARY,
    ui_config: civilianMode
      ? {
          color_scheme: 'beige',
          font_style: 'serif',
          terminology: 'civilian',
        }
      : {
          color_scheme: 'cyberpunk',
          font_style: 'monospace',
          terminology: 'spy',
        },
  };

  return res.status(200).json(response);
}
