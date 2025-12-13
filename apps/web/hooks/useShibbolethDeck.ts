/**
 * React hook for Shibboleth Deck - tactical audio cards
 * 
 * Provides quick-access phrase cards for high-stress travel moments.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  CardType,
  LanguageCode,
  Phrase,
  ShibbolethCardConfig,
  getPhrase,
  speakPhrase,
  stopSpeaking,
  getPhrasesForCity,
  getAllCardTypes,
  CARD_METADATA,
} from '../lib/shibbolethDeck';

interface UseShibbolethDeckReturn {
  currentCard: CardType | null;
  currentPhrase: Phrase | null;
  language: LanguageCode;
  isSpeaking: boolean;
  availableCards: readonly CardType[];
  selectCard: (card: CardType) => void;
  setLanguage: (lang: LanguageCode) => void;
  speak: () => Promise<void>;
  stopSpeech: () => void;
  getCardMeta: (card: CardType) => { emoji: string; tone: string };
}

export function useShibbolethDeck(
  city?: string,
  defaultLanguage?: LanguageCode
): UseShibbolethDeckReturn {
  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(defaultLanguage || 'th');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get available cards
  const availableCards = useMemo(() => getAllCardTypes(), []);

  // Get current phrase based on card and language
  const currentPhrase = useMemo(() => {
    if (!currentCard) return null;
    return getPhrase(currentCard, language);
  }, [currentCard, language]);

  // Auto-set language based on city
  useMemo(() => {
    if (city && !defaultLanguage) {
      const cityPhrases = getPhrasesForCity(city);
      if (cityPhrases.length > 0) {
        // Extract language from first phrase
        const phrase = cityPhrases[0];
        if (phrase) {
          setLanguage(phrase.language);
        }
      }
    }
  }, [city, defaultLanguage]);

  // Select a card
  const selectCard = useCallback((card: CardType) => {
    setCurrentCard(card);
  }, []);

  // Speak the current phrase
  const speak = useCallback(async () => {
    if (!currentPhrase) return;

    setIsSpeaking(true);
    try {
      await speakPhrase(currentPhrase);
    } finally {
      setIsSpeaking(false);
    }
  }, [currentPhrase]);

  // Stop speaking
  const stopSpeech = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Get card metadata
  const getCardMeta = useCallback((card: CardType): { emoji: string; tone: string } => {
    const meta = CARD_METADATA[card];
    return { emoji: meta.icon, tone: meta.tone };
  }, []);

  return {
    currentCard,
    currentPhrase,
    language,
    isSpeaking,
    availableCards,
    selectCard,
    setLanguage,
    speak,
    stopSpeech,
    getCardMeta,
  };
}

/**
 * Hook for quick phrase access by card type
 */
export function useQuickPhrase(
  card: CardType,
  language: LanguageCode
): {
  phrase: Phrase | null;
  speak: () => Promise<void>;
  isSpeaking: boolean;
} {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const phrase = useMemo(() => getPhrase(card, language), [card, language]);

  const speak = useCallback(async () => {
    if (!phrase) return;

    setIsSpeaking(true);
    try {
      await speakPhrase(phrase);
    } finally {
      setIsSpeaking(false);
    }
  }, [phrase]);

  return { phrase, speak, isSpeaking };
}
