import { useState, useRef, useEffect } from 'react';
import { useOps } from '@/contexts/OpsContext';
import { languageNames, type Language } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LanguageSelector() {
  const { language, setLanguage } = useOps();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
    
    // Vibrate on change (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-ops-night-surface/80 border border-ops-neon-green/30 hover:border-ops-neon-green/60 transition-all backdrop-blur-tactical font-tactical text-sm text-ops-neon-green uppercase tracking-wider"
        title={t.selectLanguage}
      >
        <span className="text-xl">🌐</span>
        <span className="hidden sm:inline text-base">{languageNames[language].split(' ')[0]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-ops-night-surface/95 border border-ops-neon-green/30 backdrop-blur-tactical z-50 shadow-neon-lg animate-slide-in max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-ops-neon-green/20">
            <div className="font-tactical text-sm text-ops-neon-cyan uppercase tracking-wider">
              {t.selectLanguage}
            </div>
          </div>
          <div className="p-1">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full text-left px-3 py-3 font-mono text-base transition-all ${
                  language === lang
                    ? 'bg-ops-neon-green/20 text-ops-neon-green border-l-2 border-ops-neon-green'
                    : 'text-ops-night-text hover:bg-ops-neon-green/10 hover:text-ops-neon-green'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{languageNames[lang]}</span>
                  {language === lang && (
                    <span className="text-ops-neon-green text-sm">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
