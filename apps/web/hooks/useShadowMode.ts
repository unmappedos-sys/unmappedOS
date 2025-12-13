/**
 * useShadowMode Hook
 * 
 * Manages shadow/privacy mode for the app.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isActionAllowedInShadowMode,
  isFeatureLocalOnly,
  generateAnonymousId,
  getShadowModeMessage,
} from '@/lib/shadowMode';

const SHADOW_MODE_KEY = 'unmapped_shadow_mode';
const ANON_ID_KEY = 'unmapped_anon_id';

interface UseShadowModeReturn {
  shadowModeEnabled: boolean;
  toggleShadowMode: () => void;
  enableShadowMode: () => void;
  disableShadowMode: () => void;
  canPerformAction: (action: string) => boolean;
  isLocalOnly: (feature: string) => boolean;
  anonymousId: string | null;
  statusMessage: string | null;
}

export function useShadowMode(): UseShadowModeReturn {
  const [shadowModeEnabled, setShadowModeEnabled] = useState<boolean>(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  // Load shadow mode state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SHADOW_MODE_KEY);
    if (stored === 'true') {
      setShadowModeEnabled(true);
      
      // Get or create anonymous ID
      let anonId = localStorage.getItem(ANON_ID_KEY);
      if (!anonId) {
        anonId = generateAnonymousId();
        localStorage.setItem(ANON_ID_KEY, anonId);
      }
      setAnonymousId(anonId);
    }
  }, []);

  const enableShadowMode = useCallback(() => {
    localStorage.setItem(SHADOW_MODE_KEY, 'true');
    
    let anonId = localStorage.getItem(ANON_ID_KEY);
    if (!anonId) {
      anonId = generateAnonymousId();
      localStorage.setItem(ANON_ID_KEY, anonId);
    }
    
    setShadowModeEnabled(true);
    setAnonymousId(anonId);
  }, []);

  const disableShadowMode = useCallback(() => {
    localStorage.setItem(SHADOW_MODE_KEY, 'false');
    setShadowModeEnabled(false);
    // Keep anonymous ID in case they re-enable
  }, []);

  const toggleShadowMode = useCallback(() => {
    if (shadowModeEnabled) {
      disableShadowMode();
    } else {
      enableShadowMode();
    }
  }, [shadowModeEnabled, enableShadowMode, disableShadowMode]);

  const canPerformAction = useCallback(
    (action: string): boolean => {
      if (!shadowModeEnabled) return true;
      return isActionAllowedInShadowMode(action);
    },
    [shadowModeEnabled]
  );

  const isLocalOnly = useCallback((feature: string): boolean => {
    return isFeatureLocalOnly(feature);
  }, []);

  return {
    shadowModeEnabled,
    toggleShadowMode,
    enableShadowMode,
    disableShadowMode,
    canPerformAction,
    isLocalOnly,
    anonymousId,
    statusMessage: shadowModeEnabled ? getShadowModeMessage() : null,
  };
}
