/**
 * Shibboleth Deck - Tactical Audio Cards
 * 
 * Pre-recorded native speaker phrases for high-stress situations.
 * No conjugation, no translation - just instant "Local Voice" authority.
 * 
 * 6 cards for critical moments:
 * - THE STOP: "Please stop the car here." (Firm)
 * - THE PRICE: "That is too expensive." (Dismissive)  
 * - THE PEACE: "No thank you, I'm walking." (Polite but final)
 * - THE HELP: "I need help." (Urgent)
 * - THE POLICE: "Call the police." (Authoritative)
 * - THE MEDICAL: "I need a doctor." (Emergency)
 */

export type ShibbolethCard = 
  | 'stop'
  | 'price'
  | 'peace'
  | 'help'
  | 'police'
  | 'medical';

// Type aliases for hooks/components
export type CardType = ShibbolethCard;

export type SupportedLanguage = 
  | 'th'  // Thai
  | 'ja'  // Japanese
  | 'vi'  // Vietnamese
  | 'id'  // Indonesian
  | 'ko'  // Korean
  | 'zh'  // Mandarin
  | 'es'  // Spanish
  | 'pt'  // Portuguese
  | 'en'; // English (fallback)

// Type alias for hooks/components
export type LanguageCode = SupportedLanguage;

export interface ShibbolethPhrase {
  card: ShibbolethCard;
  language: SupportedLanguage;
  text: string;
  phrase: string; // Alias for text for backward compatibility
  phonetic: string;
  english: string; // English translation
  tone: 'firm' | 'dismissive' | 'polite' | 'urgent' | 'authoritative' | 'emergency';
  audioUrl?: string; // Pre-recorded native speaker
}

// Type alias for hooks/components
export type Phrase = ShibbolethPhrase;

export interface ShibbolethCardConfig {
  card: ShibbolethCard;
  icon: string;
  emoji: string; // Alias for icon for backward compatibility
  label: string;
  tone: string;
  color: string;
  description: string;
}

// Card configurations
export const CARD_CONFIGS: Record<ShibbolethCard, ShibbolethCardConfig> = {
  stop: {
    card: 'stop',
    icon: '✋',
    emoji: '✋',
    label: 'THE STOP',
    tone: 'firm',
    color: '#ef4444',
    description: 'Stop the vehicle here',
  },
  price: {
    card: 'price',
    icon: '💰',
    emoji: '💰',
    label: 'THE PRICE',
    tone: 'dismissive',
    color: '#f59e0b',
    description: 'That price is too high',
  },
  peace: {
    card: 'peace',
    icon: '✋',
    emoji: '✋',
    label: 'THE PEACE',
    tone: 'polite',
    color: '#10b981',
    description: 'No thank you, goodbye',
  },
  help: {
    card: 'help',
    icon: '🆘',
    emoji: '🆘',
    label: 'THE HELP',
    tone: 'urgent',
    color: '#8b5cf6',
    description: 'I need assistance',
  },
  police: {
    card: 'police',
    icon: '👮',
    emoji: '👮',
    label: 'THE POLICE',
    tone: 'authoritative',
    color: '#3b82f6',
    description: 'Call the authorities',
  },
  medical: {
    card: 'medical',
    icon: '🏥',
    emoji: '🏥',
    label: 'THE MEDICAL',
    tone: 'emergency',
    color: '#dc2626',
    description: 'Medical emergency',
  },
};

// Phrase database (expandable per city)
const PHRASE_DATABASE: ShibbolethPhrase[] = [
  // THAI (Bangkok)
  {
    card: 'stop',
    language: 'th',
    text: 'หยุด',
    phrase: 'หยุด',
    phonetic: 'Yùt',
    english: 'Stop / No',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'th',
    text: 'แพงไป',
    phrase: 'แพงไป',
    phonetic: 'Phaeng bpai',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'th',
    text: 'ไม่เอาครับ/ค่ะ ขอบคุณ',
    phrase: 'ไม่เอาครับ/ค่ะ ขอบคุณ',
    phonetic: 'Mâi ao kráp/kâ, khàwp khun',
    english: 'No thank you',
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'th',
    text: 'ช่วยด้วย',
    phrase: 'ช่วยด้วย',
    phonetic: 'Chûuay dûuay',
    english: 'Help',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'th',
    text: 'เรียกตำรวจ',
    phrase: 'เรียกตำรวจ',
    phonetic: 'Rîiak dtam-rùuat',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'th',
    text: 'ต้องการหมอ',
    phrase: 'ต้องการหมอ',
    phonetic: 'Dtông gaan mǎw',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // JAPANESE (Tokyo)
  {
    card: 'stop',
    language: 'ja',
    text: 'ここで止まってください',
    phrase: 'ここで止まってください',
    phonetic: 'Koko de tomatte kudasai',
    english: 'Please stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'ja',
    text: '高すぎます',
    phrase: '高すぎます',
    phonetic: 'Takasugimasu',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'ja',
    text: '大丈夫です',
    phrase: '大丈夫です',
    phonetic: 'Daijōbu desu',
    english: "It's okay / I'm fine",
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'ja',
    text: '助けてください',
    phrase: '助けてください',
    phonetic: 'Tasukete kudasai',
    english: 'Please help',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'ja',
    text: '警察を呼んでください',
    phrase: '警察を呼んでください',
    phonetic: 'Keisatsu wo yonde kudasai',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'ja',
    text: '医者が必要です',
    phrase: '医者が必要です',
    phonetic: 'Isha ga hitsuyō desu',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // VIETNAMESE (Ho Chi Minh)
  {
    card: 'stop',
    language: 'vi',
    text: 'Dừng ở đây',
    phrase: 'Dừng ở đây',
    phonetic: 'Zừng ở đây',
    english: 'Stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'vi',
    text: 'Đắt quá',
    phrase: 'Đắt quá',
    phonetic: 'Đắt quá',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'vi',
    text: 'Không, cảm ơn',
    phrase: 'Không, cảm ơn',
    phonetic: 'Không, cảm ơn',
    english: 'No thank you',
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'vi',
    text: 'Giúp tôi với',
    phrase: 'Giúp tôi với',
    phonetic: 'Zúp tôi với',
    english: 'Help me please',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'vi',
    text: 'Gọi công an',
    phrase: 'Gọi công an',
    phonetic: 'Gọi công an',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'vi',
    text: 'Tôi cần bác sĩ',
    phrase: 'Tôi cần bác sĩ',
    phonetic: 'Tôi cần bác sĩ',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // KOREAN (Seoul)
  {
    card: 'stop',
    language: 'ko',
    text: '여기서 세워주세요',
    phrase: '여기서 세워주세요',
    phonetic: 'Yeogiseo sewo juseyo',
    english: 'Please stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'ko',
    text: '너무 비싸요',
    phrase: '너무 비싸요',
    phonetic: 'Neomu bissayo',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'ko',
    text: '괜찮아요, 감사합니다',
    phrase: '괜찮아요, 감사합니다',
    phonetic: 'Gwaenchanayo, gamsahamnida',
    english: "I'm fine, thank you",
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'ko',
    text: '도와주세요',
    phrase: '도와주세요',
    phonetic: 'Dowajuseyo',
    english: 'Please help me',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'ko',
    text: '경찰을 불러주세요',
    phrase: '경찰을 불러주세요',
    phonetic: 'Gyeongchal-eul bulleojuseyo',
    english: 'Please call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'ko',
    text: '의사가 필요해요',
    phrase: '의사가 필요해요',
    phonetic: 'Uisaga pilyohaeyo',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // MANDARIN (Taipei/Shanghai)
  {
    card: 'stop',
    language: 'zh',
    text: '请在这里停车',
    phrase: '请在这里停车',
    phonetic: 'Qǐng zài zhèlǐ tíng chē',
    english: 'Please stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'zh',
    text: '太贵了',
    phrase: '太贵了',
    phonetic: 'Tài guì le',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'zh',
    text: '不用了，谢谢',
    phrase: '不用了，谢谢',
    phonetic: 'Bù yòng le, xièxiè',
    english: 'No need, thank you',
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'zh',
    text: '请帮帮我',
    phrase: '请帮帮我',
    phonetic: 'Qǐng bāng bāng wǒ',
    english: 'Please help me',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'zh',
    text: '叫警察',
    phrase: '叫警察',
    phonetic: 'Jiào jǐngchá',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'zh',
    text: '我需要医生',
    phrase: '我需要医生',
    phonetic: 'Wǒ xūyào yīshēng',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // SPANISH (Mexico City/Barcelona)
  {
    card: 'stop',
    language: 'es',
    text: 'Pare aquí, por favor',
    phrase: 'Pare aquí, por favor',
    phonetic: 'Pah-reh ah-kee, por fah-vor',
    english: 'Stop here, please',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'es',
    text: 'Es muy caro',
    phrase: 'Es muy caro',
    phonetic: 'Es mooy kah-ro',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'es',
    text: 'No gracias, estoy bien',
    phrase: 'No gracias, estoy bien',
    phonetic: 'No grah-see-as, es-toy byen',
    english: "No thanks, I'm fine",
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'es',
    text: 'Ayúdeme por favor',
    phrase: 'Ayúdeme por favor',
    phonetic: 'Ah-yoo-deh-meh por fah-vor',
    english: 'Help me please',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'es',
    text: 'Llame a la policía',
    phrase: 'Llame a la policía',
    phonetic: 'Yah-meh ah lah po-lee-see-ah',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'es',
    text: 'Necesito un médico',
    phrase: 'Necesito un médico',
    phonetic: 'Neh-seh-see-toh oon meh-dee-koh',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // INDONESIAN (Bali/Jakarta)
  {
    card: 'stop',
    language: 'id',
    text: 'Tolong berhenti di sini',
    phrase: 'Tolong berhenti di sini',
    phonetic: 'Toh-long ber-hen-tee dee see-nee',
    english: 'Please stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'id',
    text: 'Terlalu mahal',
    phrase: 'Terlalu mahal',
    phonetic: 'Ter-lah-loo mah-hal',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'id',
    text: 'Tidak, terima kasih',
    phrase: 'Tidak, terima kasih',
    phonetic: 'Tee-dak, teh-ree-mah kah-see',
    english: 'No, thank you',
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'id',
    text: 'Tolong bantu saya',
    phrase: 'Tolong bantu saya',
    phonetic: 'Toh-long ban-too sah-yah',
    english: 'Please help me',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'id',
    text: 'Panggil polisi',
    phrase: 'Panggil polisi',
    phonetic: 'Pang-gil po-lee-see',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'id',
    text: 'Saya perlu dokter',
    phrase: 'Saya perlu dokter',
    phonetic: 'Sah-yah per-loo dok-ter',
    english: 'I need a doctor',
    tone: 'emergency',
  },

  // PORTUGUESE (Brazil/Portugal)
  {
    card: 'stop',
    language: 'pt',
    text: 'Pare aqui, por favor',
    phrase: 'Pare aqui, por favor',
    phonetic: 'Pah-reh ah-kee, por fah-vor',
    english: 'Please stop here',
    tone: 'firm',
  },
  {
    card: 'price',
    language: 'pt',
    text: 'Muito caro',
    phrase: 'Muito caro',
    phonetic: 'Moo-ee-too kah-roo',
    english: 'Too expensive',
    tone: 'dismissive',
  },
  {
    card: 'peace',
    language: 'pt',
    text: 'Não, obrigado',
    phrase: 'Não, obrigado',
    phonetic: 'Now, oh-bree-gah-doo',
    english: 'No, thank you',
    tone: 'polite',
  },
  {
    card: 'help',
    language: 'pt',
    text: 'Ajuda',
    phrase: 'Ajuda',
    phonetic: 'Ah-zhoo-dah',
    english: 'Help',
    tone: 'urgent',
  },
  {
    card: 'police',
    language: 'pt',
    text: 'Chame a polícia',
    phrase: 'Chame a polícia',
    phonetic: 'Shah-meh ah poh-lee-see-ah',
    english: 'Call the police',
    tone: 'authoritative',
  },
  {
    card: 'medical',
    language: 'pt',
    text: 'Preciso de um médico',
    phrase: 'Preciso de um médico',
    phonetic: 'Preh-see-zoo deh oom meh-dee-koo',
    english: 'I need a doctor',
    tone: 'emergency',
  },
];

// City to language mapping
const CITY_LANGUAGES: Record<string, SupportedLanguage> = {
  bangkok: 'th',
  tokyo: 'ja',
  osaka: 'ja',
  kyoto: 'ja',
  hochiminh: 'vi',
  hanoi: 'vi',
  seoul: 'ko',
  busan: 'ko',
  taipei: 'zh',
  shanghai: 'zh',
  beijing: 'zh',
  hongkong: 'zh',
  mexicocity: 'es',
  barcelona: 'es',
  madrid: 'es',
  bali: 'id',
  jakarta: 'id',
};

/**
 * Get phrases for a specific city
 */
export function getPhrasesForCity(city: string): ShibbolethPhrase[] {
  const language = CITY_LANGUAGES[city.toLowerCase()] || 'en';
  return PHRASE_DATABASE.filter((p) => p.language === language);
}

/**
 * Get a specific phrase by card type and language/city
 * @param card - Card type (stop, price, peace, help, police, medical)
 * @param langOrCity - Language code (th, ja, vi, etc.) or city name (bangkok, tokyo, etc.)
 */
export function getPhrase(card: ShibbolethCard, langOrCity: string): ShibbolethPhrase | null {
  // Check if it's a language code directly
  const isLanguageCode = ['th', 'ja', 'vi', 'id', 'ko', 'zh', 'es', 'pt', 'en'].includes(langOrCity.toLowerCase());
  const language = isLanguageCode 
    ? langOrCity.toLowerCase() as SupportedLanguage 
    : (CITY_LANGUAGES[langOrCity.toLowerCase()] || 'en');
  
  const phrase = PHRASE_DATABASE.find((p) => p.card === card && p.language === language);
  
  if (!phrase) return null;
  
  // Return with both text and phrase (alias) properties
  return {
    ...phrase,
    phrase: phrase.phrase || phrase.text, // Ensure phrase property exists
    english: phrase.english || CARD_CONFIGS[card]?.description || '', // Fallback to card description
  };
}

/**
 * Get all card types (for iteration/validation)
 */
export function getAllCards(): ShibbolethCard[] {
  return Object.keys(CARD_CONFIGS) as ShibbolethCard[];
}

/**
 * Alias for getAllCards
 */
export function getAllCardTypes(): ShibbolethCard[] {
  return getAllCards();
}

/**
 * Get all card configs (full config objects)
 */
export function getAllCardConfigs(): ShibbolethCardConfig[] {
  return Object.values(CARD_CONFIGS);
}

/**
 * Play phrase using Web Speech API (fallback when no audio file)
 */
export async function speakPhrase(phrase: ShibbolethPhrase): Promise<void> {
  return new Promise((resolve, reject) => {
    // If we have a pre-recorded audio file, use that
    if (phrase.audioUrl) {
      const audio = new Audio(phrase.audioUrl);
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Audio playback failed'));
      audio.play();
      return;
    }

    // Fallback to Web Speech API
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(phrase.text);
    
    // Map language to speech synthesis language code
    const langMap: Record<SupportedLanguage, string> = {
      th: 'th-TH',
      ja: 'ja-JP',
      vi: 'vi-VN',
      id: 'id-ID',
      ko: 'ko-KR',
      zh: 'zh-CN',
      es: 'es-ES',
      pt: 'pt-BR',
      en: 'en-US',
    };

    utterance.lang = langMap[phrase.language] || 'en-US';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Adjust rate based on tone
    switch (phrase.tone) {
      case 'firm':
        utterance.rate = 0.85;
        break;
      case 'dismissive':
        utterance.rate = 1.1;
        break;
      case 'polite':
        utterance.rate = 0.9;
        break;
      case 'urgent':
        utterance.rate = 1.2;
        utterance.pitch = 1.1;
        break;
      case 'authoritative':
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        break;
      case 'emergency':
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        break;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Get emergency cards (for crisis mode)
 */
export function getEmergencyCards(): ShibbolethCard[] {
  return ['help', 'police', 'medical'];
}

/**
 * Get supported cities list
 */
export function getSupportedCities(): string[] {
  return Object.keys(CITY_LANGUAGES);
}

/**
 * Check if city is supported
 */
export function isCitySupported(city: string): boolean {
  return city.toLowerCase() in CITY_LANGUAGES;
}
/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  th: 'Thai',
  ja: 'Japanese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ko: 'Korean',
  zh: 'Mandarin',
  es: 'Spanish',
  pt: 'Portuguese',
  en: 'English',
};

/**
 * Card metadata alias for hooks/components
 */
export const CARD_METADATA = CARD_CONFIGS;