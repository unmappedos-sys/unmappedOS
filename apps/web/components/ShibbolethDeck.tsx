/**
 * ShibbolethDeck Component
 * 
 * Tactical audio cards for high-stress travel moments.
 * Touch a card → hear the phrase in local language.
 */

import React, { useState } from 'react';
import { useShibbolethDeck } from '../hooks/useShibbolethDeck';
import { CardType, LanguageCode, LANGUAGE_NAMES } from '../lib/shibbolethDeck';

interface ShibbolethDeckProps {
  city?: string;
  defaultLanguage?: LanguageCode;
  onClose?: () => void;
}

export function ShibbolethDeck({ city, defaultLanguage, onClose }: ShibbolethDeckProps) {
  const {
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
  } = useShibbolethDeck(city, defaultLanguage);

  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const languages: LanguageCode[] = ['th', 'ja', 'vi', 'id', 'ko', 'zh', 'es', 'pt'];

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🗣️</span>
          <div>
            <h2 className="text-white font-bold">SHIBBOLETH DECK</h2>
            <p className="text-gray-500 text-xs">Tactical Phrases</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
            className="px-3 py-1 bg-gray-800 rounded text-white text-sm"
          >
            {LANGUAGE_NAMES[language]}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Language selector */}
      {showLanguageSelector && (
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex flex-wrap gap-2">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setShowLanguageSelector(false);
              }}
              className={`px-3 py-1 rounded text-sm ${
                language === lang
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {LANGUAGE_NAMES[lang]}
            </button>
          ))}
        </div>
      )}

      {/* Card Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {availableCards.map((card) => {
            const meta = getCardMeta(card);
            const isSelected = currentCard === card;
            
            return (
              <button
                key={card}
                onClick={() => selectCard(card)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-emerald-500 bg-emerald-950/50'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                  }
                `}
              >
                <div className="text-4xl mb-2">{meta.emoji}</div>
                <div className="text-white font-bold text-sm">THE {card.toUpperCase()}</div>
                <div className="text-gray-500 text-xs mt-1">{meta.tone}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Phrase Display */}
      {currentPhrase && (
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="mb-3">
            <div className="text-emerald-400 text-2xl font-bold mb-1">
              {currentPhrase.text}
            </div>
            <div className="text-gray-400 text-sm">
              /{currentPhrase.phonetic}/
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {currentCard && getCardMeta(currentCard).tone}
            </div>
          </div>

          <button
            onClick={isSpeaking ? stopSpeech : speak}
            className={`
              w-full py-4 rounded-lg font-bold text-lg transition-all
              ${isSpeaking
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }
            `}
          >
            {isSpeaking ? '◼ STOP' : '▶ SPEAK'}
          </button>

          <p className="text-center text-gray-600 text-xs mt-2">
            Tap to play audio • Show screen if needed
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Shibboleth Card for quick access
 */
interface QuickCardProps {
  card: CardType;
  language: LanguageCode;
  onPress?: () => void;
}

export function QuickShibbolethCard({ card, language, onPress }: QuickCardProps) {
  const { speak, isSpeaking, selectCard } = useShibbolethDeck(undefined, language);

  const meta = {
    stop: { emoji: '✋', color: 'red' },
    price: { emoji: '💰', color: 'yellow' },
    peace: { emoji: '🙏', color: 'green' },
    help: { emoji: '🆘', color: 'orange' },
    police: { emoji: '👮', color: 'blue' },
    medical: { emoji: '🏥', color: 'red' },
  }[card];

  const handlePress = async () => {
    onPress?.();
    selectCard(card);
    await speak();
  };

  return (
    <button
      onClick={handlePress}
      disabled={isSpeaking}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center
        text-2xl shadow-lg transition-transform
        ${isSpeaking ? 'scale-110 animate-pulse' : 'hover:scale-105'}
        ${meta.color === 'red' ? 'bg-red-600' : ''}
        ${meta.color === 'yellow' ? 'bg-yellow-600' : ''}
        ${meta.color === 'green' ? 'bg-emerald-600' : ''}
        ${meta.color === 'orange' ? 'bg-orange-600' : ''}
        ${meta.color === 'blue' ? 'bg-blue-600' : ''}
      `}
    >
      {meta.emoji}
    </button>
  );
}

export default ShibbolethDeck;
