/**
 * FEEDBACK PROMPT — Did this recommendation help?
 *
 * Appears 20-45 minutes after recommendation.
 * Two buttons. No friction.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackPromptProps {
  visible: boolean;
  onYes: () => void;
  onNo: () => void;
}

export default function FeedbackPrompt({ visible, onYes, onNo }: FeedbackPromptProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-24 left-4 right-4 z-30 bg-white rounded-2xl shadow-lg border border-stone-100 p-5"
        >
          <p className="text-stone-700 text-center mb-4 font-medium">
            Did this recommendation help?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onYes}
              className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
            >
              Yes
            </button>
            <button
              onClick={onNo}
              className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-medium active:scale-[0.98] transition-transform"
            >
              Not really
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
