import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import BootSequence from '@/components/ux/BootSequence';

// Dynamically import OpsProvider with no SSR to avoid build issues
const OpsProvider = dynamic(() => import('@/contexts/OpsContext').then((mod) => mod.OpsProvider), {
  ssr: false,
});

export default function App({ Component, pageProps, router }: AppProps) {
  const [isClient, setIsClient] = useState(false);

  // Check if error page
  const isErrorPage =
    router.pathname === '/404' || router.pathname === '/500' || router.pathname === '/_error';

  useEffect(() => {
    setIsClient(true);

    // Register service worker for PWA (skip for error pages)
    if (!isErrorPage && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, [isErrorPage]);

  // Skip OpsProvider for error pages or during SSR
  if (isErrorPage || !isClient) {
    return <Component {...pageProps} />;
  }

  return (
    <OpsProvider>
      <BootSequence />
      <Component {...pageProps} />
    </OpsProvider>
  );
}
