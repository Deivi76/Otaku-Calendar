import { useEffect, useState } from 'react';

interface UseServiceWorkerReturn {
  isReady: boolean;
  isOnline: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  refresh: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
        setIsReady(true);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refresh = () => {
    window.location.reload();
  };

  return {
    isReady,
    isOnline,
    isOffline: !isOnline,
    updateAvailable,
    refresh,
  };
}
