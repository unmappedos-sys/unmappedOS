/**
 * useTextureSystem Hook
 * 
 * Manages dynamic texture shifts based on context.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TextureType,
  DynamicTexture,
  calculateTextureShift,
  getTextureUIConfig,
  shouldAlertTextureShift,
} from '@/lib/textureSystem';

interface UseTextureSystemOptions {
  baseTexture: TextureType;
  zoneId: string;
  city: string;
  enableAutoUpdate?: boolean;
  updateInterval?: number; // ms
}

interface UseTextureSystemReturn {
  currentTexture: DynamicTexture;
  uiConfig: ReturnType<typeof getTextureUIConfig>;
  updateTexture: () => Promise<void>;
  isShifting: boolean;
}

export function useTextureSystem(
  options: UseTextureSystemOptions
): UseTextureSystemReturn {
  const {
    baseTexture,
    zoneId,
    city,
    enableAutoUpdate = true,
    updateInterval = 60000, // 1 minute
  } = options;

  const [currentTexture, setCurrentTexture] = useState<DynamicTexture>(() =>
    calculateInitialTexture(baseTexture)
  );
  const [isShifting, setIsShifting] = useState(false);

  const updateTexture = useCallback(async () => {
    setIsShifting(true);

    try {
      // Get current context
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      // Optional: Fetch recent reports count
      let recentReports = 0;
      try {
        const response = await fetch(
          `/api/zones/${zoneId}/reports/count?hours=24`
        );
        if (response.ok) {
          const data = await response.json();
          recentReports = data.count || 0;
        }
      } catch {
        // Fallback to no reports
      }

      // Calculate new texture
      const newTexture = calculateTextureShift(baseTexture, {
        hour,
        dayOfWeek,
        recentReports,
        // Optional: Add weather, crowd density from external APIs
      });

      // Check for significant shift
      if (newTexture.current_texture !== currentTexture.current_texture) {
        const shiftAlert = shouldAlertTextureShift(
          currentTexture.current_texture,
          newTexture.current_texture
        );

        if (shiftAlert.alert) {
          console.log('[TEXTURE SHIFT]', shiftAlert.message);
          // Optional: Show user notification
        }
      }

      setCurrentTexture(newTexture);
    } catch (error) {
      console.error('[TEXTURE] Update failed:', error);
    } finally {
      setIsShifting(false);
    }
  }, [baseTexture, zoneId, currentTexture.current_texture]);

  // Auto-update texture
  useEffect(() => {
    if (!enableAutoUpdate) return;

    updateTexture();
    const interval = setInterval(updateTexture, updateInterval);

    return () => clearInterval(interval);
  }, [enableAutoUpdate, updateInterval, updateTexture]);

  const uiConfig = getTextureUIConfig(currentTexture.current_texture);

  return {
    currentTexture,
    uiConfig,
    updateTexture,
    isShifting,
  };
}

function calculateInitialTexture(baseTexture: TextureType): DynamicTexture {
  const now = new Date();
  return calculateTextureShift(baseTexture, {
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
  });
}
