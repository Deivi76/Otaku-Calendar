'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch, type SearchItem } from '@/hooks/useSearch';
import type { AnimeData } from '@/components/AnimeCatalog/types';

interface CommandMenuProps {
  animeData: AnimeData[] | null;
}

export function CommandMenu({ animeData }: CommandMenuProps) {
  const router = useRouter();
  const { query, setQuery, results, isOpen, setIsOpen } = useSearch(animeData);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);
      if (item.type === 'anime') {
        router.push(`/anime/${item.id}`);
      }
    },
    [router, setIsOpen]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2"
          >
            <Command
              className="command-menu"
              shouldFilter={false}
            >
              <div className="command-search-wrapper">
                <svg
                  className="command-search-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Buscar anime..."
                  className="command-input"
                  autoFocus
                />
                <div className="command-shortcut">
                  <kbd>ESC</kbd>
                </div>
              </div>

              <Command.List className="command-list">
                {results.length === 0 && query && (
                  <Command.Empty className="command-empty">
                    Nenhum resultado encontrado
                  </Command.Empty>
                )}

                {!query && results.length > 0 && (
                  <Command.Group heading="Sugestões" className="command-group">
                    {results.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.title}
                        onSelect={() => handleSelect(item)}
                        className="command-item"
                      >
                        {item.image && (
                          <div className="command-item-image">
                            <img src={item.image} alt={item.title} />
                          </div>
                        )}
                        <div className="command-item-content">
                          <span className="command-item-title">{item.title}</span>
                          {item.titleEnglish && (
                            <span className="command-item-english">{item.titleEnglish}</span>
                          )}
                        </div>
                        <div className="command-item-meta">
                          {item.score && (
                            <span className="command-item-score">★ {item.score.toFixed(1)}</span>
                          )}
                          <span className="command-item-type">{item.type === 'anime' ? 'Anime' : 'Rumor'}</span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {query && (
                  <Command.Group heading="Resultados" className="command-group">
                    {results.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.title}
                        onSelect={() => handleSelect(item)}
                        className="command-item"
                      >
                        {item.image && (
                          <div className="command-item-image">
                            <img src={item.image} alt={item.title} />
                          </div>
                        )}
                        <div className="command-item-content">
                          <span className="command-item-title">{item.title}</span>
                          {item.titleEnglish && (
                            <span className="command-item-english">{item.titleEnglish}</span>
                          )}
                        </div>
                        <div className="command-item-meta">
                          {item.score && (
                            <span className="command-item-score">★ {item.score.toFixed(1)}</span>
                          )}
                          <span className="command-item-type">{item.type === 'anime' ? 'Anime' : 'Rumor'}</span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="command-footer">
                <div className="command-footer-item">
                  <kbd>↑↓</kbd>
                  <span>Navegar</span>
                </div>
                <div className="command-footer-item">
                  <kbd>↵</kbd>
                  <span>Selecionar</span>
                </div>
                <div className="command-footer-item">
                  <kbd>ESC</kbd>
                  <span>Fechar</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
