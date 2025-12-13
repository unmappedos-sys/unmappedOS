/**
 * API: Fingerprint - Update Texture Fingerprint
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { 
  updateTextureFingerprint, 
  getZoneRecommendations,
  TextureType,
  TimePeriod 
} from '@/lib/textureFingerprint';
import { createServiceClient } from '@/lib/supabaseService';
import { createLogger } from '@/lib/logger';

const logger = createLogger({ service: 'api-fingerprint' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const serviceClient = createServiceClient();

  if (req.method === 'GET') {
    // Get fingerprint and recommendations
    try {
      const { city } = req.query;

      const { data: user } = await serviceClient
        .from('users')
        .select('fingerprint')
        .eq('id', userId)
        .single();

      let recommendations: any[] = [];
      if (city && typeof city === 'string') {
        recommendations = await getZoneRecommendations(userId, city, 5);
      }

      const userData = user as { fingerprint: any } | null;
      return res.status(200).json({
        fingerprint: userData?.fingerprint || null,
        recommendations,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get fingerprint');
      return res.status(500).json({ error: 'Failed to get fingerprint' });
    }
  }

  if (req.method === 'POST') {
    // Update fingerprint based on activity
    try {
      const { texture_type, time_of_day, weight } = req.body;

      if (!texture_type) {
        return res.status(400).json({ error: 'texture_type required' });
      }

      // Validate texture type
      const validTextures: TextureType[] = [
        'market', 'nightlife', 'temple', 'park', 'transit',
        'residential', 'commercial', 'historic', 'waterfront', 'food_street'
      ];

      if (!validTextures.includes(texture_type)) {
        return res.status(400).json({ error: 'Invalid texture_type' });
      }

      // Determine time period if not provided
      let timePeriod: TimePeriod = time_of_day;
      if (!timePeriod) {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) timePeriod = 'morning';
        else if (hour >= 12 && hour < 17) timePeriod = 'afternoon';
        else if (hour >= 17 && hour < 21) timePeriod = 'evening';
        else timePeriod = 'night';
      }

      await updateTextureFingerprint(
        userId,
        texture_type as TextureType,
        timePeriod,
        weight || 1.0
      );

      logger.info({
        event: 'fingerprint_updated',
        userId,
        texture_type,
        time_of_day: timePeriod,
      });

      return res.status(200).json({ 
        success: true,
        texture_type,
        time_of_day: timePeriod,
      });
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update fingerprint');
      return res.status(500).json({ error: 'Failed to update fingerprint' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
