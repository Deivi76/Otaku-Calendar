'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  setHasMore: (hasMore: boolean) => void;
  observerRef: (node: HTMLElement | null) => void;
  sentinelRef: HTMLDivElement | null;
}

export function useInfiniteScroll<T>(
  fetchMore: (page: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult<T> {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    
    try {
      const newItems = await fetchMore(page);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [fetchMore, page, hasMore]);

  const setObserverNode = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(node);
  }, [loadMore, hasMore, threshold, rootMargin]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    setItems,
    setHasMore,
    observerRef: setObserverNode,
    sentinelRef: sentinelRef.current,
  };
}
