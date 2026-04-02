'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFromIndexedDB, saveToIndexedDB, isDataFresh } from './useIndexedDB';
import type { AnimeData } from '@/components/AnimeCatalog/types';

export type { AnimeData };

export interface UseAnimeDataResult {
  data: AnimeData[] | null;
  source: 'indexeddb' | 'supabase' | 'none';
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface SupabaseAnimeRow {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  synopsis?: string;
  type?: string;
  episodes?: number;
  score?: number;
  status?: string;
  genres?: Array<{ mal_id: number; name: string }>;
  rating?: string;
  updated_at?: string;
}

function mapSupabaseToAnime(row: SupabaseAnimeRow): AnimeData {
  return {
    mal_id: row.mal_id,
    title: row.title,
    title_english: row.title_english,
    images: row.images,
    synopsis: row.synopsis,
    type: row.type,
    episodes: row.episodes,
    score: row.score,
    status: row.status,
    genres: row.genres,
    rating: row.rating,
  };
}

export function useAnimeData(): UseAnimeDataResult {
  const [data, setData] = useState<AnimeData[] | null>(null);
  const [source, setSource] = useState<'indexeddb' | 'supabase' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromSupabase = async (): Promise<AnimeData[] | null> => {
    const { supabase } = await import('@/lib/supabase-client');
    
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('anime_catalog')
      .select('*')
      .order('score', { ascending: false });

    if (supabaseError) {
      throw supabaseError;
    }

    if (!supabaseData || supabaseData.length === 0) {
      return null;
    }

    return supabaseData.map(mapSupabaseToAnime);
  };

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cachedResult = await getFromIndexedDB<AnimeData[]>('anime_catalog');

      if (cachedResult && cachedResult.data && isDataFresh(cachedResult.timestamp)) {
        setData(cachedResult.data);
        setSource('indexeddb');
        setIsLoading(false);
        return;
      }

      const supabaseData = await fetchFromSupabase();

      if (supabaseData) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const timestamp = supabaseData.length > 0 ? Date.now() : oneHourAgo;
        
        await saveToIndexedDB('anime_catalog', supabaseData);
        setData(supabaseData);
        setSource('supabase');
      } else {
        setData(null);
        setSource('none');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anime data';
      setError(errorMessage);
      
      const cachedResult = await getFromIndexedDB<AnimeData[]>('anime_catalog');
      if (cachedResult && cachedResult.data) {
        setData(cachedResult.data);
        setSource('indexeddb');
      } else {
        setData(null);
        setSource('none');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, source, isLoading, error, refetch };
}
