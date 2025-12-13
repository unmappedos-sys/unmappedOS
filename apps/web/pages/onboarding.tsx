import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const BOOT_SEQUENCE = [
  'INITIALIZING UNMAPPED OS...',
  'LOADING CITY PACK MODULES...',
  'CALIBRATING ANCHOR ALGORITHMS...',
  'ESTABLISHING FIELD NETWORK CONNECTION...',
  'REQUESTING GEOLOCATION PERMISSIONS...',
  'ENABLING SNAPSHOT GPS MODULE...',
  'PREPARING TACTICAL DISPLAY...',
  'SYSTEM READY. OPERATIVE STATUS: ACTIVE',
];

export default function Onboarding() {
  const router = useRouter();
  const [bootIndex, setBootIndex] = useState(0);
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false,
  });

  useEffect(() => {
    if (bootIndex < BOOT_SEQUENCE.length) {
      const timer = setTimeout(() => {
        setBootIndex(bootIndex + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setShowPermissions(true), 500);
    }
  }, [bootIndex]);

  const requestLocationPermission = async () => {
    if ('geolocation' in navigator) {
      try {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        setPermissions((prev) => ({ ...prev, location: true }));
      } catch (error) {
        console.error('Location permission denied:', error);
        alert('Location access required for zone detection. You can enable it later in settings.');
        setPermissions((prev) => ({ ...prev, location: true })); // Allow skip
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissions((prev) => ({ ...prev, notifications: permission === 'granted' }));
      } catch (error) {
        console.error('Notification permission denied:', error);
        setPermissions((prev) => ({ ...prev, notifications: true })); // Allow skip
      }
    }
  };

  const handleContinue = () => {
    if (permissions.location) {
      router.push('/city/bangkok');
    }
  };

  return (
    <>
      <Head>
        <title>Boot Sequence - Unmapped OS</title>
      </Head>

      <main className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="max-w-2xl w-full space-y-8">
          {!showPermissions ? (
            <div className="terminal-text space-y-2">
              {BOOT_SEQUENCE.slice(0, bootIndex).map((line, index) => (
                <p
                  key={index}
                  className={index === bootIndex - 1 ? 'animate-terminal-blink' : ''}
                >
                  &gt; {line}
                </p>
              ))}
              <p className="animate-terminal-blink">&gt; _</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="mission-heading text-center">PERMISSION GRANTS REQUIRED</h2>

              <div className="space-y-4">
                {/* Location Permission */}
                <div className="ops-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-mono font-bold uppercase text-sm">
                        Calibrate Field Position
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Snapshot GPS for zone detection (no history stored)
                      </p>
                    </div>
                    {permissions.location ? (
                      <span className="terminal-text">✓ GRANTED</span>
                    ) : (
                      <button onClick={requestLocationPermission} className="ops-button text-xs">
                        ENABLE
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification Permission */}
                <div className="ops-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-mono font-bold uppercase text-sm">
                        Field Notifications
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Check-in reminders and hazard alerts
                      </p>
                    </div>
                    {permissions.notifications ? (
                      <span className="terminal-text">✓ GRANTED</span>
                    ) : (
                      <button
                        onClick={requestNotificationPermission}
                        className="ops-button text-xs"
                      >
                        ENABLE
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleContinue}
                  disabled={!permissions.location}
                  className="ops-button px-8 py-3"
                >
                  CONTINUE TO MISSION DOSSIER
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-600 mt-2">
                  Location permission required. Notifications optional.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return { props: {} };
}

