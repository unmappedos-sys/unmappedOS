/**
 * LOCAL SENSE - Help Button & Panel
 *
 * Persistent, calm help button.
 * Opens essential safety info without drama.
 */

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HelpInfo } from './types';

interface HelpButtonProps {
  info: HelpInfo;
  className?: string;
}

function HelpButton({ info, className = '' }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <>
      {/* Help Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`bg-white/90 backdrop-blur-sm text-stone-600 px-5 py-2.5
                   rounded-full shadow-lg shadow-stone-200/50 border border-stone-100
                   text-sm font-medium hover:bg-white active:bg-stone-50
                   transition-colors ${className}`}
        whileTap={{ scale: 0.97 }}
      >
        Help
      </motion.button>

      {/* Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl
                         shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Handle */}
                <div className="flex justify-center">
                  <div className="w-12 h-1 bg-stone-200 rounded-full" />
                </div>

                {/* Emergency Contacts */}
                <div className="space-y-3">
                  <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                    Emergency
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleCall(info.police)}
                      className="bg-stone-100 hover:bg-stone-200 active:bg-stone-300
                                 rounded-xl p-4 text-left transition-colors"
                    >
                      <div className="text-stone-500 text-xs mb-1">Police</div>
                      <div className="text-stone-800 text-lg font-medium">{info.police}</div>
                    </button>

                    <button
                      onClick={() => handleCall(info.ambulance)}
                      className="bg-stone-100 hover:bg-stone-200 active:bg-stone-300
                                 rounded-xl p-4 text-left transition-colors"
                    >
                      <div className="text-stone-500 text-xs mb-1">Ambulance</div>
                      <div className="text-stone-800 text-lg font-medium">{info.ambulance}</div>
                    </button>
                  </div>

                  {info.hospital && (
                    <div className="bg-stone-50 rounded-xl p-4">
                      <div className="text-stone-500 text-xs mb-1">Nearest Hospital</div>
                      <div className="text-stone-800 font-medium">{info.hospital.name}</div>
                      <div className="text-stone-500 text-sm mt-1">{info.hospital.address}</div>
                    </div>
                  )}
                </div>

                {/* Useful Phrases */}
                {info.phrases.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider">
                      Show to driver
                    </h3>

                    <div className="space-y-2">
                      {info.phrases.map((phrase, i) => (
                        <div key={i} className="bg-stone-50 rounded-xl p-4">
                          <div className="text-stone-500 text-xs mb-2">{phrase.context}</div>
                          <div className="text-stone-800 text-lg font-medium mb-1">
                            {phrase.local}
                          </div>
                          <div className="text-stone-500 text-sm">{phrase.english}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 text-stone-500 text-sm font-medium
                             hover:text-stone-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(HelpButton);
