'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';

// ============================================
// Types / Interfaces
// ============================================

export type WatchStatus = 'watching' | 'completed' | 'paused';

export interface WatchProgress {
  id: string;
  user_id: string;
  episode_id: number;
  anime_id: number;
  episode_number: number;
  timestamp_seconds: number;
  duration_seconds: number;
  status: WatchStatus;
  is_binge_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface BingeSettings {
  timer_seconds: number;
  auto_play: boolean;
  auto_advance: boolean;
}

export interface UseWatchProgressResult {
  // Data
  progress: WatchProgress[];
  bingeSettings: BingeSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  saveProgress: (data: Omit<WatchProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  getProgressForAnime: (animeId: number) => WatchProgress[];
  getLatestProgress: () => WatchProgress | null;
  updateBingeSettings: (settings: Partial<BingeSettings>) => Promise<void>;
  
  // Binge mode helpers
  getNextEpisode: (animeId: number, currentEpisode: number) => WatchProgress | null;
  markAsCompleted: (episodeId: number, animeId: number, episodeNumber: number) => Promise<void>;
  pauseBinge: (episodeId: number, animeId: number, episodeNumber: number, timestamp: number, duration: number) => Promise<void>;
}

// ============================================
// API Functions
// ============================================

async function fetchProgress(animeId?: number, limit = 10): Promise<{ progress: WatchProgress[]; binge_settings: BingeSettings }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  let url = '/api/progress?limit=' + limit;
  if (animeId) {
    url += '&anime_id=' + animeId;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar progresso');
  }

  return response.json();
}

async function saveProgressApi(data: Omit<WatchProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<WatchProgress> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch('/api/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao salvar progresso');
  }

  const result = await response.json();
  return result.progress;
}

async function updateBingeSettingsApi(settings: Partial<BingeSettings>): Promise<BingeSettings> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch('/api/progress', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao salvar configurações');
  }

  const result = await response.json();
  return result.settings;
}

// ============================================
// Hook Principal
// ============================================

export function useWatchProgress(): UseWatchProgressResult {
  const [progress, setProgress] = useState<WatchProgress[]>([]);
  const [bingeSettings, setBingeSettings] = useState<BingeSettings>({
    timer_seconds: 10,
    auto_play: true,
    auto_advance: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetchProgress();
      
      if (isMounted.current) {
        setProgress(result.progress || []);
        setBingeSettings(result.binge_settings);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar progresso');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Carregar dados ao iniciar
  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Salvar progresso
  const saveProgress = useCallback(async (data: Omit<WatchProgress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const saved = await saveProgressApi(data);
      
      setProgress(prev => {
        const existing = prev.findIndex(p => p.episode_id === data.episode_id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = saved;
          return updated;
        }
        return [saved, ...prev];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar progresso');
      throw err;
    }
  }, []);

  // Buscar progresso por anime
  const getProgressForAnime = useCallback((animeId: number): WatchProgress[] => {
    return progress.filter(p => p.anime_id === animeId);
  }, [progress]);

  // Buscar último progresso
  const getLatestProgress = useCallback((): WatchProgress | null => {
    if (progress.length === 0) return null;
    return progress[0];
  }, [progress]);

  // Atualizar configurações de binge
  const updateBingeSettings = useCallback(async (settings: Partial<BingeSettings>) => {
    try {
      const updated = await updateBingeSettingsApi(settings);
      setBingeSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
      throw err;
    }
  }, []);

  // Obter próximo episódio
  const getNextEpisode = useCallback((animeId: number, currentEpisode: number): WatchProgress | null => {
    const animeProgress = progress
      .filter(p => p.anime_id === animeId)
      .sort((a, b) => a.episode_number - b.episode_number);
    
    const nextEp = animeProgress.find(p => p.episode_number === currentEpisode + 1);
    return nextEp || null;
  }, [progress]);

  // Marcar como completo
  const markAsCompleted = useCallback(async (episodeId: number, animeId: number, episodeNumber: number) => {
    await saveProgress({
      episode_id: episodeId,
      anime_id: animeId,
      episode_number: episodeNumber,
      timestamp_seconds: 0,
      duration_seconds: 0,
      status: 'completed',
      is_binge_mode: false,
    });
  }, [saveProgress]);

  // Pausar modo binge
  const pauseBinge = useCallback(async (
    episodeId: number,
    animeId: number,
    episodeNumber: number,
    timestamp: number,
    duration: number
  ) => {
    await saveProgress({
      episode_id: episodeId,
      anime_id: animeId,
      episode_number: episodeNumber,
      timestamp_seconds: timestamp,
      duration_seconds: duration,
      status: 'paused',
      is_binge_mode: false,
    });
  }, [saveProgress]);

  return {
    progress,
    bingeSettings,
    isLoading,
    error,
    saveProgress,
    getProgressForAnime,
    getLatestProgress,
    updateBingeSettings,
    getNextEpisode,
    markAsCompleted,
    pauseBinge,
  };
}
