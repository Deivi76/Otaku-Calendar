'use client';

import { motion } from 'framer-motion';

interface EmptyStateProps {
  title?: string;
  message?: string;
  onExploreCategories?: () => void;
}

export function EmptyState({ 
  title = 'Nenhum anime encontrado nesta categoria',
  message,
  onExploreCategories 
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
        <svg
          className="w-10 h-10 text-[var(--text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
          {message}
        </p>
      )}
      {!message && (
        <p className="text-[var(--text-secondary)] text-center max-w-md mb-6">
          Que tal explorar outras categorias ou verificar novamente mais tarde?
        </p>
      )}
      {onExploreCategories ? (
        <button
          onClick={onExploreCategories}
          className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-colors"
        >
          Ver outras categorias
        </button>
      ) : (
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </motion.div>
  );
}
