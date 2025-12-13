import { useContext } from 'react';
import { OpsContext } from '@/contexts/OpsContext';
import { translations, type Language, type Translations } from './translations';

export function useTranslation() {
  const context = useContext(OpsContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within OpsProvider');
  }

  const { language } = context;
  const t = translations[language] as Translations;

  return { t, language };
}

export function getTranslation(lang: Language, key: keyof Translations): string {
  return translations[lang][key];
}
