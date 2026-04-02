'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFromIndexedDB, saveToIndexedDB, isDataFresh } from './useIndexedDB';

export interface ScheduledAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  aired?: { string: string };
  broadcasting?: { string: string };
  day_of_week?: string;
  time?: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AnimeSchedule {
  monday: ScheduledAnime[];
  tuesday: ScheduledAnime[];
  wednesday: ScheduledAnime[];
  thursday: ScheduledAnime[];
  friday: ScheduledAnime[];
  saturday: ScheduledAnime[];
  sunday: ScheduledAnime[];
}

interface UseAnimeScheduleResult {
  schedule: AnimeSchedule | null;
  source: 'indexeddb' | 'supabase' | 'none';
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface SupabaseScheduleRow {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  aired?: { string: string };
  broadcasting?: { string: string };
  day_of_week?: string;
  time?: string;
}

function mapSupabaseToScheduledAnime(row: SupabaseScheduleRow): ScheduledAnime {
  return {
    mal_id: row.mal_id,
    title: row.title,
    title_english: row.title_english,
    images: row.images,
    aired: row.aired,
    broadcasting: row.broadcasting,
    day_of_week: row.day_of_week,
    time: row.time,
  };
}

function groupByDay(animes: ScheduledAnime[]): AnimeSchedule {
  const schedule: AnimeSchedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  const dayMap: Record<string, DayOfWeek> = {
    monday: 'monday',
    tuesday: 'tuesday',
    wednesday: 'wednesday',
    thursday: 'thursday',
    friday: 'friday',
    saturday: 'saturday',
    sunday: 'sunday',
  };

  for (const anime of animes) {
    const day = anime.day_of_week?.toLowerCase() as string;
    if (day && dayMap[day]) {
      schedule[dayMap[day]].push(anime);
    }
  }

  return schedule;
}

export function useAnimeSchedule(): UseAnimeScheduleResult {
  const [schedule, setSchedule] = useState<AnimeSchedule | null>(null);
  const [source, setSource] = useState<'indexeddb' | 'supabase' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromSupabase = async (): Promise<ScheduledAnime[] | null> => {
    const { supabase } = await import('@/lib/supabase-client');
    
    const { data: supabaseData, error: supabaseError } = await supabase
      .from('anime_schedule')
      .select('*')
      .not('day_of_week', 'is', null)
      .order('time', { ascending: true });

    if (supabaseError) {
      throw supabaseError;
    }

    if (!supabaseData || supabaseData.length === 0) {
      return null;
    }

    return supabaseData.map(mapSupabaseToScheduledAnime);
  };

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cachedResult = await getFromIndexedDB<ScheduledAnime[]>('anime_schedule');

      if (cachedResult && cachedResult.data && isDataFresh(cachedResult.timestamp)) {
        const grouped = groupByDay(cachedResult.data);
        setSchedule(grouped);
        setSource('indexeddb');
        setIsLoading(false);
        return;
      }

      const supabaseData = await fetchFromSupabase();

      if (supabaseData) {
        await saveToIndexedDB('anime_schedule', supabaseData);
        const grouped = groupByDay(supabaseData);
        setSchedule(grouped);
        setSource('supabase');
      } else {
        setSchedule(null);
        setSource('none');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anime schedule';
      setError(errorMessage);
      
      const cachedResult = await getFromIndexedDB<ScheduledAnime[]>('anime_schedule');
      if (cachedResult && cachedResult.data) {
        const grouped = groupByDay(cachedResult.data);
        setSchedule(grouped);
        setSource('indexeddb');
      } else {
        setSchedule(null);
        setSource('none');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { schedule, source, isLoading, error, refetch };
}
