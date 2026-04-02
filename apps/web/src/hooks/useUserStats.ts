'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserStats {
  total_animes_watched: number;
  total_episodes_watched: number;
  total_minutes_watched: number;
  current_streak: number;
  longest_streak: number;
  last_watch_date: string | null;
  favorite_genres: string[];
  genre_distribution: Record<string, number>;
}

export interface WatchHistory {
  id: string;
  user_id: string;
  date: string;
  episodes_watched: number;
  minutes_watched: number;
  animes_watched: string[];
}

export interface CommunityStats {
  total_users: number;
  avg_episodes_watched: number;
  avg_streak: number;
  top_genres: Array<{ genre: string; count: number }>;
}

export interface StatsResponse {
  stats: UserStats;
  history: WatchHistory[];
  community: CommunityStats;
  summary: {
    favoritesCount: number;
    watchlistCount: number;
    uniqueAnimesWatched: number;
  };
}

interface UseUserStatsResult {
  stats: UserStats | null;
  history: WatchHistory[];
  community: CommunityStats | null;
  summary: {
    favoritesCount: number;
    watchlistCount: number;
    uniqueAnimesWatched: number;
  };
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStats: () => Promise<void>;
}

const MOCK_STATS: UserStats = {
  total_animes_watched: 0,
  total_episodes_watched: 0,
  total_minutes_watched: 0,
  current_streak: 0,
  longest_streak: 0,
  last_watch_date: null,
  favorite_genres: [],
  genre_distribution: {},
};

const MOCK_COMMUNITY: CommunityStats = {
  total_users: 0,
  avg_episodes_watched: 0,
  avg_streak: 0,
  top_genres: [],
};

export function useUserStats(): UseUserStatsResult {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [community, setCommunity] = useState<CommunityStats | null>(null);
  const [summary, setSummary] = useState({
    favoritesCount: 0,
    watchlistCount: 0,
    uniqueAnimesWatched: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/stats');

      if (!response.ok) {
        if (response.status === 401) {
          setStats(MOCK_STATS);
          setCommunity(MOCK_COMMUNITY);
          setHistory([]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch stats');
      }

      const data: StatsResponse = await response.json();

      setStats(data.stats);
      setHistory(data.history);
      setCommunity(data.community);
      setSummary(data.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      // Keep existing data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const updateStats = useCallback(async () => {
    try {
      const response = await fetch('/api/user/stats', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Failed to update stats');
      }

      const data = await response.json();

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    history,
    community,
    summary,
    isLoading,
    error,
    refresh,
    updateStats,
  };
}
