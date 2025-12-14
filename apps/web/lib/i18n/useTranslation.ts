import { useContext } from 'react';
import { OpsContext } from '@/contexts/OpsContext';
import { translations, type Language, type Translations } from './translations';

export function useTranslation() {
  const context = useContext(OpsContext);

  // Return default English translations if OpsProvider not available (SSR or error pages)
  if (!context) {
    return { t: translations['en'] as Translations, language: 'en' as Language };
  }

  const { language } = context;
  const t = translations[language] as Translations;

  return { t, language };
}

export function getTranslation(lang: Language, key: keyof Translations): string {
  return translations[lang][key];
}
