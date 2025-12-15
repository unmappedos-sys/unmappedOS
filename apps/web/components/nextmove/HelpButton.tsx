/**
 * HELP BUTTON — Safety and Emergency
 *
 * Persistent. Always accessible.
 * Shows:
 * - Hospital
 * - Police
 * - Show-to-driver text
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HelpInfo } from './types';

interface HelpButtonProps {
  info: HelpInfo;
}

export default function HelpButton({ info }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 w-12 h-12 bg-red-500 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Help"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* Help Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-xl"
            >
              <div className="p-6 pb-safe">
                {/* Handle */}
                <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-6" />

                {/* Title */}
                <h2 className="text-xl font-semibold text-stone-900 mb-6 text-center">
                  Need Help?
                </h2>

                {/* Emergency Numbers */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <a
                    href={`tel:${info.police}`}
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-2xl active:bg-blue-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                    <span className="text-blue-700 font-semibold">Police</span>
                    <span className="text-blue-600 text-sm">{info.police}</span>
                  </a>

                  <a
                    href={`tel:${info.ambulance}`}
                    className="flex flex-col items-center p-4 bg-red-50 rounded-2xl active:bg-red-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-2">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-red-700 font-semibold">Ambulance</span>
                    <span className="text-red-600 text-sm">{info.ambulance}</span>
                  </a>
                </div>

                {/* Hospital */}
                {info.hospital && (
                  <button
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${info.hospital!.lat},${info.hospital!.lon}`,
                        '_blank'
                      );
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl mb-6 active:bg-stone-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-stone-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-stone-800 font-medium">Nearest Hospital</p>
                      <p className="text-stone-500 text-sm">{info.hospital.name}</p>
                    </div>
                    <svg
                      className="w-5 h-5 text-stone-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}

                {/* Taxi Phrase */}
                {info.taxiPhrase && (
                  <div className="bg-amber-50 rounded-2xl p-4 mb-6">
                    <p className="text-amber-800 text-sm font-medium mb-2">Show to driver:</p>
                    <p className="text-amber-900 text-xl font-semibold">{info.taxiPhrase}</p>
                  </div>
                )}

                {/* Emergency Phrase */}
                {info.emergencyPhrase && (
                  <div className="bg-red-50 rounded-2xl p-4 mb-6">
                    <p className="text-red-800 text-sm font-medium mb-2">Emergency phrase:</p>
                    <p className="text-red-900 text-xl font-semibold">{info.emergencyPhrase}</p>
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="w-full py-4 bg-stone-100 text-stone-700 rounded-2xl font-medium active:scale-[0.98] transition-transform"
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
