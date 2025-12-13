import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Language } from '@/lib/i18n/translations';
import type { ShadowCopyConfig } from '@unmapped/lib';

interface OpsContextType {
  // Ghost Mode: Reduces screen glow, disables pulsing animations, simplifies color palette
  ghostMode: boolean;
  toggleGhostMode: () => void;
  
  // HUD Collapsed: Minimizes all HUD panels to maximize map area
  hudCollapsed: boolean;
  toggleHudCollapsed: () => void;
  
  // Day Ops: High-contrast blueprint theme for daylight operations
  dayOps: boolean;
  toggleDayOps: () => void;
  
  // Language: User's selected interface language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Shadow Copy Mode: Read-only mode with no write operations
  shadowCopy: ShadowCopyConfig;
  toggleShadowCopy: () => void;
}

const OpsContext = createContext<OpsContextType | undefined>(undefined);

export function OpsProvider({ children }: { children: ReactNode }) {
  const [ghostMode, setGhostMode] = useState(false);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [dayOps, setDayOps] = useState(false);
  const [language, setLanguageState] = useState<Language>('en');
  const [shadowCopy, setShadowCopy] = useState<ShadowCopyConfig>({
    enabled: false,
    block_writes: false,
    anonymize_all: false,
  });

  // Persist ghost mode preference
  useEffect(() => {
    const saved = localStorage.getItem('unmappedos_ghost_mode');
    if (saved === 'true') {
      setGhostMode(true);
    }
  }, []);

  // Load language preference
  useEffect(() => {
    const savedLang = localStorage.getItem('unmappedos_language');
    const supportedLangs = ['en', 'th', 'ja', 'es', 'zh', 'fr', 'de', 'ko', 'pt', 'ru', 'ar', 'hi', 'it', 'nl', 'tr', 'vi', 'id', 'pl'];
    
    if (savedLang && supportedLangs.includes(savedLang)) {
      setLanguageState(savedLang as Language);
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (supportedLangs.includes(browserLang)) {
        setLanguageState(browserLang as Language);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('unmappedos_ghost_mode', ghostMode.toString());
    
    // Apply ghost mode class to document for global styling
    if (ghostMode) {
      document.documentElement.classList.add('ghost-mode');
    } else {
      document.documentElement.classList.remove('ghost-mode');
    }
  }, [ghostMode]);

  // Apply day ops class
  useEffect(() => {
    if (dayOps) {
      document.documentElement.classList.add('day-ops');
    } else {
      document.documentElement.classList.remove('day-ops');
    }
  }, [dayOps]);

  const toggleGhostMode = () => {
    setGhostMode(prev => !prev);
  };

  const toggleHudCollapsed = () => {
    setHudCollapsed(prev => !prev);
  };

  const toggleDayOps = () => {
    setDayOps(prev => !prev);
  };

  const toggleShadowCopy = () => {
    setShadowCopy(prev => ({
      enabled: !prev.enabled,
      block_writes: !prev.enabled,
      anonymize_all: !prev.enabled,
    }));
  };

  // Load Shadow Copy preference
  useEffect(() => {
    const saved = localStorage.getItem('unmappedos_shadow_copy');
    if (saved === 'true') {
      setShadowCopy({
        enabled: true,
        block_writes: true,
        anonymize_all: true,
      });
    }
  }, []);

  // Persist Shadow Copy preference
  useEffect(() => {
    localStorage.setItem('unmappedos_shadow_copy', shadowCopy.enabled.toString());
  }, [shadowCopy]);
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('unmappedos_language', lang);
  };

  return (
    <OpsContext.Provider
      value={{
        ghostMode,
        toggleGhostMode,
        hudCollapsed,
        toggleHudCollapsed,
        dayOps,
        toggleDayOps,
        language,
        setLanguage,
        shadowCopy,
        toggleShadowCopy,
      }}
    >
      {children}
    </OpsContext.Provider>
  );
}

export function useOps() {
  const context = useContext(OpsContext);
  if (context === undefined) {
    throw new Error('useOps must be used within OpsProvider');
  }
  return context;
}

export { OpsContext };
