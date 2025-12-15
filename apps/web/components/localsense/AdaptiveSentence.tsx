/**
 * LOCAL SENSE - Adaptive Sentence
 *
 * One sentence at the top. Human language.
 * Updates with time, movement, and intel.
 * Never a dashboard. Never numbers.
 */

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdaptiveSentence as SentenceType } from './types';

interface AdaptiveSentenceProps {
  sentence: SentenceType | null;
  isOffline?: boolean;
  className?: string;
}

function AdaptiveSentence({ sentence, isOffline = false, className = '' }: AdaptiveSentenceProps) {
  const [displayText, setDisplayText] = useState<string>('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (isOffline) {
      setDisplayText('Offline — using local memory.');
      setKey((k) => k + 1);
      return;
    }

    if (sentence?.text) {
      setDisplayText(sentence.text);
      setKey((k) => k + 1);
    }
  }, [sentence?.text, isOffline]);

  if (!displayText) return null;

  // Softer text for low confidence
  const opacity = sentence?.confidence === 'low' ? 0.7 : 0.9;

  return (
    <div className={`pointer-events-none ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="px-6 py-4"
        >
          <p
            className="text-center text-stone-600 text-base font-light leading-relaxed"
            style={{ opacity }}
          >
            {displayText}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default memo(AdaptiveSentence);
