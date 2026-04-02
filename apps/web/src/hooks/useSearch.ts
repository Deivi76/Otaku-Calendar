'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { AnimeData } from '@/components/AnimeCatalog/types';

export interface SearchItem {
  id: string;
  title: string;
  titleEnglish?: string;
  type: 'anime' | 'rumor';
  image?: string;
  score?: number;
  status?: string;
}

interface UseSearchOptions {
  threshold?: number;
  keys?: string[];
  includeScore?: boolean;
}

interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: SearchItem[];
  isSearching: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
}

const defaultFuseOptions: IFuseOptions<SearchItem> = {
  threshold: 0.3,
  keys: ['title', 'titleEnglish'],
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

export function useSearch(
  animeData: AnimeData[] | null,
  options: UseSearchOptions = {}
): UseSearchResult {
  const { threshold = 0.3, keys = ['title', 'titleEnglish'], includeScore = true } = options;

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const searchItems = useMemo<SearchItem[]>(() => {
    if (!animeData) return [];

    return animeData.map((anime) => ({
      id: anime.mal_id.toString(),
      title: anime.title,
      titleEnglish: anime.title_english,
      type: 'anime' as const,
      image: anime.images?.jpg?.image_url || anime.images?.webp?.image_url,
      score: anime.score,
      status: anime.status,
    }));
  }, [animeData]);

  const fuse = useMemo(() => {
    if (searchItems.length === 0) return null;

    return new Fuse(searchItems, {
      ...defaultFuseOptions,
      threshold,
      keys,
      includeScore,
    });
  }, [searchItems, threshold, keys, includeScore]);

  const results = useMemo(() => {
    if (!fuse || !query.trim()) {
      return searchItems.slice(0, 10);
    }

    const searchResults = fuse.search(query);
    return searchResults.slice(0, 10).map((result) => result.item);
  }, [fuse, query, searchItems]);

  const isSearching = query.length > 0 && results.length > 0;

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    isOpen,
    setIsOpen,
    toggle,
  };
}
