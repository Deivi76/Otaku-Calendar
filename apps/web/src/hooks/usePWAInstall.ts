import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isRunningStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<void>;
  dismiss: () => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunningStandalone, setIsRunningStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone mode (installed PWA)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    
    setIsRunningStandalone(isStandalone);
    setIsInstalled(isStandalone);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      console.log('PWA installed successfully');
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isRunningStandalone,
    deferredPrompt,
    install,
    dismiss,
  };
}
