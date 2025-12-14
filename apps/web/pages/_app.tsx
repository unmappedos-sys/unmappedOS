import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { OpsProvider } from '@/contexts/OpsContext';
import '@/styles/globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function App({ Component, pageProps, router }: AppProps) {
  // Check if error page
  const isErrorPage =
    router.pathname === '/404' || router.pathname === '/500' || router.pathname === '/_error';

  useEffect(() => {
    // Register service worker for PWA (skip for error pages)
    if (!isErrorPage && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, [isErrorPage]);

  // Skip OpsProvider for error pages
  if (isErrorPage) {
    return <Component {...pageProps} />;
  }

  return (
    <OpsProvider>
      <Component {...pageProps} />
    </OpsProvider>
  );
}
