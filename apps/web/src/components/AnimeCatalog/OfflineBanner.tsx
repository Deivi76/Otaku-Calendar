'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineBannerProps {
  isVisible: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function OfflineBanner({ isVisible, onRefresh, isLoading }: OfflineBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      onRefresh();
    } else {
      try {
        await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Failed to refresh:', error);
      }
    }
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-30 bg-yellow-500/10 border-b border-yellow-500 backdrop-blur-sm"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-yellow-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
              <div>
                <p className="text-sm text-yellow-500 font-medium">
                  Modo offline - Os dados podem estar desatualizados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
