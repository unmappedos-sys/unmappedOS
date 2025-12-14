import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  calculateWeatherModifiers,
  getWeatherCached,
  getWeatherDescription,
  getWeatherIcon,
} from '@/lib/intel/weatherService';

const querySchema = z.object({
  lat: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= -90 && n <= 90, 'Invalid lat'),
  lon: z
    .string()
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= -180 && n <= 180, 'Invalid lon'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  const { lat, lon } = parsed.data;

  try {
    const weather = await getWeatherCached(lat, lon);
    if (!weather) {
      return res.status(503).json({ error: 'Weather unavailable' });
    }

    const modifiers = calculateWeatherModifiers(weather);

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=900, stale-while-revalidate=300');

    return res.status(200).json({
      weather: {
        ...weather,
        description: getWeatherDescription(weather.weather_code),
        icon: getWeatherIcon(weather.category),
      },
      modifiers: {
        walkability_modifier: modifiers.walkability_modifier,
        safety_modifier: modifiers.safety_modifier,
        warning: modifiers.warning,
        recommendation: modifiers.recommendation,
      },
    });
  } catch {
    return res.status(500).json({ error: 'Weather lookup failed' });
  }
}
