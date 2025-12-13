/**
 * KarmaNotification Component
 * Shows floating notification when karma is awarded
 */

import { useEffect, useState } from 'react';

interface KarmaNotificationProps {
  amount: number;
  reason: string;
  onClose: () => void;
}

export default function KarmaNotification({ amount, reason, onClose }: KarmaNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 border border-green-500 bg-black p-4 animate-bounce font-mono">
      <div className="text-green-500 text-lg font-bold">
        KARMA +{amount}
      </div>
      <div className="text-green-400 text-sm">
        {reason}
      </div>
    </div>
  );
}
